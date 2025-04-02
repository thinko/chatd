const mammoth = require("mammoth");
const { removeCitations, removeHyperlinks, preserveDocumentContext } = require("./clean");
const { extractSectionsAndContent } = require('./html');

async function parseDocx(docx, documentPath) {
  let doc = await mammoth.convertToHtml({ buffer: docx });

  if (!doc.value) {
    return []
  }

  let html = removeCitations(doc.value);
  html = removeHyperlinks(html);

  const sections = extractSectionsAndContent(html);
  return preserveDocumentContext(sections, documentPath);
}

module.exports = {
  parseDocx,
};
