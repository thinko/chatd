// This file contains all the logic for loading the model and creating embeddings.

class ExtractorPipeline {
  static task = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2"; // if you want to use a different model, change the vector size in the vector store
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Dynamically import the Transformers.js library
      let { pipeline, env } = await import("@xenova/transformers");
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

// The embed function is used by the `doc:load` event handler.
async function embed(doc) {
  // Load the model
  const extractor = await ExtractorPipeline.getInstance();
  
  // Extract the embeddings
  let embeddings = [];
  let promiseArray = [];
  
  // Check document format and process accordingly
  if (doc && typeof doc === 'object') {
    // Case 1: doc is the array itself (as shown in the error)
    if (Array.isArray(doc) && doc.length > 0 && doc[0].section && Array.isArray(doc[0].content)) {
      for (const section of doc) {
        if (Array.isArray(section.content)) {
          for (const line of section.content) {
            if (typeof line === 'string' && line.trim()) {
              const promise = extractor(line, {
                pooling: "mean",
                normalize: true,
              }).then((output) => {
                embeddings.push({
                  content: line,
                  embedding: Array.from(output.data),
                  section: section.section // Include section info
                });
              });
              promiseArray.push(promise);
            }
          }
        }
      }
    }
    // Case 2: doc.data is the array with sections
    else if (Array.isArray(doc.data) && doc.data.length > 0) {
      // Check if the first item has section and content properties
      if (doc.data[0] && doc.data[0].section && Array.isArray(doc.data[0].content)) {
        for (const section of doc.data) {
          if (Array.isArray(section.content)) {
            for (const line of section.content) {
              if (typeof line === 'string' && line.trim()) {
                const promise = extractor(line, {
                  pooling: "mean",
                  normalize: true,
                }).then((output) => {
                  embeddings.push({
                    content: line,
                    embedding: Array.from(output.data),
                    section: section.section
                  });
                });
                promiseArray.push(promise);
              }
            }
          }
        }
      }
      // Original array format with content arrays
      else {
        doc.data.forEach((data) => {
          if (data && data.content && Array.isArray(data.content)) {
            data.content.forEach((line) => {
              if (typeof line === 'string' && line.trim()) {
                const promise = extractor(line, {
                  pooling: "mean",
                  normalize: true,
                }).then((output) => {
                  embeddings.push({
                    content: line,
                    embedding: Array.from(output.data),
                  });
                });
                promiseArray.push(promise);
              }
            });
          } else if (data && typeof data.content === 'string' && data.content.trim()) {
            const promise = extractor(data.content, {
              pooling: "mean",
              normalize: true,
            }).then((output) => {
              embeddings.push({
                content: data.content,
                embedding: Array.from(output.data),
              });
            });
            promiseArray.push(promise);
          }
        });
      }
    }
    // Case 3: doc.data is a string
    else if (typeof doc.data === 'string' && doc.data.trim()) {
      const promise = extractor(doc.data, {
        pooling: "mean",
        normalize: true,
      }).then((output) => {
        embeddings.push({
          content: doc.data,
          embedding: Array.from(output.data),
        });
      });
      promiseArray.push(promise);
    }
    // Case 4: doc.data is a JSON object
    else if (doc.data && typeof doc.data === 'object' && !Array.isArray(doc.data)) {
      const jsonString = JSON.stringify(doc.data);
      const promise = extractor(jsonString, {
        pooling: "mean",
        normalize: true,
      }).then((output) => {
        embeddings.push({
          content: jsonString,
          embedding: Array.from(output.data),
        });
      });
      promiseArray.push(promise);
    } else {
      console.error('Unsupported document format', doc);
    }
  } else {
    console.error('Invalid document format: doc is not an object', doc);
  }

  // Wait for all promises to resolve
  await Promise.all(promiseArray);
  return embeddings;
}

module.exports = {
  embed,
};
