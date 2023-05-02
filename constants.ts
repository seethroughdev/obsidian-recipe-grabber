export const PLUGIN_NAME = "Recipe Grabber";

/* -------------------------------- COMMANDS -------------------------------- */

export const CMD_OPEN_MODAL = "cmd-open-modal";
export const CMD_INSERT_RECIPE = "cmd-insert-recipe";

/* ---------------------------- DEFAULT TEMPLATE ---------------------------- */

export const DEFAULT_TEMPLATE = (url?: string) => `
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
