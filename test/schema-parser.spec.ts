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
	const jsonRecipes = parseJsonSchema($, recipeJsonElements, '')

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

	const jsonRecipes = extractMicrodata($, '')
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
	const mockRecipeJson = [
        {
          '@context': 'https://schema.org/',
          '@type': 'Recipe',
          name: 'Cherry Bourbon Glazed Ham ',
          image: 'https://assets-global.website-files.com/657a7aac36df076237527e36/659591ab65fc632bf8a414bb_Screenshot%202024-01-03%20at%208.55.24%E2%80%AFAM.png',
          description: '',
          keywords: 'Cooking, Guy, Grill, Grilling, Grilled, BBQ, Dinner, Family Meal, Chicken, Beef, Steak, Pork, Seafood, Fish, Lobster, Sauce, Tacos, Sam The Cooking Guy',
          author: { '@type': 'Person', name: 'Sam The Cooking Guy' },
          datePublished: 'Jan 03, 2024',
          video: {
            '@type': 'VideoObject',
            name: 'Cherry Bourbon Glazed Ham ',
            description: '',
            thumbnailUrl: 'https://assets-global.website-files.com/657a7aac36df076237527e36/659591ab65fc632bf8a414bb_Screenshot%202024-01-03%20at%208.55.24%E2%80%AFAM.png',
            uploadDate: 'Jan 03, 2024',
            contentUrl: 'https://www.youtube.com/watch?v=kuag7GwEV1M',
            embedUrl: 'https://www.youtube.com/embed/kuag7GwEV1M'
          },
          recipeIngredient: [
            '1 fully cooked spiral cut ham, about 8 pounds',
            '1/3 cup Dijon mustard',
            '1/2 cup cherry bourbon',
            '1 1/2 cups brown sugar',
            '1/4 cup spicy deli mustard',
            '1 teaspoon garlic powder',
            '1 teaspoon Chinese 5 spice',
            '1 teaspoon ground coriander'
          ],
          recipeInstructions: [
            'Preheat oven to 275 degrees',
            'Combine 1/2 the bourbon with the mustard - mix well and brush over ham, getting a little in the slices',
            'Cover with foil, and bake 90 minutes',
            'Bring to a boil, then turn down to a simmer, and stir occasionally until it thickens, 5-7 minutes - set aside',
            'Remove the ham from the oven, and brush this over the ham and cook for another 30 minutes uncovered',
            'Remove from the oven and allow to rest, covered loosely with foil about 15 minutes before serving.'
          ],
          url: ''
        }
	]

    const $ = cheerio.load(mockHtml);

	const recipeJsonElements = $('script[type="application/ld+json"]')
	const jsonRecipes = parseJsonSchema($, recipeJsonElements, '')

	expect(jsonRecipes).toEqual(mockRecipeJson);
  });
});
