const { parentPort } = require('worker_threads');
const { loadFile } = require('../document/reader');
const { embed } = require('../embedding');
const path = require('path');

// Listen for messages from the main thread
parentPort.on('message', async (message) => {
  try {
    const { filePath, parserSettings } = message;
    console.log(`Worker processing file: ${filePath}`);
    
    // Use the parser settings when loading the file
    const loadedFile = await loadFile(filePath, parserSettings);
    
    console.log("Generating embeddings...");
    const embeddings = await embed(loadedFile.data);
    console.log("Embeddings generated");
    
    parentPort.postMessage({ success: true, embeddings });
  } catch (err) {
    console.error('Worker error:', err);
    parentPort.postMessage({ success: false, content: err.message });
  }
});
