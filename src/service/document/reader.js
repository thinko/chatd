const path = require("path");
const fs = require("fs").promises;
const { parsePdf, parsePdfByPage, parsePdfAsMd } = require("./parse/pdf");
const { parseMd, parseMdToHtml } = require("./parse/md");
const { parseOdt } = require("./parse/odt");
const { parseTxt, parseTxtNew } = require("./parse/txt");
const { parseDocx } = require("./parse/docx"); 
const { parseHtml } = require("./parse/html");

/**
 * Load and parse a file, using the parser specified in settings if applicable
 * @param {string} filePath - Path to the file to load
 * @param {Object} parserSettings - Optional user's parser settings
 * @returns {Object} - Object containing the file name and parsed data
 */
async function loadFile(filePath, parserSettings = null) {
  try {
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
        // Check if we have specific parser settings for Markdown
        if (parserSettings?.mdParser === "parseMdToHtml") {
          return {
            fileName: path.basename(filePath),
            data: parseMdToHtml(markdown, filePath),
          };
        } else {
          return {
            fileName: path.basename(filePath),
            data: parseMd(markdown),
          };
        }
        
      case ".odt":
        return {
          fileName: path.basename(filePath),
          data: await parseOdt(filePath),
        };
        
      case ".pdf":
        // Check if we have specific parser settings for PDF
        if (parserSettings?.pdfParser === "parsePdfByPage") {
          return await parsePdfByPage(filePath);
        } else if (parserSettings?.pdfParser === "parsePdfAsMd") {
          return await parsePdfAsMd(filePath);
        } else {
          return await parsePdf(filePath);
        }
        
      case ".html":
      case ".xhtml":
      case ".htm":
        let htmlContent = await fs.readFile(filePath, "utf-8");
        return {
          fileName: path.basename(filePath),
          data: await parseHtml(htmlContent, filePath),
        };
        
      default:
        // Text files or unknown extensions
        let rawText = await fs.readFile(filePath, "utf-8");
        // Check if we have specific parser settings for TXT
        if (parserSettings?.txtParser === "parseTxtNew") {
          // Use alternative TXT parser when implemented
          return {
            fileName: path.basename(filePath),
            data: parseTxtNew(rawText, filePath),
          };
        } else {
          return {
            fileName: path.basename(filePath),
            data: parseTxt(rawText, filePath),
          };
        }
    }
  } catch (error) {
    console.error("Error loading document:", error);
    throw error;
  }
}

module.exports = {
  loadFile,
};
