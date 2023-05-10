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

# [{{name}}]({{url}})

{{description}}

{{#if image.[0].url}}
![{{name}}]({{image.[0].url}})
{{else if image.url}}
![{{name}}]({{image.url}})
{{else if image.[0]}}
![{{name}}]({{image.[0]}})
{{else}}
![{{name}}]({{image}})
{{/if}}

### Ingredients

{{#if recipeIngredient.[0]}}
{{#each recipeIngredient}}
- {{this}}
{{/each}}
{{else}}
{{recipeIngredient}}
{{/if}}

### Instructions

{{#each recipeInstructions}}
- {{this.text}}
{{/each}}


-----

## Notes
`;
