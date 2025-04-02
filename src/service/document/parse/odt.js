const odt2html = require('odt2html');
const { removeCitations, removeHyperlinks, preserveDocumentContext } = require("./clean");
const { extractSectionsAndContent } = require('./html');
const { error } = require("../../logger.js");

async function parseOdt(odtFilePath) {
  try {
    let html = await odt2html.toHTML({ path: odtFilePath });

    if (!html || !html.value) {
      return [];
    }

    html = removeCitations(html.value); // Ensure .value is used correctly
    html = removeHyperlinks(html.value);

    const sections = extractSectionsAndContent(html);
    return preserveDocumentContext(sections, odtFilePath);
  } catch (err) {
    error("Error parsing ODT file:", err);
    return [];
  }
}

module.exports = {
  parseOdt,
};
