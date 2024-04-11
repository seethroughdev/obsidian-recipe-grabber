import { App, PluginSettingTab, Setting } from "obsidian";
import RecipeGrabber from "./main";
import * as c from "./constants";

export interface PluginSettings {
	folder: string;
	saveInActiveFile: boolean;
	imgFolder: string;
	saveImg: boolean;
	saveImgSubdir: boolean;
	recipeTemplate: string;
	unescapeHtml: boolean;
	debug: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	folder: "",
	saveInActiveFile: false,
	imgFolder: "",
	saveImg: false,
	saveImgSubdir: false,
	recipeTemplate: c.DEFAULT_TEMPLATE,
	unescapeHtml: false,
	debug: false,
};

export class SettingsTab extends PluginSettingTab {
	plugin: RecipeGrabber;

	constructor(app: App, plugin: RecipeGrabber) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("settingsTemplate");

		new Setting(containerEl)
			.setName("Recipe save folder")
			.setDesc(
				"Default recipe import location. If empty, recipe will be imported in the Vault root.",
			)
			.addText((text) => {
				text.setPlaceholder("eg: Recipes")
					.setValue(this.plugin.settings.folder)
					.onChange(async (value) => {
						this.plugin.settings.folder = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Save in currently opened file")
			.setDesc(
				"Imports the recipe into an active document. if no active document, the above save folder setting will apply.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.saveInActiveFile)
					.onChange(async (value) => {
						this.plugin.settings.saveInActiveFile = value;
						await this.plugin.saveSettings();
					});
			});

		const saveImgDescription = document.createDocumentFragment();
		saveImgDescription.append(
			"Save images imported by recipes. If empty, will follow: Files and links > new attachment location. See ",
			saveImgDescription.createEl("a", {
				href: "https://github.com/seethroughdev/obsidian-recipe-grabber#settings",
				text: "README",
			}),
			" for more info.",
		);

		new Setting(containerEl)
			.setName("Save images")
			.setDesc(saveImgDescription)
			.addText((text) => {
				text.setPlaceholder("eg: Recipes/RecipeImages")
					.setValue(this.plugin.settings.imgFolder)
					.onChange(async (value) => {
						this.plugin.settings.imgFolder = value.trim();
						await this.plugin.saveSettings();
					});
			})
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.saveImg)
					.onChange(async (value) => {
						this.plugin.settings.saveImg = value;
						await this.plugin.saveSettings();
					});
			});

		const saveImgSubdirDescription = document.createDocumentFragment();
		saveImgSubdirDescription.append(
			"Create a subdirectory for each recipe to store images. A parent directory needs to be set above.",
		);

		new Setting(containerEl)
			.setName("Save images in subdirectories")
			.setDesc(saveImgSubdirDescription)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.saveImgSubdir)
					.onChange(async (value) => {
						this.plugin.settings.saveImgSubdir = value;
						await this.plugin.saveSettings();
					});
			});

		const templateDescription = document.createDocumentFragment();
		templateDescription.append(
			"Here you can edit the Template for newly created files. See ",
			templateDescription.createEl("a", {
				href: "https://github.com/seethroughdev/obsidian-recipe-grabber#custom-templating",
				text: "README",
			}),
			" for more info.",
		);

		new Setting(containerEl)
			.setClass("settingsTemplateRow")
			.setName("Recipe template")
			.setDesc(templateDescription)
			.addButton((btn) =>
				btn
					.setButtonText("Reset to default")
					.setClass("settingsTemplateButton")
					.setCta()
					.onClick(async () => {
						this.plugin.settings.recipeTemplate =
							c.DEFAULT_TEMPLATE;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.recipeTemplate).onChange(
					async (value) => {
						this.plugin.settings.recipeTemplate = value;
						await this.plugin.saveSettings();
					},
				);
			});

		new Setting(containerEl)
			.setName(
				"Prevent escaping HTML (only do this if you know what you're doing)",
			)
			.setDesc(
				"This will tell the templating engine to attempt to unescape the HTML in case you want symbols rendered in the edit mode of your recipes.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.unescapeHtml)
					.onChange(async (value) => {
						this.plugin.settings.unescapeHtml = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Debug mode")
			.setDesc("Just adds some things to make dev life a little easier.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.debug)
					.onChange(async (value) => {
						this.plugin.settings.debug = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
