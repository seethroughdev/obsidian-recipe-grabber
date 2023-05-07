import { App, PluginSettingTab, Setting } from "obsidian";
import RecipeGrabber from "./main";

export interface PluginSettings {
	debug: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
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
		containerEl.createEl("h2", { text: "Settings for the recipe grabber" });

		new Setting(containerEl)
			.setName("Debug mode")
			.setDesc("Just adds some things to make dev life a little easier.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.debug)
					.onChange(async (value) => {
						console.log("Debug mode: " + value);
						this.plugin.settings.debug = value;
						await this.plugin.saveSettings();
					});
			});
		// .addText((text) =>
		// 	text
		// 		.setPlaceholder("Debug mode")
		// 		.setValue(this.plugin.settings.debug ? "true" : "false")
		// 		.onChange(async (value) => {
		// 			console.log("Secret: " + value);
		// 			this.plugin.settings.mySetting = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// );
	}
}
