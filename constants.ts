export const PLUGIN_NAME = "Recipe Grabber";

/* -------------------------------- COMMANDS -------------------------------- */

export const CMD_OPEN_MODAL = "cmd-open-modal";
export const CMD_INSERT_RECIPE = "cmd-insert-recipe";

/* ---------------------------- DEFAULT TEMPLATE ---------------------------- */

export const DEFAULT_TEMPLATE = `
---
tags: recipe 
created: {{datePublished}}
author: {{author.name}}
url: {{url}} 
---

# {{name}}
{{description}}

{{#if image.url}}
	![{{name}}]({{image.url}})
	{{else}}
	![{{name}}]({{image}})
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
