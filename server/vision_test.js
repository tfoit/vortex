const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { OllamaService } = require("./services/ollamaService.js");

async function testImageAnalysis() {
  const imagePath = path.join(__dirname, "uploads", "document-1751028189182-635702823.jpeg");
  if (!fs.existsSync(imagePath)) {
    console.error("Error: Image file not found at " + imagePath);
    return;
  }

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    console.log("Testing vision analysis on John Smith note (" + imagePath + ")...");
    console.log("Image size: " + imageBuffer.length + " bytes");

    const ollamaService = new OllamaService();
    const prompt = ollamaService.createVisionAnalysisPrompt("Handwritten Notes");

    const response = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "qwen2.5vl:latest",
        prompt: prompt,
        images: [base64Image],
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_predict: 2500,
        },
      },
      {
        timeout: 180000,
        family: 4,
      }
    );

    console.log("--- Vision Model Raw Response ---");
    console.log(response.data.response);
    console.log("--- End of Response ---");
  } catch (error) {
    console.error("--- Error during vision analysis ---");
    console.error("Error Message:", error.message);
    if (error.response) {
      console.error("Response Status:", error.response.status);
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
    }
    console.error("--- End of Error ---");
  }
}

testImageAnalysis();
