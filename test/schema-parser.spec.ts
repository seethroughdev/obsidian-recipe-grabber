import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { parseJsonSchema, extractMicrodata } from '../src/schema-parser';

describe('Recipe Schema Parser', () => {
  it('Accurately parses complete scheme', async () => {
    const mockHtmlPath = path.join(__dirname, 'mocks', 'full-schema.html');
    const mockHtml = fs.readFileSync(mockHtmlPath, 'utf8');
    const $ = cheerio.load(mockHtml);

	const recipeJsonElements = $('script[type="application/ld+json"]')
	const jsonRecipes = parseJsonSchema($, recipeJsonElements)

	expect(Array.isArray(jsonRecipes)).toBe(true);
	if (jsonRecipes.length > 0) {
		const ingredients = jsonRecipes[0].recipeIngredient;

		if (Array.isArray(ingredients)) {
			expect(ingredients[0]).toEqual('Tortillas (preferably white corn)');
		}
	}
  });

  it('Finds microdata in the HTML', async () => {
    const mockHtmlPath = path.join(__dirname, 'mocks', 'microdata-schema.html');
    const mockHtml = fs.readFileSync(mockHtmlPath, 'utf8');
    const $ = cheerio.load(mockHtml);

	const jsonRecipes = extractMicrodata($)
	expect(Array.isArray(jsonRecipes)).toBe(true);

	if (jsonRecipes.length > 0) {
		const ingredients = jsonRecipes[0].recipeIngredient;

		if (Array.isArray(ingredients)) {
			expect(ingredients[0]).toEqual('½ cup red pepper jelly, such as Tabasco');
		}
	}

  });

  it('Finds ingredients and appends them to the schema', async () => {
    const mockHtmlPath = path.join(__dirname, 'mocks', 'partial-schema.html');
    const mockHtml = fs.readFileSync(mockHtmlPath, 'utf8');
    const $ = cheerio.load(mockHtml);

	const recipeJsonElements = $('script[type="application/ld+json"]')
	const jsonRecipes = parseJsonSchema($, recipeJsonElements)

	expect(Array.isArray(jsonRecipes)).toBe(true);
	if (jsonRecipes.length > 0) {
		const ingredients = jsonRecipes[0].recipeIngredient;

		if (Array.isArray(ingredients)) {
			expect(ingredients[0]).toEqual('1 fully cooked spiral cut ham, about 8 pounds');
		}
	}
  });
});
