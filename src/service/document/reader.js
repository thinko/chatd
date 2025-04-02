const path = require("path");
const fs = require("fs").promises;
const { parsePdf } = require("./parse/pdf");
const { parseMd, parseMdToHtml } = require("./parse/md");
const { parseOdt } = require("./parse/odt");
const { parseTxt } = require("./parse/txt");
const { parseDocx } = require("./parse/docx"); 
const { parseHtml } = require("./parse/html");

async function loadFile(filePath) {
  const fileExtension = path.extname(filePath).toLowerCase();

  switch (fileExtension) {
    case ".docx":
      const docx = await fs.readFile(filePath);
      return {
        fileName: path.basename(filePath),
        data: await parseDocx(docx, filePath),
      };
    case ".md":
      let markdown = await fs.readFile(filePath, "utf-8");
      return {
        fileName: path.basename(filePath),
        data: parseMd(markdown, filePath),
      };
    case ".odt":
      return {
        fileName: path.basename(filePath),
        data: await parseOdt(filePath),
      };
    case ".pdf":
      return await parsePdf(filePath);
    case ".html":
    case ".xhtml":
    case ".htm":
      let htmlContent = await fs.readFile(filePath, "utf-8");
      return {
        fileName: path.basename(filePath),
        data: await parseHtml(htmlContent, filePath),
      };
    default:
      // just try to parse it as a text file
      let rawText = await fs.readFile(filePath, "utf-8");
      return {
        fileName: path.basename(filePath),
        data: parseTxt(rawText, filePath),
      };
  }
}

module.exports = {
  loadFile,
};
