const path = require("path");
const fs = require("fs").promises;
const pdf2md = require('@opendocsg/pdf2md');
const { parseMd } = require("./md");
const { pdfjs } = require("./pdfjs-dist/legacy/build/pdf");
const { removeCitations, removeHyperlinks, preserveDocumentContext } = require("./clean");

async function parsePdf(filePath) {
  const pdfBuffer = await fs.readFile(filePath);
  const md = await pdf2md(pdfBuffer);
  return {
    fileName: path.basename(filePath),
    data: parseMd(md),
  };
}

async function parsePdfDirect(filePath) {
  try {
    const data = new Uint8Array(await require("fs").promises.readFile(filePath));
    const loadingTask = pdfjs.getDocument({ data });
    const doc = await loadingTask.promise;
    const numPages = doc.numPages;
    const allPageStrings = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map((item) => item.str);
      allPageStrings.push(strings.join(" "));
    }

    const pdfContent = allPageStrings.join("\n");
    const cleanContent = removeHyperlinks(removeCitations(pdfContent));

    const fileName = path.basename(filePath);
    const simpleName = path.parse(fileName).name;

    // Return the file name and the content as a section
    return preserveDocumentContext([{
      section: simpleName,
      content: cleanContent,
    }], filePath);
  } catch (error) {
    console.error("Failed to parse PDF:", error);
    return [];
  }
}

module.exports = {
  parsePdf,
  parsePdfDirect,
};
