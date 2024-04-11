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
	TFile,
} from "obsidian";
import * as handlebars from "handlebars";
import type { Recipe } from "schema-dts";
import * as cheerio from "cheerio";
import { fileTypeFromBuffer } from "file-type";
import * as c from "./constants";
import * as settings from "./settings";
import { LoadRecipeModal } from "./modal-load-recipe";
import dateFormat, { masks } from "dateformat";

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
						this.addRecipeToMarkdown,
					).open();
				}
			},
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
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			settings.DEFAULT_SETTINGS,
			await this.loadData(),
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

			// if the user unsafely decides to not escape html, lets unescape it
			if (this.settings.unescapeHtml) {
				json = this.unescapeHtml(json);
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
		// Add a handlebar function to split comma separated tags into the obsidian expected array/list
		handlebars.registerHelper("splitTags", function (tags) {
			var tagsArray = tags.split(",");
			var tagString = "";
			for (const tag of tagsArray) {
				tagString += "- " + tag.trim() + "\n";
			}
			return tagString;
		});

		// Prettify time
		handlebars.registerHelper("prettyTime", function (thetime) {
			if (thetime) {
				return thetime
					.trim()
					.replace("PT", "")
					.replace("H", "h ")
					.replace("M", "m ")
					.replace("S", "s ");
			}
			return "";
		});

		// Formattable timestamp when saved
		handlebars.registerHelper("savedAt", function (savedFormat) {
			if (!savedFormat || typeof savedFormat != "string") {
				return dateFormat(new Date(), "yyyy-mm-dd HH:MM");
			}
			return dateFormat(new Date(), savedFormat);
		});

		const markdown = handlebars.compile(this.settings.recipeTemplate);
		try {
			const recipes = await this.fetchRecipes(url);
			let view = this.settings.saveInActiveFile
				? this.app.workspace.getActiveViewOfType(MarkdownView)
				: null;

			let file: TFile | null = null; // this TFile instance is used by fetchImage() to get save folder path.

			// if there isn't a view due to settings or no current file open, lets create a file according to folder settings and open it
			if (!view) {
				if (this.settings.folder != "") {
					await this.folderCheck(this.settings.folder); // this checks if folder exists and creates it if it doesn't.
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
								this.settings.folder,
							)}/${filename}.md`; // File path with timestamp and .md extension
				// Create a new untitled file with empty content
				file = await vault.create(path, "");

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
					"A validated recipe scheme was not found on this page, sorry!\n\nIf you think this is an error, please open an issue on github.",
				);
				return;
			}

			// pages can have multiple recipes, lets add them all
			let i = 0;
			for (const recipe of recipes) {
				if (this.settings.debug) {
					console.log(recipe);
					console.log(markdown(recipe));
				}
				// this will download the images and replace the json "recipe.image" value with the path of the image file.
				if (this.settings.saveImg && file) {
					const filename = recipe.name.replace(/\ /g, "-"); // We dont want spaces in filenames
					if (this.settings.imgFolder != "") {
						await this.folderCheck(this.settings.imgFolder);
						if (this.settings.saveImgSubdir) {
							await this.folderCheck(
								this.settings.imgFolder + "/" + filename,
							);
						}
					}
					// Getting the recipe main image
					const imgFile = await this.fetchImage(
						filename,
						recipe.image,
						file,
					);
					if (imgFile) {
						recipe.image = imgFile.path;
					}
					// Getting all the images in instructions
					let imageCounter = 0;
					for (const instruction of recipe.recipeInstructions) {
						if (instruction.image) {
							const imgFile = await this.fetchImage(
								filename,
								instruction.image[0],
								file,
								imageCounter,
							);
							if (imgFile) {
								imageCounter += 1;
								instruction.image[0] = imgFile.path;
							}
							// Not sure if this would occur, but in theory it's possible
						} else if (instruction.itemListElement) {
							for (const element of instruction.itemListElement) {
								if (element.image) {
									const imgFile = await this.fetchImage(
										filename,
										element.image[0],
										file,
										imageCounter,
									);
									if (imgFile) {
										imageCounter += 1;
										element.image[0] = imgFile.path;
									}
								}
							}
						}
					}
				}
				// notice instead of just passing the recipe into markdown, we are
				// adding a key called 'json'. This is so we can see the raw json in the
				// template if a user wants it.
				view?.editor.replaceSelection(
					markdown({
						...recipe,
						json: JSON.stringify(recipe, null, 2),
					}),
				);
			}
		} catch (error) {
			return;
		}
	};

	/**
	 * This function checks for an existing folder (creates if it doesn't exist)
	 */
	private async folderCheck(foldername: string) {
		const vault = app.vault;
		const folderPath = normalizePath(foldername);
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
	 * This function fetches the image (as an array buffer) and saves as a file, returns the path of the file.
	 */
	private async fetchImage(
		filename: Recipe["name"],
		imgUrl: Recipe["image"],
		file: TFile,
		imgNum = false,
	): Promise<false | TFile> {
		if (!imgUrl) {
			return false;
		}
		const subDir = filename;
		if (imgNum !== false) {
			filename += "_" + imgNum.toString();
		}
		try {
			const res = await requestUrl({
				url: String(imgUrl),
				method: "GET",
			});
			const type = await fileTypeFromBuffer(res.arrayBuffer); // type of the image
			if (!type) {
				return false;
			}
			let path;
			if (this.settings.imgFolder == "") {
				//@ts-ignore
				path = await this.app.vault.getAvailablePathForAttachments(
					filename,
					type.ext,
					file,
				); // fetches the exact save path to create the file according to obsidian default attachment settings
			} else if (this.settings.saveImgSubdir) {
				path = `${normalizePath(this.settings.imgFolder)}/${subDir}/${filename}.${type.ext}`;
			} else {
				path = `${normalizePath(this.settings.imgFolder)}/${filename}.${type.ext}`;
			}
			const file = app.vault.getAbstractFileByPath(path);
			if (file && file instanceof TFile) {
				return file;
			}
			const imgPath = await app.vault.createBinary(path, res.arrayBuffer);
			return imgPath;
		} catch (err) {
			return false;
		}
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
