// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Here, we use the `contextBridge` Electron API to expose a custom API to the renderer process.
// This API allows the renderer process to invoke events in the main process which interact with the operating system.

contextBridge.exposeInMainWorld("electronAPI", {
  // Send a chat message to the Ollama server
  sendChat: (message) => ipcRenderer.send("chat:send", message),
  // Listen for chat replies from the Ollama server
  onChatReply: (callback) => {
    ipcRenderer.on("chat:reply", (event, data) => callback(event, data));
  },
  // Serve the Ollama server
  serveOllama: () => ipcRenderer.send("ollama:serve"),
  // Listen for Ollama serve status
  onOllamaServe: (callback) => {
    ipcRenderer.on("ollama:serve", (event, data) => callback(event, data));
  },
  // Run the Ollama model
  runOllama: () => ipcRenderer.send("ollama:run"),
  // Listen for Ollama run status
  onOllamaRun: (callback) => {
    ipcRenderer.on("ollama:run", (event, data) => callback(event, data));
  },
  // Load a document via the file dialog
  loadDocument: () => {
    console.log("loadDocument called in preload");
    ipcRenderer.send("doc:load");
  },
  // Listen for document load status
  onDocumentLoaded: (callback) => {
    ipcRenderer.on("document-content", (event, ...args) => callback(...args));
  },
  // Stop the current chat
  stopChat: () => ipcRenderer.send("chat:stop"),
  // Get the current model
  getModel: () => ipcRenderer.send("model:get"),
  // Listen for model get status
  onModelGet: (callback) => {
    ipcRenderer.on("model:get", (event, data) => callback(event, data));
  },
  // Set the model
  setModel: (model) => ipcRenderer.send("model:set", model),
  // Get parser settings from localStorage
  getParserSettings: () => {
    const settings = localStorage.getItem('parserSettings');
    return settings ? JSON.parse(settings) : null;
  },
  // Set parser settings for document loading
  setParserSettings: (settings) => ipcRenderer.send("parser:settings", settings),
  // Listen for embeddings stored event
  onEmbeddingsStored: (callback) => {
    ipcRenderer.on("doc:embeddings-stored", (event) => callback(event));
  },
});
