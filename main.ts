import { MarkdownView, Plugin, Notice, requestUrl } from "obsidian";
import * as cheerio from "cheerio";
import * as c from "./constants";
import * as settings from "./settings";
import { Recipe, Graph, WithContext, Thing, RecipeLeaf } from "schema-dts";
import { LoadRecipeModal } from "./modal-load-recipe";
import * as handlebars from "handlebars";

export default class RecipeGrabber extends Plugin {
	settings: settings.PluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("chef-hat", c.PLUGIN_NAME, (evt: MouseEvent) => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			const selection = view?.editor.getSelection()?.trim();
			// try and make sure its a url
			if (
				selection?.startsWith("http") &&
				selection.split(" ").length === 1
			) {
				this.getRecipes(selection);
			} else {
				new LoadRecipeModal(this.app, this.getRecipes).open();
			}
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: c.CMD_OPEN_MODAL,
			name: "Grab Recipe",
			callback: () => {
				new LoadRecipeModal(this.app, this.getRecipes).open();
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

	getRecipes = async (url: string): Promise<void> => {
		const markdown = handlebars.compile(this.settings.recipeTemplate);
		try {
			const recipes = await this.fetchRecipes(url);
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) return;
			view.editor.setValue("");

			recipes.forEach((recipe) => {
				if (this.settings.debug) {
					console.log(recipe);
					console.log(markdown(recipe));
				}
				view.editor.replaceSelection(markdown(recipe));
			});
		} catch (error) {
			return;
		}
	};

	/**
	 * The main function to go get the recipe, and format it for the template
	 */
	async fetchRecipes(
		_url = "https://cooking.nytimes.com/recipes/1013116-simple-barbecue-sauce"
	): Promise<Recipe[]> {
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

		const recipes: Recipe[] = [];

		function handleSchema(json: Recipe): void {
			const _type = json?.["@type"];

			// make sure its a recipe, this could be in an array or not
			if (
				!_type ||
				(Array.isArray(_type) && !_type.includes("Recipe")) ||
				(typeof _type === "string" && _type !== "Recipe")
			) {
				return;
			}

			json.url = url.href;
			recipes.push(json);
		}

		/**
		 * Unfortunately, I've found schemas that are arrays, some not. Some in @graph, some not.
		 * Here we attempt to move all kinds into a single array of RecipeLeafs
		 */
		function normalizeSchemas(schemas: RecipeLeaf[]): void {
			schemas.forEach((schema) => {
				if (Array.isArray(schema?.["@graph"])) {
					return normalizeSchemas(schema["@graph"]);
				}

				const _type = schema?.["@type"];

				if (
					Array.isArray(_type)
						? _type.includes("Recipe")
						: schema?.["@type"] === "Recipe"
				) {
					handleSchema(schema);
				}
			});
		}

		$('script[type="application/ld+json"]').each((i, el) => {
			const content = $(el).text()?.trim();
			const json = JSON.parse(content);
			const data = Array.isArray(json) ? json : [json];
			normalizeSchemas(data);
		});

		return recipes;
	}
}
