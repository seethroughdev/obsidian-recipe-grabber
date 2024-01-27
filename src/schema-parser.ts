import { scoreForIngredients, scoreForInstructions, findListInSection } from "./dom-parser";
import type { Recipe } from "schema-dts";
import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio, Element } from "cheerio";
/**
 * Some details are in varying formats, for templating to be easier,
 * lets attempt to normalize them
 */
function normalizeSchema(json: Recipe): Recipe {
	json = normalizeImages(json);

	if (typeof json.recipeIngredient === "string") {
		json.recipeIngredient = [json.recipeIngredient];
	}

	// if the user unsafely decides to not escape html, lets unescape it
	// if (this.settings.unescapeHtml) {
	// 	json = unescapeHtml(json);
	// }

	return json
}

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
				normalizedSchemas.push(normalizeSchema(schema));
			}
		}
	});

	return normalizedSchemas
}

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

/**
 * In order to make templating easier. Lets normalize the types of recipe images
 * to a single string url
 */
function normalizeImages(recipe: Recipe): Recipe {
	if (typeof recipe.image === "string") {
		return recipe;
	}

	if (Array.isArray(recipe.image)) {
		const image = recipe.image?.[0];
		if (typeof image === "string") {
			recipe.image = image;
			return recipe;
		}
		if (image?.url) {
			recipe.image = image.url;
			return recipe;
		}
	}

	/**
	 * Although the spec does not show ImageObject as a top level option, it is used in some big sites.
	 */
	if ((recipe as any).image?.url) {
		recipe.image = (recipe as any)?.image?.url || "";
	}

	return recipe;
}

/**
 * This function will go through the data object and attempt to convert all strings into unescaped strings
 * This is not the safest thing to do, and has to be opted in the settings. But it was requested by
 * several users.
 */
function unescapeHtml(recipe: Recipe): Recipe {
	const unescape = (str: string) => {
		const $ = cheerio.load(str);
		return $.text();
	};

	// this awfully ugly function will traverse the object and unescape all strings, and pass
	// anything else back in to check again
	const traverse = (obj: any) => {
		Object.keys(obj).forEach((key) => {
			if (typeof obj[key] === "string") {
				obj[key] = unescape(obj[key]);
			} else if (Array.isArray(obj[key])) {
				obj[key].forEach((item: unknown) => {
					if (typeof item === "string") {
						item = unescape(item);
					} else if (typeof item === "object") {
						traverse(item);
					}
				});
			} else if (typeof obj[key] === "object") {
				traverse(obj[key]);
			}
		});
	};

	traverse(recipe);

	return recipe;
}
