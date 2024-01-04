import { App, PluginSettingTab, Setting } from "obsidian";
import RecipeGrabber from "./main";
import * as c from "./constants";

export interface PluginSettings {
	folder: string;
	saveInActiveFile: boolean;
	recipeTemplate: string;
	debug: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	folder: "",
	saveInActiveFile: false,
	recipeTemplate: c.DEFAULT_TEMPLATE,
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
		.setDesc("Default recipe import location. If empty, recipe will be imported in the Vault root.")
			.addText((text) => {
				text
					.setPlaceholder("eg: Recipes")
					.setValue(this.plugin.settings.folder)
					.onChange(async (value) => {
						this.plugin.settings.folder = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Save in currently opened file")
			.setDesc("Imports the recipe into an active document. if no active document, the above save folder setting will apply.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.saveInActiveFile)
					.onChange(async (value) => {
						this.plugin.settings.saveInActiveFile = value;
						await this.plugin.saveSettings();
					});
			});

		const templateDescription = document.createDocumentFragment();
		templateDescription.append('Here you can edit the Template for newly created files. See ',
		templateDescription.createEl("a", {
			href: "https://github.com/seethroughdev/obsidian-recipe-grabber/blob/master/README.md",
			text: 'README',
		}),
		' for more info.')

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
					})
			)
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.recipeTemplate).onChange(
					async (value) => {
						this.plugin.settings.recipeTemplate = value;
						await this.plugin.saveSettings();
					}
				);
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
