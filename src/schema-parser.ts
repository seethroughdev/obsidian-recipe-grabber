import { scoreForIngredients, scoreForInstructions, findListInSection } from "./dom-parser";
import type { Recipe } from "schema-dts";
import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio, Element } from "cheerio";


/**
 * Unfortunately, some schemas are arrays, some not. Some in @graph, some not.
 * Here we attempt to move all kinds into a single array of RecipeLeafs
 */
function handleSchemas(schemas: any[]): Recipe[] {
	const normalizedSchemas: Recipe[] = []

	schemas.forEach((schema) => {
		if ("@graph" in schema && Array.isArray(schema?.["@graph"])) {
			return handleSchemas(schema["@graph"]);
		} else {
			const _type = schema?.["@type"];

			if (
				Array.isArray(_type)
					? _type.includes("Recipe")
					: schema?.["@type"] === "Recipe"
			) {
				normalizedSchemas.push(schema);
			}
		}
	});

	return normalizedSchemas
}

// Let's check the JSON to make sure it has the important parts
function processRecipeSchema($: CheerioAPI, schema: Recipe): Recipe {
	if (!(Array.isArray(schema.recipeIngredient) && schema.recipeIngredient?.length)) {
		const ingredientsList = findListInSection($, "Ingredients", scoreForIngredients)
		schema.recipeIngredient = ingredientsList
	}

	if (!(Array.isArray(schema.recipeInstructions) && schema.recipeInstructions?.length)) {
		const instructionList = findListInSection($, "Directions|Instructions", scoreForInstructions)
		schema.recipeInstructions = instructionList
	}

	return schema
}

export function parseJsonSchema($: CheerioAPI, elements: Cheerio<Element>, url: string): Recipe[] {
	const recipes:Recipe[] = []

	elements.each((i, el) => {
		const content = $(el).text()?.trim();
		const json = JSON.parse(content);

		// to make things consistent, we'll put all recipes into an array
		const data = Array.isArray(json) ? json : [json];
		const normalizedSchemas = handleSchemas(data);

		normalizedSchemas.forEach(schema => {
			const fullRecipe = {
				...processRecipeSchema($, schema),
				url: url
			}

			recipes.push(fullRecipe)
		})
	});

	return recipes
}

export function extractMicrodata($: CheerioAPI, url: string): Recipe[] {
	// const ogImage = $('meta[property="og:image"]').attr('content') || '';
	// TODO - Maybe insert this if it doesn't exist
    const dataObjects: Recipe[] = [];

	function processItemScope(element: Element): Recipe {

		const data: Recipe = {
			"@type": "Recipe" as const,
			url: url
		};
	
		$(element).find('[itemprop]').each(function() {
			let propName = $(this).attr('itemprop');
			if (typeof propName === 'string') {
				// Normalize itemprop "ingredients" to "recipeIngredient"
				if (propName === 'ingredients') {
					propName = 'recipeIngredient';
				}
	
				const propValue = $(this).is('[itemscope]') ? processItemScope(this) : $(this).text().trim();
	
				// Check if the property already exists
				if (data.hasOwnProperty(propName)) {
					// If it's not an array, convert it into an array
					if (!Array.isArray((data as any)[propName])) {
						(data as any)[propName] = [(data as any)[propName]];
					}
					// Push the new value into the array
					(data as any)[propName].push(propValue);
				} else {
					// If the property doesn't exist, simply assign the value
					(data as any)[propName] = propValue;
				}
			}
		});
	
		return data;
	}

    // Select only elements with itemscope and itemtype="http://schema.org/Recipe"
    $('[itemscope][itemtype="http://schema.org/Recipe"]').each(function() {
        // Since we're already filtering by the correct itemtype, 
        // we can directly process and add each item.
        const processedItem = processItemScope(this);
        if (processedItem) { // Check if processedItem is not null
            dataObjects.push(processedItem);
        }
    });

    return dataObjects;
}
