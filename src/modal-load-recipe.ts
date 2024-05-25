import { App, Modal, Setting } from "obsidian";
import * as settings from "./settings";

export class LoadRecipeModal extends Modal {
	result: string;
	onSubmit: (url: string) => void;
	settings: settings.PluginSettings;

	constructor(
		app: App,
		settings: settings.PluginSettings,
		onSubmit: (url: string) => void,
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.settings = settings;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("p", { text: "Paste the url of your recipe" });

		new Setting(contentEl).setName("url: ").addText((text) => {
			text.setPlaceholder("https://www.example.com/recipe");

			// for development, don't want to paste a url in every time.
			if (this.settings.debug) {
				text.setValue("https://www.loveandlemons.com/broccoli-salad/");
				this.result = text.getValue();
			}

			text.onChange((value) => {
				this.result = value;
			});
			text.inputEl.style.width = "100%";
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Get Recipe")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.result);
				}),
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
