import { App, PluginSettingTab, Setting } from "obsidian";
import RecipeGrabber from "./main";
import * as c from "./constants";

export interface PluginSettings {
	debug: boolean;
	recipeTemplate: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	debug: false,
	recipeTemplate: c.DEFAULT_TEMPLATE,
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

		new Setting(containerEl)
			.setClass("settingsTemplateRow")
			.setName("Recipe template")
			.setDesc(
				"A Handlebars template to render the recipe. (see README for more info)"
			)
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
	}
}
