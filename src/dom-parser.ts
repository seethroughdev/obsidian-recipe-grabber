import type { CheerioAPI, Cheerio, Element } from "cheerio";
import type { Recipe } from "schema-dts";

export function scoreForIngredients(text: string): number {
    let score = 0;
    const normalizedText = text.toLowerCase().trim();

    if (normalizedText.length < 100) score += 1;

    // Starts with a quantity (number or fraction like ½)
    if (/^\d|½/.test(normalizedText)) score += 1;

    // Expanded and refined regex for units
    const unitRegex = /\b(cups?|pounds?|lbs?|oz|teaspoons?|tbsps?|tablespoons?)\b/;
    if (unitRegex.test(normalizedText)) score += 2; // Higher score for units

    // Expanded list of common ingredients
    const ingredientRegex = /\b(salt|olive oil|butter|sugar|flour|eggs?|milk|water)\b/;
    if (ingredientRegex.test(normalizedText)) score += 1;

    return score;
}

export function scoreForInstructions(text: string): number {
    let score = 0;
    const normalizedText = text.trim();

    if (normalizedText.length > 80 && normalizedText.length < 300) score += 1;
    if (/^\d+\.?|•/.test(normalizedText)) score += 1; // Starts with a number or bullet point
    if (/^[A-Z]/.test(normalizedText)) score += 1; // Starts with a capital letter
    if (/[.!?]$/.test(normalizedText)) score += 1; // Ends in punctuation

    const instructionRegex = /\b(chop|sprinkle|mix|heat|cook|stir|boil|remove|cover|combine|preheat|slice|dice|season)\b/i;
    if (instructionRegex.test(normalizedText)) score += 2; // Higher score for instructional words

    return score;
}

function scoreForSection($: CheerioAPI, el: Element, sectionName: string): number {
    let score = 0;

    // Score based on proximity to list tags (ul or ol)
    const proximityScore = getProximityToTag($, el, 'ul, ol');
    score += proximityScore;

    // Increase score if the element is a heading tag, which often labels sections
    if (/h[1-6]/i.test(el.tagName)) {
        score += 2;
    }

    return score;
}

// Helper function to calculate proximity to specific tags (like ul or ol)
function getProximityToTag($: CheerioAPI, el: Element, tagName: string): number {
    let proximityScore = 0;
    if ($(el).find(tagName).length > 0) {
        proximityScore += 5; // Closer proximity increases the score
    }
    return proximityScore;
}

export function findListInSection($: CheerioAPI, sectionName: string, scoringFunction: (text: string) => number): string[] {
	const list: string[] = [];

	function findSection() {
		let section = null;
	
		const sectionScores: {[key: number]: number} = {};

		// Scoring potential sections
		$("h1, h2, h3, h4, h5, h6, div").each((i, el) => {
			const text = $(el).text().trim();
			if (new RegExp(sectionName, 'i').test(text)) {
				const score = scoreForSection($, el, sectionName);
				sectionScores[i] = score;
			}
		});

		const bestSectionIndex = Object.keys(sectionScores).reduce((a, b) => {
			const scoreA = sectionScores[+a]; // Convert key 'a' to number and get its score
			const scoreB = sectionScores[+b]; // Convert key 'b' to number and get its score
			return scoreA > scoreB ? +a : +b; // Compare scores and return the appropriate key as a number
		}, 0);
		
		const bestSection = $("h1, h2, h3, h4, h5, h6, div").get(bestSectionIndex);
		
		return bestSection;
	}

	function dfs(node: any, foundFirstIngredient = false) {
		let currentNode = node;
	
		while (currentNode) {
			if (currentNode.type === 'text') {
				const text = $(currentNode).text().trim();
				if (text) {
					const score = scoringFunction(text);
					if (score > 2 || foundFirstIngredient) {
						list.push(text);
						foundFirstIngredient = true;
					}
				}
			}
	
			// If the first ingredient has been found, move to the next sibling
			// instead of diving deeper into children nodes
			if (foundFirstIngredient) {
				currentNode = currentNode.nextSibling;
			} else if (currentNode.children) {
				// Continue with DFS for children nodes until the first ingredient is found
				currentNode.children.forEach((child: any) => dfs(child, foundFirstIngredient));
				currentNode = null; // Break the loop once DFS is done for children
			} else {
				currentNode = null; // No children, end the loop
			}
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

export function parseDom($: CheerioAPI, url: string): Recipe[] {
	const ingredientsList = findListInSection($, "Ingredients", scoreForIngredients)
	const instructionList = findListInSection($, "Directions|Instructions", scoreForInstructions)
	const author = $('meta[name="author"]').attr('content') || $('meta[property="og:author"]').attr('content')
	const ogImage = $('meta[property="og:image"]').attr('content') || '';

	const recipe = {
		"@context": "https://schema.org/",
		"@type": "Recipe" as const,
		name: $('title').text()?.trim(),
		recipeIngredient: ingredientsList,
		recipeInstructions: instructionList,
		image: ogImage,
		url: url,
		author: {
			"@type": "Person" as const,
			name: author
		}
	}

	return [recipe]
}
