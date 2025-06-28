const fs = require("fs").promises;
const path = require("path");
const Tesseract = require("tesseract.js");
const pdf = require("pdf-parse");

class DocumentProcessor {
  constructor(aiService) {
    this.aiService = aiService;
    console.log("📄 DocumentProcessor initialized");
    if (this.aiService) {
      console.log("🔗 DocumentProcessor connected to AI service");
    } else {
      console.warn("⚠️ DocumentProcessor initialized WITHOUT AI service");
    }
    this.supportedTypes = {
      "image/jpeg": "image",
      "image/png": "image",
      "image/jpg": "image",
      "application/pdf": "pdf",
      "text/plain": "text",
    };
  }

  isImageType(mimeType) {
    return this.supportedTypes[mimeType] === "image";
  }

  async processDocument(filePath, mimeType) {
    console.log(`- DocumentProcessor: Processing ${path.basename(filePath)} (${mimeType})`);
    switch (this.supportedTypes[mimeType]) {
      case "image":
        return this.processImage(filePath);
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
    // This now correctly calls the AI service's vision capability
    return this.aiService.analyzeDocumentWithVision(imagePath, documentType);
  }

  async processImage(imagePath) {
    try {
      console.log(`- DocumentProcessor: Extracting text from image: ${path.basename(imagePath)}`);
      const {
        data: { text },
      } = await Tesseract.recognize(imagePath, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      process.stdout.write("\rOCR Progress: 100%\n");
      return this.cleanExtractedText(text);
    } catch (error) {
      console.error("- DocumentProcessor: Error processing image with Tesseract:", error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
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
