import * as handlebars from "handlebars";
import dateFormat from "dateformat";

export const addHelpers = () => {
  // a custom helper to split tags into a list
  handlebars.registerHelper("splitTags", function (tags) {
    if (!tags || typeof tags != "string") {
      return "";
    }
    const tagsArray = tags.split(",");
    let tagString = "";
    for (const tag of tagsArray) {
      tagString += "- " + tag.trim() + "\n";
    }
    return tagString;
  });

  // quick function to check if a string is a valid date
  function isValidDate(d: string): boolean {
    return !isNaN(Date.parse(d));
  }

  // /obsidian-recipe-grabber/pull/25
  handlebars.registerHelper("magicTime", function (arg1, arg2) {
    if (typeof arg1 === "undefined") {
      // catch undefined / empty
      return "";
    }
    // Handlebars appends an ubject to the arguments
    if (arguments.length === 1) {
      // magicTime
      return dateFormat(new Date(), "yyyy-mm-dd HH:MM");
    } else if (arguments.length === 2) {
      // check if arg1 is a valid date
      if (isValidDate(arg1)) {
        // magicTime datePublished
        return dateFormat(new Date(arg1), "yyyy-mm-dd HH:MM");
      }
      if (arg1.trim().startsWith("PT")) {
        // magicTime PT1H50M
        return arg1
          .trim()
          .replace("PT", "")
          .replace("H", "h ")
          .replace("M", "m ")
          .replace("S", "s ")
          .trim();
      }
      try {
        // magicTime "dd-mm-yyyy HH:MM"
        return dateFormat(new Date(), arg1);
      } catch (e) {
        console.log(e);
        return "";
      }
    } else if (arguments.length === 3) {
      // magicTime datePublished "dd-mm-yyyy HH:MM"
      if (isValidDate(arg1)) {
        return dateFormat(new Date(arg1), arg2);
      }
      // Invalid input
      return "Error in template or source";
    } else {
      // Unexpected amount of arguments
      return "Error in template";
    }
  });

  // see: /obsidian-recipe-grabber/issues/39
  handlebars.registerHelper("any", function (...args: any[]): boolean {
    return args.some((arg) => Boolean(arg));
  });

  handlebars.registerHelper("all", function (...args: any[]): boolean {
    return args.every((arg) => Boolean(arg));
  });

  return handlebars;
};
