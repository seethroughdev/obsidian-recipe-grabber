import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { findListInSection, scoreForIngredients, scoreForInstructions } from '../src/dom-parser';

describe('Recipe DOM Scraper', () => {
  it('Finds and extracts ingredients', async () => {
    const mockHtmlPath = path.join(__dirname, 'mocks', 'microdata-schema.html');
    const mockHtml = fs.readFileSync(mockHtmlPath, 'utf8');
	const mockIngredients = [
        '½ cup red pepper jelly, such as Tabasco',
        '1 tablespoon water',
        '1 pound boudin links',
        '1 large egg, beaten, for brushing',
        '½ cup crumbled bacon',
        '½ cup diced green onion tops'
	]

    const $ = cheerio.load(mockHtml);
    const ingredientsList = findListInSection($, "Ingredients", scoreForIngredients);

	expect(ingredientsList).toEqual(mockIngredients);
  });

  it('Finds and extracts instructions', async () => {
    const mockHtmlPath = path.join(__dirname, 'mocks', 'microdata-schema.html');
    const mockHtml = fs.readFileSync(mockHtmlPath, 'utf8');
    const $ = cheerio.load(mockHtml);

	const instructionList = findListInSection($, "Directions|Instructions", scoreForInstructions)
	console.log(instructionList)

    // expect(Array.isArray(instructionList)).toBe(true);
	// expect(instructionList[0]).toEqual('Preheat the oven to 350ºF.');
  });

  it('Finds and extracts recipe schema from HTML', async () => {

  });
});
