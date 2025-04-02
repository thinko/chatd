const marked = require("marked");
const { splitText, removeCitations, removeHyperlinks, preserveDocumentContext } = require("./clean");
const { extractSectionsAndContent } = require("./html");

// Original parsing function
function parseMd(markdownText) {
  const sections = [];
  const lines = markdownText.split("\n");

  // the header and text of each section
  let header = null;
  let text = "";

  lines.forEach((line) => {
    const isHeader = line.match(/^#+\s/);
    if (isHeader) {
      if (header !== null) {
        if (text === "") {
          // found a section with no text
          return;
        }
        sections.push({
          section: header,
          content: splitText(text),
        });
      }

      header = line.replace(/#/g, "").trim();
      text = ""; // begin searching for text
    } else {
      text += line + "\n";
    }
  });

  if (header !== null) {
    sections.push({
      section: header,
      content: splitText(text),
    });
  }

  return sections;
}

// New function with document path support
function parseMdToHtml(markdown, documentPath) {
  // Convert markdown to HTML using marked
  const html = marked.parse(markdown);
  
  // Clean the HTML content by removing citations and hyperlinks
  let cleanedHtml = removeCitations(html);
  cleanedHtml = removeHyperlinks(cleanedHtml);
  
  // Extract sections and content from the HTML
  const sections = extractSectionsAndContent(cleanedHtml);
  
  // Preserve document context if documentPath is provided
  return preserveDocumentContext(sections, documentPath);
}

module.exports = {
  parseMd,
  parseMdToHtml,
};
