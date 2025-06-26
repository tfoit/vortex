const fs = require("fs").promises;
const path = require("path");
const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");

class DocumentProcessor {
  constructor() {
    this.supportedTypes = {
      "image/jpeg": "image",
      "image/jpg": "image",
      "image/png": "image",
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "text/plain": "text",
      "text/txt": "text",
    };
  }

  async processDocument(filePath, mimeType) {
    const type = this.supportedTypes[mimeType];

    if (!type) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    console.log(`🔍 Processing ${type} document: ${path.basename(filePath)}`);

    switch (type) {
      case "image":
        return await this.processImage(filePath);
      case "pdf":
        return await this.processPDF(filePath);
      case "doc":
      case "docx":
        return await this.processWordDocument(filePath);
      case "text":
        return await this.processTextFile(filePath);
      default:
        throw new Error(`Processing not implemented for type: ${type}`);
    }
  }

  async processImage(imagePath) {
    try {
      console.log(`📸 Running OCR on image: ${path.basename(imagePath)}`);

      // Perform OCR directly on the original image
      const {
        data: { text },
      } = await Tesseract.recognize(imagePath, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const cleanedText = this.cleanExtractedText(text);
      console.log(`✅ OCR completed. Extracted ${cleanedText.length} characters`);

      return cleanedText;
    } catch (error) {
      console.error("Error processing image:", error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  async processPDF(pdfPath) {
    try {
      console.log(`📄 Extracting text from PDF: ${path.basename(pdfPath)}`);

      const dataBuffer = await fs.readFile(pdfPath);
      const data = await pdfParse(dataBuffer);

      const cleanedText = this.cleanExtractedText(data.text);
      console.log(`✅ PDF processed. Extracted ${cleanedText.length} characters from ${data.numpages} pages`);

      return cleanedText;
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  async processTextFile(textPath) {
    try {
      console.log(`📝 Reading text file: ${path.basename(textPath)}`);

      const text = await fs.readFile(textPath, "utf8");
      const cleanedText = this.cleanExtractedText(text);

      console.log(`✅ Text file processed. Read ${cleanedText.length} characters`);
      return cleanedText;
    } catch (error) {
      console.error("Error processing text file:", error);
      throw new Error(`Failed to process text file: ${error.message}`);
    }
  }

  async processWordDocument(docPath) {
    // For now, return a placeholder - in production you'd use mammoth or similar
    console.log(`📝 Word document processing not fully implemented: ${path.basename(docPath)}`);
    return "Word document processing is not yet implemented in this POC. Please convert to PDF or use image capture.";
  }

  cleanExtractedText(text) {
    if (!text) return "";

    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, " ")
        // Remove special characters that might interfere with processing
        .replace(/[^\w\s\-.,!?:;()\[\]{}'"@#$%&*+=<>\/\\|`~]/g, "")
        // Trim and normalize
        .trim()
    );
  }

  async validateDocument(filePath, mimeType) {
    try {
      const stats = await fs.stat(filePath);
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (stats.size > maxSize) {
        throw new Error("File size exceeds 10MB limit");
      }

      if (!this.supportedTypes[mimeType]) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Document validation failed: ${error.message}`);
    }
  }

  getSupportedFormats() {
    return Object.keys(this.supportedTypes);
  }
}

module.exports = { DocumentProcessor };
