import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	requestUrl,
} from "obsidian";
import * as c from "./constants";
import * as cheerio from "cheerio";
import * as settings from "./settings";
import { CheerioAPI } from "cheerio";
import { Recipe } from "schema-dts";
import { type } from "os";

export default class RecipeGrabber extends Plugin {
	settings: settings.PluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("dice", c.PLUGIN_NAME, (evt: MouseEvent) => {
			new LoadRecipeModal(this.app).open();
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: c.CMD_OPEN_MODAL,
			name: "Grab Recipe",
			callback: () => {
				new LoadRecipeModal(this.app).open();
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
		this.addSettingTab(new SampleSettingTab(this.app, this));

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
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class LoadRecipeModal extends Modal {
	result: string;

	constructor(app: App) {
		super(app);
	}

	getHtml = async (url: string) => {
		new Notice(`Fetching: ${url}`);

		try {
			const resp = await requestUrl({
				url,
				method: "GET",
				headers: {
					"Content-Type": "text/html",
				},
			});

			return resp.text;
		} catch (err) {
			return err;
		}
	};

	get$ = (html: string): CheerioAPI => {
		return cheerio.load(html);
	};

	handleJSON = (json: Recipe) => {
		const _type = json?.["@type"];
		// some sites are using the wrong type, @type as an array
		if (
			(Array.isArray(_type) && !_type.includes("Recipe")) ||
			(typeof _type === "string" && _type !== "Recipe")
		) {
			return;
		}

		console.log(json);
	};

	onSubmit = async (
		result = "https://www.allrecipes.com/recipe/223042/chicken-parmesan/"
	) => {
		const text = await this.getHtml(result);
		const $ = this.get$(text);

		$('script[type="application/ld+json"]').each((i, el) => {
			const html = $(el).html();
			if (!html) return;
			const json = JSON.parse(html);
			if (Array.isArray(json)) {
				json.forEach(this.handleJSON);
			} else {
				this.handleJSON(json);
			}
			// if (json?.["@type"]?.includes("Recipe") && json?.name) {
			// 	console.log(json.name);
			// } else {
			// 	console.log("Not a recipe", json?.["@type"]);
			// }
		});
	};

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "What's your name?" });

		new Setting(contentEl).setName("Name").addText((text) =>
			text.onChange((value) => {
				this.result = value;
			})
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					// this.close();
					this.onSubmit(this.result);
				})
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: RecipeGrabber;

	constructor(app: App, plugin: RecipeGrabber) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}