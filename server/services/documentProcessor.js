const fs = require("fs").promises;
const path = require("path");
const pdf = require("pdf-parse");

class DocumentProcessor {
  constructor() {
    this.aiService = null;
    console.log("📄 DocumentProcessor initialized");
    this.supportedTypes = {
      "image/jpeg": "image",
      "image/png": "image",
      "image/jpg": "image",
      "application/pdf": "pdf",
      "text/plain": "text",
    };
  }

  setOllamaService(ollamaService) {
    this.ollamaService = ollamaService;
    console.log("🔗 DocumentProcessor connected to Ollama service");
  }

  setAIService(aiService) {
    this.aiService = aiService;
    console.log("🔗 DocumentProcessor connected to AI service");
  }

  isImageType(mimeType) {
    return this.supportedTypes[mimeType] === "image";
  }

  async processDocument(filePath, mimeType) {
    console.log(`- DocumentProcessor: Processing ${path.basename(filePath)} (${mimeType})`);
    switch (this.supportedTypes[mimeType]) {
      case "image":
        // Images are now only processed with vision models
        throw new Error("Images should be processed with vision models only. Use getImageAnalysis() instead.");
      case "pdf":
        return this.processPdf(filePath);
      case "text":
        return this.processTextFile(filePath);
      default:
        console.warn(`- DocumentProcessor: Unsupported file type: ${mimeType}`);
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  async getImageAnalysis(imagePath, documentType) {
    if (!this.aiService) {
      throw new Error("AI service is not connected to DocumentProcessor");
    }
    console.log(`👁️ DocumentProcessor: Processing image with vision model: ${path.basename(imagePath)}`);
    // This calls the AI service's vision capability
    return this.aiService.analyzeDocumentWithVision(imagePath, documentType);
  }

  async processPdf(filePath) {
    try {
      console.log(`- DocumentProcessor: Extracting text from PDF: ${path.basename(filePath)}`);
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      const cleanedText = this.cleanExtractedText(data.text);
      console.log(`- DocumentProcessor: Extracted ${cleanedText.length} characters from PDF`);
      return cleanedText;
    } catch (error) {
      console.error("- DocumentProcessor: Error processing PDF:", error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  async processTextFile(textPath) {
    try {
      console.log(`- DocumentProcessor: Reading text file: ${path.basename(textPath)}`);
      const text = await fs.readFile(textPath, "utf8");
      return this.cleanExtractedText(text);
    } catch (error) {
      console.error("- DocumentProcessor: Error processing text file:", error);
      throw new Error(`Failed to process text file: ${error.message}`);
    }
  }

  cleanExtractedText(text) {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }
}

module.exports = { DocumentProcessor };
