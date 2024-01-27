import { CheerioAPI } from "cheerio";
import type { Recipe } from "schema-dts";

export function scoreForIngredients(text: string): number {
	let score = 0;
	if (text.length < 100) score += 1; // Shorter text is more likely to be an ingredient
	if (/^\d/.test(text)) score += 1; // Starts with a number (e.g., "3 cups of rice")
	if (/\b(cup|lb|oz|teaspoon|tablespoon)\b/i.test(text)) score += 1; // Contains a unit
	if (/\b(salt|olive oil|butter)\b/i.test(text)) score += 1; // Contains common ingredient words

	return score;
}

export function scoreForInstructions(text: string): number {
	let score = 0;
	if (text.length > 100) score += 1; // Longer text is more likely to be an instruction
	if (/^[A-Z]/.test(text)) score += 1; // Starts with a capital letter
	if (/[.!?]$/.test(text)) score += 1; // Ends in punctuation
	if (/\b(Sprinkle|Mix|Heat|Cook|Stir|boil|Remove|Cover|Combine|Preheat)\b/i.test(text)) score += 1; // Contains instructional words

	return score;
}

export function findListInSection($: CheerioAPI, sectionName: string, scoringFunction: (text: string) => number): string[] {
	const list: string[] = [];

	function findSection() {
		let section = null;
	
		// Look for headings or other elements that might contain the section name
		$("h1, h2, h3, h4, h5, h6, p, div").each((i, el) => {
			const text = $(el).text().trim();
			if (new RegExp(sectionName, 'i').test(text)) {
				section = el;
				return false; // Breaks the loop once the section is found
			}
		});
	
		return section;
	}

	function dfs(node: any) {
		if (node.type === 'text') {
			const text = $(node).text().trim();
			if (text) {
				const score = scoringFunction(text);
				if (score > 2) { // Define a suitable threshold
					list.push(text);
				}
			}
		}

		if (node.children) {
			node.children.forEach((child:any) => dfs(child));
		}
	}

	// Start DFS from the identified section, if available
	const section = findSection(); 
	if (section) {
		dfs(section);
	} else {
		// If no specific section is found, fall back to the entire document
		dfs($('html')[0]);
	}

	return list;
}

export function parseDom($: CheerioAPI): Recipe[] {
	const recipes:Recipe[] = []
	const ingredientsList = findListInSection($, "Ingredients", scoreForIngredients)
	const instructionList = findListInSection($, "Directions|Instructions", scoreForInstructions)

	const recipe = {
		"@context": "https://schema.org/",
		"@type": "Recipe" as const,
		name: $('title').text()?.trim(),
		recipeIngredient: ingredientsList,
		recipeInstructions: instructionList
	}

	recipes.push(recipe)

	return recipes
}
