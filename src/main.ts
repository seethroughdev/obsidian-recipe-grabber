/**
 * This is the main file for the recipe-grabber plugin. The summary is:
 * - fetch a recipe from a url
 * - if the recipe is valid, try and normalize it into a simple templatable format
 * - render the recipe into a markdown template
 * - add the recipe to the markdown editor
 */

import {
	MarkdownView,
	Plugin,
	Notice,
	requestUrl,
	normalizePath,
	TFolder,
	Menu,
	MenuItem
} from "obsidian";
import * as handlebars from "handlebars";
import type { Recipe } from "schema-dts";
import * as cheerio from "cheerio";
import * as c from "./constants";
import * as settings from "./settings";
import { LoadRecipeModal } from "./modal-load-recipe";
import { extractMicrodata, parseJsonSchema } from "./schema-parser"
import { parseDom } from "./dom-parser"

export default class RecipeGrabber extends Plugin {
	settings: settings.PluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon(
			"chef-hat",
			this.manifest.name,
			(evt: MouseEvent) => {
				const view =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				const selection = view?.editor.getSelection()?.trim();
				// try and make sure its a url
				if (
					selection?.startsWith("http") &&
					selection.split(" ").length === 1
				) {
					this.addRecipeToMarkdown(selection);
				} else {
					new LoadRecipeModal(
						this.app,
						this.addRecipeToMarkdown
					).open();
				}
			}
		);

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: c.CMD_OPEN_MODAL,
			name: "Grab Recipe",
			callback: () => {
				new LoadRecipeModal(this.app, this.addRecipeToMarkdown).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new settings.SettingsTab(this.app, this));

		if (this.settings.extendShareMenu) {
			this.registerEvent(
				//@ts-ignore
				this.app.workspace.on('receive-text-menu', (menu: Menu, shareText: string) => {
					menu.addItem((item: MenuItem) => {
						item.setTitle('Recipe Grabber - Save Recipe');
						item.setIcon('chef-hat');
						item.onClick(() => this.fetchRecipes(shareText));
					});
				}),
			);
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			settings.DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * The main function to go get the recipe, and format it for the template
	 */
	async fetchRecipes(_url: string): Promise<Recipe[]> {

		const url = new URL(_url);

		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return Promise.reject("Not a valid url");
		}

		new Notice(`Fetching: ${url.href}`);
		let response;

		try {
			response = await requestUrl({
				url: url.href,
				method: "GET",
				headers: {
					"Content-Type": "text/html",
				},
			});
		} catch (err) {
			return Promise.reject("Not a valid url");
		}

		const $ = cheerio.load(response.text);

		/**
		 * Some details are in varying formats, for templating to be easier,
		 * lets attempt to normalize them
		 */
		const normalizeSchema = (json: Recipe): Recipe => {
			json = this.normalizeImages(json);

			if (typeof json.recipeIngredient === "string") {
				json.recipeIngredient = [json.recipeIngredient];
			}

			// if the user unsafely decides to not escape html, lets unescape it
			if (this.settings.unescapeHtml) {
				json = this.unescapeHtml(json);
			}

			return json
		}
		
		// 1. Parse the dom of the page and look for any schema.org/Recipe - these will generally be faster and easier to find/parse
		const recipeJsonElements = $('script[type="application/ld+json"]')
		const jsonRecipes = parseJsonSchema($, recipeJsonElements, url.href)
		console.log("fetchRecipes: Before returning jsonRecipes", jsonRecipes);
		if(jsonRecipes.length) {
			console.log(jsonRecipes.map(schema => normalizeSchema(schema)))
			return jsonRecipes.map(schema => normalizeSchema(schema))
		}

		// 2. Parse the dom for html microdata - https://html.spec.whatwg.org/multipage/microdata.html#microdata
		const microData = extractMicrodata($, url.href)
		if(microData.length) {
			console.log(microData)
			return microData.map(schema => normalizeSchema(schema))
		}

		// 3. Lastly, scrape the dom scoring HTML elements until there is enough data to save a recipe
		const domRecipes = parseDom($, url.href)
		if(domRecipes.length) {
			console.log(domRecipes)
			return domRecipes.map(schema => normalizeSchema(schema))
		}

		return [];
	}

	/**
	 * This function handles all the templating of the recipes
	 */
	private addRecipeToMarkdown = async (url: string): Promise<void> => {
		const markdown = handlebars.compile(this.settings.recipeTemplate);
		try {
			const recipes = await this.fetchRecipes(url);

			console.log(recipes)
			let view = this.settings.saveInActiveFile
				? this.app.workspace.getActiveViewOfType(MarkdownView)
				: null;

			// if there isn't a view due to settings or no current file open, lets create a file according to folder settings and open it
			if (!view) {
				if (this.settings.folder != "") {
					await this.folderCheck(); // this checks if folder exists and creates it if it doesn't.
				}
				const vault = this.app.vault;
				// try and get recipe title
				const filename =
					recipes?.length > 0 && recipes?.[0]?.name
						? recipes[0].name
						: new Date().getTime(); // Generate a unique timestamp

				const path =
					this.settings.folder == ""
						? `${normalizePath(this.settings.folder)}${filename}.md`
						: `${normalizePath(
								this.settings.folder
							)}/${filename}.md`; // File path with timestamp and .md extension
				// Create a new untitled file with empty content
				await vault.create(path, "");

				// Open the newly created file
				await this.app.workspace.openLinkText(path, "", true);
				view = this.app.workspace.getActiveViewOfType(MarkdownView);
			}

			if (!view) {
				new Notice("Could not open a markdown view");
				return;
			}

			// in debug, clear editor first
			if (this.settings.debug) {
				view.editor.setValue("");
			}

			// too often, the recipe isn't there or malformed, lets let the user know.
			if (recipes?.length === 0) {
				new Notice(
					"A validated recipe scheme was not found on this page, sorry!\n\nIf you think this is an error, please open an issue on github."
				);
				return;
			}

			// pages can have multiple recipes, lets add them all
			recipes.forEach((recipe) => {
				if (this.settings.debug) {
					console.log(recipe);
					console.log(markdown(recipe));
				}

				// notice instead of just passing the recipe into markdown, we are
				// adding a key called 'json'. This is so we can see the raw json in the
				// template if a user wants it.
				view?.editor.replaceSelection(
					markdown({
						...recipe,
						json: JSON.stringify(recipe, null, 2),
					})
				);
			});
		} catch (error) {
			return;
		}
	};

	/**
	 * This function checks for an existing folder (creates if it doesn't exist)
	 */
	private async folderCheck() {
		const vault = app.vault;
		const folderPath = normalizePath(this.settings.folder);
		const folder = vault.getAbstractFileByPath(folderPath);
		if (folder && folder instanceof TFolder) {
			return;
		}
		await vault.createFolder(folderPath);
		return;
	}

	/**
	 * In order to make templating easier. Lets normalize the types of recipe images
	 * to a single string url
	 */
	private normalizeImages(recipe: Recipe): Recipe {
		console.log(recipe)
		if (typeof recipe.image === "string") {
			return recipe;
		}

		if (Array.isArray(recipe.image)) {
			const image = recipe.image?.[0];
			if (typeof image === "string") {
				recipe.image = image;
				return recipe;
			}
			if (image?.url) {
				recipe.image = image.url;
				return recipe;
			}
		}

		/**
		 * Although the spec does not show ImageObject as a top level option, it is used in some big sites.
		 */
		if ((recipe as any).image?.url) {
			recipe.image = (recipe as any)?.image?.url || "";
		}

		return recipe;
	}

	/**
	 * This function will go through the data object and attempt to convert all strings into unescaped strings
	 * This is not the safest thing to do, and has to be opted in the settings. But it was requested by
	 * several users.
	 */
	private unescapeHtml(recipe: Recipe): Recipe {
		const unescape = (str: string) => {
			const $ = cheerio.load(str);
			return $.text();
		};

		// this awfully ugly function will traverse the object and unescape all strings, and pass
		// anything else back in to check again
		const traverse = (obj: any) => {
			Object.keys(obj).forEach((key) => {
				if (typeof obj[key] === "string") {
					obj[key] = unescape(obj[key]);
				} else if (Array.isArray(obj[key])) {
					obj[key].forEach((item: unknown) => {
						if (typeof item === "string") {
							item = unescape(item);
						} else if (typeof item === "object") {
							traverse(item);
						}
					});
				} else if (typeof obj[key] === "object") {
					traverse(obj[key]);
				}
			});
		};

		traverse(recipe);

		return recipe;
	}
}
