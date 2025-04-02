const { parentPort } = require('worker_threads');
const { loadFile } = require('./document/reader');
const { embed } = require('./embedding');
const path = require('path');

// Listen for messages from the main thread
parentPort.on('message', async (message) => {
  try {
    const filePath = typeof message === 'string' ? message : message.filePath;
    const parserSettings = typeof message === 'object' ? message.parserSettings : null;
    console.log(`Worker processing file: ${filePath}`);
    
    // Use the parser settings when loading the file
    const loadedFile = await loadFile(filePath, parserSettings);
    
    console.log("Generating embeddings...");
    const embeddings = await embed(loadedFile.data);
    console.log("Embeddings generated");
    
    // Send success message with embeddings back to main process
    parentPort.postMessage({ 
      success: true, 
      embeddings,
      documentName: path.basename(filePath)
    });
  } catch (err) {
    console.error('Worker error:', err);
    parentPort.postMessage({ success: false, content: err.message });
  }
});
