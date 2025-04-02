const path = require("path");
const pdf2md = require('@opendocsg/pdf2md');

// Add polyfill for DOMMatrix which is required by PDF.js but not available in Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(matrix) {
      if (matrix) {
        this.a = matrix[0] || 1;
        this.b = matrix[1] || 0;
        this.c = matrix[2] || 0;
        this.d = matrix[3] || 1;
        this.e = matrix[4] || 0;
        this.f = matrix[5] || 0;
      } else {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
      }
    }

    translate(x, y) {
      this.e += x;
      this.f += y;
      return this;
    }
    
    scale(x, y) {
      this.a *= x;
      this.d *= y || x;
      return this;
    }
    
    multiply(matrix) {
      const a = this.a * matrix.a + this.c * matrix.b;
      const b = this.b * matrix.a + this.d * matrix.b;
      const c = this.a * matrix.c + this.c * matrix.d;
      const d = this.b * matrix.c + this.d * matrix.d;
      const e = this.a * matrix.e + this.c * matrix.f + this.e;
      const f = this.b * matrix.e + this.d * matrix.f + this.f;
      
      this.a = a;
      this.b = b;
      this.c = c;
      this.d = d;
      this.e = e;
      this.f = f;
      
      return this;
    }
    
    inverse() {
      const det = this.a * this.d - this.b * this.c;
      
      const result = new DOMMatrix();
      result.a = this.d / det;
      result.b = -this.b / det;
      result.c = -this.c / det;
      result.d = this.a / det;
      result.e = (this.c * this.f - this.d * this.e) / det;
      result.f = (this.b * this.e - this.a * this.f) / det;
      
      return result;
    }
  };
}

// Also polyfill DOMMatrixReadOnly which might be used by PDF.js
if (typeof globalThis.DOMMatrixReadOnly === 'undefined') {
  globalThis.DOMMatrixReadOnly = globalThis.DOMMatrix;
}

// Add polyfill for Promise.withResolvers which is used by newer PDF.js versions
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Dynamically import pdfjs as it's an ES Module, but use the legacy build
let pdfjs;
const { removeCitations, removeHyperlinks, preserveDocumentContext, splitText } = require("./clean");

async function parsePdf(filePath) {
  try {
    // Import pdfjs dynamically if not already loaded, using legacy build for Node.js
    if (!pdfjs) {
      try {
        const pdf = await import('pdfjs-dist/legacy/build/pdf.js');
        pdfjs = pdf;
      } catch (e) {
        // Fallback to regular build if legacy not available
        console.warn("Legacy PDF.js build not available, trying standard build:", e);
        const pdf = await import('pdfjs-dist/build/pdf.mjs');
        pdfjs = pdf;
      }
    }
    
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

async function parsePdfByPage(filePath) {
  try {
    // Import pdfjs dynamically if not already loaded
    if (!pdfjs) {
      const pdf = await import('pdfjs-dist/build/pdf.mjs');
      pdfjs = pdf;
    }
    
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
    // Import pdfjs dynamically if not already loaded
    if (!pdfjs) {
      const pdf = await import('pdfjs-dist/build/pdf.mjs');
      pdfjs = pdf;
    }
    
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
