#!/usr/bin/env node

const axios = require("axios");

console.log("🔍 Checking available Ollama models...\n");

async function checkOllamaModels() {
  try {
    console.log("🔗 Connecting to Ollama API...");
    const response = await axios.get("http://127.0.0.1:11434/api/tags", {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
      family: 4, // Force IPv4
    });
    console.log("✅ Connected to Ollama API successfully");

    const models = response.data.models || [];
    const modelNames = models.map((model) => model.name);

    console.log("✅ Ollama is running!");
    console.log(`📋 Found ${models.length} models installed:\n`);

    // Show all models
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name} (${Math.round((model.size / 1024 / 1024 / 1024) * 100) / 100} GB)`);
    });

    console.log("\n👁️  Vision Models Analysis:");
    console.log("═".repeat(50));

    // Check for vision models
    const visionModels = ["qwen2.5vl:latest", "llava:latest", "llava:13b", "llava:7b", "bakllava:latest", "llava-llama3:latest", "llava-phi3:latest"];

    const availableVisionModels = [];
    const missingVisionModels = [];

    visionModels.forEach((visionModel) => {
      if (modelNames.includes(visionModel)) {
        availableVisionModels.push(visionModel);
        console.log(`✅ ${visionModel} - AVAILABLE`);
      } else {
        missingVisionModels.push(visionModel);
        console.log(`❌ ${visionModel} - NOT INSTALLED`);
      }
    });

    console.log("\n🚀 Recommendations for M1 Max MacBook Pro:");
    console.log("═".repeat(50));

    if (availableVisionModels.length > 0) {
      console.log("🎉 Great! You have these vision models ready:");
      availableVisionModels.forEach((model) => {
        console.log(`   • ${model}`);
      });
      console.log("\n✨ Your system should work with the fallback mechanism!");
    } else {
      console.log("⚠️  No vision models found. Here are the best options for M1 Max:");
      console.log("\n🥇 RECOMMENDED (Best for M1 Max):");
      console.log("   ollama pull llava:latest");
      console.log("   # Fast, reliable, works great on M1 Max");

      console.log("\n🥈 ALTERNATIVE OPTIONS:");
      console.log("   ollama pull llava:13b");
      console.log("   # Better quality but slower");

      console.log("   ollama pull bakllava:latest");
      console.log("   # Good alternative to llava");

      console.log("   ollama pull llava-llama3:latest");
      console.log("   # Latest version with improved performance");
    }

    console.log("\n📖 Usage Instructions:");
    console.log("═".repeat(50));
    console.log("1. Install a vision model using one of the commands above");
    console.log("2. Restart your Vortex application");
    console.log("3. The system will automatically detect and use the best available model");
    console.log("\n💡 TIP: llava:latest is the most tested and reliable option for M1 Max");
  } catch (error) {
    console.error("❌ Error checking Ollama models:");

    if (error.code === "ECONNREFUSED") {
      console.error("🔴 Ollama is not running or not accessible at http://localhost:11434");
      console.error("\n🔧 Solutions:");
      console.error("1. Make sure Ollama is installed: https://ollama.ai");
      console.error("2. Start Ollama service: ollama serve");
      console.error("3. Check if running: curl http://localhost:11434/api/tags");
    } else {
      console.error("Error details:", error.message);
    }
  }
}

checkOllamaModels();
