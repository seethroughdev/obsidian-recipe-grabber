This plugin allows you to paste the url of any recipe into your Obsidian page and get the contents in a concise recipe format along with the image and link back to the original page.

Its built for those of you who want to save the recipe, and not the complete history of biscuits and how much the author loves making them on their family trip to Maine.

https://github.com/seethroughdev/obsidian-recipe-grabber/assets/203779/88e3977c-fbb8-4bc6-a770-06071af154d1

---

### Frontmatter Issues

[Obsidian 1.4.6](https://obsidian.md/changelog/2023-08-31-desktop-v1.4.6/) changed the frontmatter behaviour.
The frontmatter has to start on the first line of the file now. If you have leading newlines in your recipe template, the resulting frontmatter won't be properly parsed by obsidian.
If you have this problem, go to the settings of this plugin and remove the leading newlines.

### Settings

-   Save Image: Downloads the recipe image into the vault (save location can be set in the plugin settings). `{{image}}` value will be the link to the downloaded file instead of the direct URL. Disabled by default. If Save Image option is enabled, use `![[{{image}}]]` in the template.
    > if settings is toggled off or image save fails, `{{image}}` value will be a direct URL.

### Custom templating

Prefer your own layout instead? No problem. Just paste a [custom handlebars string template](https://handlebarsjs.com/guide/#simple-expressions) into the settings.

We're assuming the page has a [json recipe](https://developers.google.com/search/docs/appearance/structured-data/recipe#guided-example) on the page. Make sure to check the [Example Recipe](https://developers.google.com/search/docs/appearance/structured-data/recipe#guided-example) for a list of what fields you can pull. And keep in mind that lots of recipes seem to not stick exactly to the spec. So expect some thing to take a little extra effort to get them there.

You can also add `{{{json}}}` for the raw json in the template if you like.

#### Custom handlebar functions

`splitTags`  
Split comma separated tags. Obsidian expect tags as a list in its properties.

```
tags:
{{splitTags keywords}}
```

`magicTime`
Attempts to handle anything included with time and date.  
Change the ugly PT1H30M string to a prettier 1h 30min formatting.  
Insert or reformat existing timestamps using any masks available at [dateformat](https://www.npmjs.com/package/dateformat), defaults to `yyyy-mm-dd HH:MM`.

```
DateSaved: {{magicTime}}
DateSaved2: {{magicTime "dd-mm-yyyy HH:MM"}}
CookTime: {{magicTime cookTime}}
TotalTime: {{magicTime totalTime}}
DatePublished1: {{magicTime datePublished}}
DatePublished2: {{magicTime datePublished "dd-mm-yyyy HH:MM"}}
```

Would return something like

```
DateSaved: 2024-04-13 20:10
DateSaved2: 13-04-2024 20:10
CookTime: 15m
TotalTime: 1h 5m
DatePublished1: 2017-07-27 00:14
DatePublished2: 27-07-2017 00:14
```

---

In the meantime, I did my best to make the most recipes I can work out of the box. Please [create ticket](#) if you have suggestions for improving it!
