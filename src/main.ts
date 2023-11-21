/**
 * This is the main file for the recipe-grabber plugin. The summary is:
 * - fetch a recipe from a url
 * - if the recipe is valid, try and normalize it into a simple templatable format
 * - render the recipe into a markdown template
 * - add the recipe to the markdown editor
 */

import { MarkdownView, Plugin, Notice, requestUrl } from "obsidian";
import * as handlebars from "handlebars";
import type { Recipe } from "schema-dts";
import * as cheerio from "cheerio";
import * as c from "./constants";
import * as settings from "./settings";
import { LoadRecipeModal } from "./modal-load-recipe";

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
			editorCallback: () => {
				new LoadRecipeModal(this.app, this.addRecipeToMarkdown).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new settings.SettingsTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			settings.DEFAULT_SETTINGS,
			await this.loadData()
		);

		// this.getRecipes(
		// 	"https://cooking.nytimes.com/recipes/1016919-grilled-or-oven-roasted-santa-maria-tri-tip"
		// );
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
		 * the main recipes list, we'll use to render from
		 * its an array instead because a page can technically have multiple recipes on it
		 */
		const recipes: Recipe[] = [];

		/**
		 * Some details are in varying formats, for templating to be easier,
		 * lets attempt to normalize them
		 */
		const normalizeSchema = (json: Recipe): void => {
			json.url = url.href;
			json = this.normalizeImages(json);

			if (typeof json.recipeIngredient === "string") {
				json.recipeIngredient = [json.recipeIngredient];
			}

			recipes.push(json);
		};

		/**
		 * Unfortunately, some schemas are arrays, some not. Some in @graph, some not.
		 * Here we attempt to move all kinds into a single array of RecipeLeafs
		 */
		function handleSchemas(schemas: any[]): void {
			schemas.forEach((schema) => {
				if ("@graph" in schema && Array.isArray(schema?.["@graph"])) {
					return handleSchemas(schema["@graph"]);
				} else {
					const _type = schema?.["@type"];

					if (
						Array.isArray(_type)
							? _type.includes("Recipe")
							: schema?.["@type"] === "Recipe"
					) {
						normalizeSchema(schema);
					}
				}
			});
		}

		// parse the dom of the page and look for any schema.org/Recipe
		$('script[type="application/ld+json"]').each((i, el) => {
			const content = $(el).text()?.trim();
			const json = JSON.parse(content);

			// to make things consistent, we'll put all recipes into an array
			const data = Array.isArray(json) ? json : [json];
			handleSchemas(data);
		});

		return recipes;
	}

	/**
	 * This function handles all the templating of the recipes
	 */
	private addRecipeToMarkdown = async (url: string): Promise<void> => {
		const markdown = handlebars.compile(this.settings.recipeTemplate);
		try {
			const recipes = await this.fetchRecipes(url);
			let view = this.app.workspace.getActiveViewOfType(MarkdownView);

			// if there isn't a current file open, lets create a file and open it
			if (!view) {
				const vault = this.app.vault;

				// try and get recipe title
				const filename =
					recipes?.length > 0 && recipes?.[0]?.name
						? recipes[0].name
						: new Date().getTime(); // Generate a unique timestamp

				const path = `${filename}.md`; // File path with timestamp and .md extension

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
	 * In order to make templating easier. Lets normalize the types of recipe images
	 * to a single string url
	 */
	private normalizeImages(recipe: Recipe): Recipe {
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
}
