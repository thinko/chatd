const path = require("path");
const pdf2md = require('@opendocsg/pdf2md');
const { pdfjs } = require("./pdfjs-dist/legacy/build/pdf");
const { removeCitations, removeHyperlinks, preserveDocumentContext, splitText } = require("./clean");

async function parsePdf(filePath) {
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
    return {
      fileName,
      data: preserveDocumentContext([{
        section: simpleName,
        content: splitText(cleanContent),
      }], filePath)
    };
  } catch (error) {
    console.error("Failed to parse PDF:", error);
    throw error;
  }
}

// Parse PDF by page (renamed from parsePdfDirect)
async function parsePdfByPage(filePath) {
  try {
    const data = new Uint8Array(await require("fs").promises.readFile(filePath));
    const loadingTask = pdfjs.getDocument({ data });
    const doc = await loadingTask.promise;
    const numPages = doc.numPages;
    
    // Create an array to hold all sections (one per page)
    const sections = [];
    
    // Process each page as a separate section
    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map((item) => item.str);
      const pageContent = strings.join(" ");
      const cleanContent = removeHyperlinks(removeCitations(pageContent));
      
      // Add page as a section
      sections.push({
        section: `Page ${i}`,
        content: splitText(cleanContent),
      });
    }

    // Return the file name and the page sections
    return {
      fileName: path.basename(filePath),
      data: preserveDocumentContext(sections, filePath)
    };
  } catch (error) {
    console.error("Failed to parse PDF by page:", error);
    throw error;
  }
}

// Parse PDF as Markdown using the pdf-to-markdown library
async function parsePdfAsMd(filePath) {
  try {
    // Use pdf2md to convert the PDF file to Markdown
    const markdown = await pdf2md(filePath);
    
    // Clean the markdown content
    const cleanContent = removeHyperlinks(removeCitations(markdown));
    
    const fileName = path.basename(filePath);
    const simpleName = path.parse(fileName).name;
    
    // Parse the sections from the markdown content
    const sections = [];
    let currentSection = { section: simpleName, content: [] };
    
    // Split into lines and process each line
    const lines = cleanContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a header
      if (line.startsWith('#')) {
        // If we already have content in the current section, add it to sections
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        
        // Start a new section with this header as the title
        const headerText = line.replace(/^#+\s+/, '').trim();
        currentSection = { section: headerText, content: [] };
      } 
      // Add content to the current section
      else if (line.length > 0) {
        currentSection.content = currentSection.content.concat(splitText(line));
      }
    }
    
    // Add the last section if it has content
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    return {
      fileName,
      data: preserveDocumentContext(sections, filePath)
    };
  } catch (error) {
    console.error("Failed to parse PDF as Markdown:", error);
    console.error("Attempting fallback method...");
    // Fallback to the custom implementation if the library fails
    return fallbackPdfAsMd(filePath);
  }
}

// Fallback implementation if the library fails
async function fallbackPdfAsMd(filePath) {
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

    // First convert to plain text
    const pdfContent = allPageStrings.join("\n");
    
    // Convert to markdown format by adding headers, etc.
    const fileName = path.basename(filePath);
    const simpleName = path.parse(fileName).name;
    
    // Start with a title header
    let markdown = `# ${simpleName}\n\n`;
    
    // Split text into paragraphs and add markdown formatting
    const paragraphs = pdfContent.split("\n\n");
    for (let i = 0; i < paragraphs.length; i++) {
      const trimmedParagraph = paragraphs[i].trim();
      if (trimmedParagraph) {
        // Check if this might be a header (shorter, ends with no period)
        if (trimmedParagraph.length < 100 && !trimmedParagraph.endsWith('.')) {
          markdown += `## ${trimmedParagraph}\n\n`;
        } else {
          markdown += `${trimmedParagraph}\n\n`;
        }
      }
    }
    
    // Clean the markdown content
    const cleanContent = removeHyperlinks(removeCitations(markdown));
    
    // Parse the sections from the markdown content
    const sections = [];
    let currentSection = { section: simpleName, content: [] };
    
    // Split into lines and process each line
    const lines = cleanContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a header
      if (line.startsWith('#')) {
        // If we already have content in the current section, add it to sections
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        
        // Start a new section with this header as the title
        const headerText = line.replace(/^#+\s+/, '').trim();
        currentSection = { section: headerText, content: [] };
      } 
      // Add content to the current section
      else if (line.length > 0) {
        currentSection.content = currentSection.content.concat(splitText(line));
      }
    }
    
    // Add the last section if it has content
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    return {
      fileName,
      data: preserveDocumentContext(sections, filePath)
    };
  } catch (error) {
    console.error("Failed to parse PDF with fallback method:", error);
    throw error;
  }
}

module.exports = {
  parsePdf,
  parsePdfByPage,
  parsePdfAsMd,
};
