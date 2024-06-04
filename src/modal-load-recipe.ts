import { App, Modal, Setting } from "obsidian";
import * as settings from "./settings";

export class LoadRecipeModal extends Modal {
  result: string;
  onSubmit: (url: string) => void;
  settings: settings.PluginSettings;

  constructor(app: App, onSubmit: (url: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("p", { text: "Paste the url of your recipe" });

    new Setting(contentEl).setName("url: ").addText((text) => {
      text.setPlaceholder("https://www.example.com/recipe");

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
