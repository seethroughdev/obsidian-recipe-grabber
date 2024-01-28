import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { findListInSection, scoreForIngredients, scoreForInstructions, parseDom } from '../src/dom-parser';

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
	const mockInstructions =  [
		'Preheat the oven to 350ºF.',
		'For the glaze, in a saucepan over medium heat, add the red pepper jelly and let cook until it softens and begins to melt, about 2 minutes. Add the water and stir until it thins out. Turn off the heat and keep warm.',
		'Lay out 2 links of boudin, and with a sharp paring knife, slice down the length of the boudin casing. Peel off the casing and discard. Slice halfway into the boudin the full length of the link. Wedge a plank of cheese into the opening at intervals along the boudin. Push down and close up the boudin around the cheese.',
		'Open a dough sheet package and unroll the sheet. Place the cylinder of cheese-stuffed boudin on the sheet and roll the dough around. Cut off the excess and pinch the ends closed. Repeat with the second link of boudin.',
		'On a metal baking tray sprayed with non-stick spray, place the 2 dough-wrapped boudin cylinders and join them together at the ends to form a circle. Brush the top with egg wash and sprinkle with salt.',
		'Place in the oven and bake for 40 minutes or until golden brown. Remove from the oven.',
		'With a spoon or brush, drizzle and paint the pepper jelly over the top of the hot pastry. Sprinkle the top with crumbled bacon and diced green onion tops.',
		'Serve on the baking tray by slicing the boudin king cake into portions and calling your guests while it’s piping hot.'
	]

    const $ = cheerio.load(mockHtml);
	const instructionList = findListInSection($, "Directions|Instructions", scoreForInstructions)

	expect(instructionList).toEqual(mockInstructions);
  });

  it('Finds and extracts recipe schema from HTML', async () => {
	const mockHtmlPath = path.join(__dirname, 'mocks', 'microdata-schema.html');
    const mockHtml = fs.readFileSync(mockHtmlPath, 'utf8');
	const mockRecipeJson = [
		{
		  '@context': 'https://schema.org/',
		  '@type': 'Recipe',
		  name: 'Boudin King Cake is a savory and spicy version of the Mardi Gras tradition.',
		  recipeIngredient: [
			'½ cup red pepper jelly, such as Tabasco',
			'1 tablespoon water',
			'1 pound boudin links',
			'1 large egg, beaten, for brushing',
			'½ cup crumbled bacon',
			'½ cup diced green onion tops'
		  ],
		  recipeInstructions: [
			'Preheat the oven to 350ºF.',
			'For the glaze, in a saucepan over medium heat, add the red pepper jelly and let cook until it softens and begins to melt, about 2 minutes. Add the water and stir until it thins out. Turn off the heat and keep warm.',
			'Lay out 2 links of boudin, and with a sharp paring knife, slice down the length of the boudin casing. Peel off the casing and discard. Slice halfway into the boudin the full length of the link. Wedge a plank of cheese into the opening at intervals along the boudin. Push down and close up the boudin around the cheese.',
			'Open a dough sheet package and unroll the sheet. Place the cylinder of cheese-stuffed boudin on the sheet and roll the dough around. Cut off the excess and pinch the ends closed. Repeat with the second link of boudin.',
			'On a metal baking tray sprayed with non-stick spray, place the 2 dough-wrapped boudin cylinders and join them together at the ends to form a circle. Brush the top with egg wash and sprinkle with salt.',
			'Place in the oven and bake for 40 minutes or until golden brown. Remove from the oven.',
			'With a spoon or brush, drizzle and paint the pepper jelly over the top of the hot pastry. Sprinkle the top with crumbled bacon and diced green onion tops.',
			'Serve on the baking tray by slicing the boudin king cake into portions and calling your guests while it’s piping hot.'
		  ],
		  image: 'https://acadianatable.com/wp-content/uploads/2016/01/Boudin-King-Cake-sliced.jpg',
		  url: '',
		  author: { '@type': 'Person', name: undefined }
		}
	]
	
	const $ = cheerio.load(mockHtml);
	const recipeJson = parseDom($, '')

	expect(recipeJson).toEqual(mockRecipeJson);
  });
});
