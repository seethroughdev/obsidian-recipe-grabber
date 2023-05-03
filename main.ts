import { Editor, MarkdownView, Plugin, Notice, requestUrl } from "obsidian";
import * as cheerio from "cheerio";
import * as c from "./constants";
import * as settings from "./settings";
import { Recipe } from "schema-dts";
import { LoadRecipeModal } from "./modal-load-recipe";
import * as handlebars from "handlebars";

export default class RecipeGrabber extends Plugin {
	settings: settings.PluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("dice", c.PLUGIN_NAME, (evt: MouseEvent) => {
			new LoadRecipeModal(this.app, this.getRecipes).open();
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: c.CMD_OPEN_MODAL,
			name: "Grab Recipe",
			callback: () => {
				new LoadRecipeModal(this.app, this.getRecipes).open();
			},
		});

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: c.CMD_INSERT_RECIPE,
			name: "Insert Recipe",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new settings.SettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			settings.DEFAULT_SETTINGS,
			await this.loadData()
		);

		this.getRecipes("https://littlesunnykitchen.com/marry-me-chicken/");
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getRecipes = async (url: string) => {
		const markdown = handlebars.compile(c.DEFAULT_TEMPLATE);
		const recipes = await this.fetchRecipes(url);
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		view.editor.setValue("");

		recipes.forEach((recipe) => {
			console.log(recipe);
			console.log(markdown(recipe));
			view.editor.replaceSelection(markdown(recipe));
		});
	};

	/**
	 * The main function to go get the recipe, and format it for the template
	 */
	async fetchRecipes(
		url = "https://cooking.nytimes.com/recipes/1013116-simple-barbecue-sauce"
	): Promise<Recipe[]> {
		new Notice(`Fetching: ${url}`);
		let response;

		try {
			response = await requestUrl({
				url,
				method: "GET",
				headers: {
					"Content-Type": "text/html",
				},
			});
		} catch (err) {
			return err;
		}

		const $ = cheerio.load(response.text);

		const recipes: Recipe[] = [];

		$('script[type="application/ld+json"]').each((i, el) => {
			const content = $(el).text();
			if (!content) return;
			let json = JSON.parse(content);
			const _type = json?.["@type"];

			// there is a chance that the recipe is in a graph
			if (!_type && json?.["@graph"]) {
				json["@graph"].find((graph: Recipe) => {
					if (graph["@type"] === "Recipe") {
						json = graph;
					}
				});
			}

			// make sure its a recipe, this could be in an array or not
			if (
				(Array.isArray(_type) && !_type.includes("Recipe")) ||
				(typeof _type === "string" && _type !== "Recipe")
			) {
				return;
			}

			json.url = url;

			if (Array.isArray(json)) {
				recipes.push(...json);
			} else {
				recipes.push(json);
			}
		});

		return recipes;
	}
}
