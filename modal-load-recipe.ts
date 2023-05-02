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
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { Recipe } from "schema-dts";
import * as handlebars from "handlebars";

export class LoadRecipeModal extends Modal {
	result: string;
	template = (url: string) => `
		---
		date: Apr 28th, 2023 @11:41am
		tags: recipe 
		created: {{datePublished}}
		url: ${url} 
		---

		# {{name}}
		{{description}}

		{{#if image}}
			![{{name}}]({{image.url}})
		{{/if}}

		## Ingredients
		{{#each recipeIngredient}}
			- {{this}}
		{{/each}}

		## Instructions
		{{#each recipeInstructions}}
			- {{this.text}}
		{{/each}}


		-----

		## Notes
	`;

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

	getMarkdown = (recipe: Recipe, url: string): string | undefined => {
		const _type = recipe?.["@type"];
		// some sites are using the wrong type, @type as an array
		if (
			(Array.isArray(_type) && !_type.includes("Recipe")) ||
			(typeof _type === "string" && _type !== "Recipe")
		) {
			return;
		}

		const html = handlebars.compile(this.template(url));
		// execute the compiled template and print the output to the console
		return html(recipe);
	};

	onSubmit = async (
		result = "https://www.allrecipes.com/recipe/223042/chicken-parmesan/"
	) => {
		const html = await this.getHtml(result);
		const $ = this.get$(html);

		let markdown = "";
		let recipe: Recipe;

		$('script[type="application/ld+json"]').each((i, el) => {
			const html = $(el).html();
			if (!html) return;
			recipe = JSON.parse(html);
			if (Array.isArray(recipe)) {
				recipe.forEach((j) =>
					markdown.concat(this.getMarkdown(j, result) || "")
				);
			} else {
				markdown = this.getMarkdown(recipe, result) || "";
			}
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
