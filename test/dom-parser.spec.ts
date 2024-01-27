import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { findListInSection, scoreForIngredients, scoreForInstructions } from '../src/dom-parser';

describe('Recipe DOM Scraper', () => {
  it('Finds and extracts ingredients', async () => {
    // const mockHtmlPath = path.join(__dirname, 'mocks', 'microdata-schema.html');
    // const mockHtml = fs.readFileSync(mockHtmlPath, 'utf8');
    // const $ = cheerio.load(mockHtml);

    // const ingredientsList = findListInSection($, "Ingredients", scoreForIngredients);

    // expect(Array.isArray(ingredientsList)).toBe(true);
	// expect(ingredientsList[0]).toEqual('½ cup red pepper jelly, such as Tabasco');
  });

  it('Finds and extracts instructions', async () => {
    // const mockHtmlPath = path.join(__dirname, 'mocks', 'microdata-schema.html');
    // const mockHtml = fs.readFileSync(mockHtmlPath, 'utf8');
    // const $ = cheerio.load(mockHtml);

	// const instructionList = findListInSection($, "Directions|Instructions", scoreForInstructions)

    // expect(Array.isArray(instructionList)).toBe(true);
	// expect(instructionList[0]).toEqual('Preheat the oven to 350ºF.');
  });
});
