const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.defaultModel = process.env.OLLAMA_MODEL || "qwen:7b";
    this.visionModel = process.env.OLLAMA_VISION_MODEL || "qwen:7b";
    this.timeout = 120000; // 2 minutes for vision processing

    // Fallback vision models for M1 Max MacBook Pro (in order of preference)
    this.fallbackVisionModels = ["llava:latest", "llava:13b", "llava:7b", "bakllava:latest", "llava-llama3:latest", "llava-phi3:latest"];

    this.currentVisionModel = this.visionModel;

    console.log(`🦙 Ollama service initialized with model: ${this.defaultModel}`);
    console.log(`👁️ Primary vision model: ${this.visionModel}`);
    console.log(`🔄 Fallback vision models available: ${this.fallbackVisionModels.join(", ")}`);
  }

  async isAvailable() {
    try {
      console.log(`🔍 Checking Ollama availability at: ${this.baseURL}`);
      const response = await axios.get(`${this.baseURL}/api/tags`, {
        timeout: 5000,
        family: 4, // Force IPv4
      });
      console.log("✅ Ollama is available and responding");
      return response.status === 200;
    } catch (error) {
      console.log("🔍 Ollama not available:", error.message);
      console.log(`🔍 Attempted connection to: ${this.baseURL}`);
      return false;
    }
  }

  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, {
        timeout: 5000,
        family: 4, // Force IPv4
      });
      return response.data.models || [];
    } catch (error) {
      console.error("Error fetching Ollama models:", error.message);
      return [];
    }
  }

  async findBestVisionModel() {
    try {
      const availableModels = await this.getAvailableModels();
      const modelNames = availableModels.map((model) => model.name);

      console.log(`🔍 Available Ollama models: ${modelNames.join(", ")}`);

      // First try the primary vision model
      if (modelNames.includes(this.visionModel)) {
        console.log(`✅ Primary vision model ${this.visionModel} is available`);
        this.currentVisionModel = this.visionModel;
        return this.visionModel;
      }

      // Try fallback models in order of preference
      for (const fallbackModel of this.fallbackVisionModels) {
        if (modelNames.includes(fallbackModel)) {
          console.log(`🔄 Using fallback vision model: ${fallbackModel}`);
          this.currentVisionModel = fallbackModel;
          return fallbackModel;
        }
      }

      console.error("❌ No suitable vision model found!");
      throw new Error("No vision model available. Please install one of: " + this.fallbackVisionModels.join(", "));
    } catch (error) {
      console.error("Error finding vision model:", error.message);
      throw error;
    }
  }

  async extractTextFromImage(imagePath) {
    try {
      console.log(`👁️ Starting vision-based text extraction from: ${path.basename(imagePath)}`);

      // Find the best available vision model
      const modelToUse = await this.findBestVisionModel();
      console.log(`🤖 Using vision model: ${modelToUse}`);

      // Read image file and convert to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString("base64");

      console.log(`📸 Image loaded, size: ${imageBuffer.length} bytes`);

      // Optimize prompt based on model size
      const isSmallModel = modelToUse.includes("qwen:7b") || modelToUse.includes("llava:7b") || modelToUse.includes("phi3");

      const prompt = isSmallModel
        ? `Look at this image. Read every word you see. Write down ALL text exactly as shown. Include names, numbers, dates, and all words. Be very careful and accurate.`
        : `Please extract all text from this image. Focus on accuracy and preserve the original formatting as much as possible. If the image contains handwritten text, do your best to transcribe it. If there are tables, lists, or structured content, maintain that structure in your response. Only return the extracted text, nothing else.`;

      const requestData = {
        model: modelToUse,
        prompt: prompt,
        images: [base64Image],
        stream: false,
        options: isSmallModel
          ? {
              // Optimized settings for smaller models
              temperature: 0.1, // Keep low for text extraction accuracy
              top_p: 0.7, // More focused
              num_predict: 1500, // Reduced for text extraction
              repeat_penalty: 1.3, // Higher to avoid repetition
              top_k: 30, // More focused vocabulary
            }
          : {
              // Original settings for larger models
              temperature: 0.1,
              top_p: 0.9,
              num_predict: 2000,
            },
      };

      console.log(`🌐 Making vision request to: ${this.baseURL}/api/generate`);

      const response = await axios.post(`${this.baseURL}/api/generate`, requestData, {
        timeout: this.timeout,
        family: 4,
      });

      const extractedText = response.data.response.trim();
      console.log(`✅ Vision-based text extraction completed`);
      console.log(`📝 Extracted ${extractedText.length} characters`);
      console.log(`📝 Preview: ${extractedText.substring(0, 200)}...`);

      return extractedText;
    } catch (error) {
      console.error("❌ Error in vision-based text extraction:");
      console.error("Error message:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`Vision text extraction failed: ${error.message}`);
    }
  }

  async analyzeDocumentWithVision(imagePath, documentType = "unknown") {
    try {
      console.log(`👁️ Starting vision-based document analysis: ${path.basename(imagePath)}`);

      // Find the best available vision model
      const modelToUse = await this.findBestVisionModel();
      const isSmallModel = modelToUse.includes("qwen:7b") || modelToUse.includes("llava:7b") || modelToUse.includes("phi3");
      console.log(`🤖 Using vision model: ${modelToUse} for analysis`);
      console.log(`🎯 Model optimization: ${isSmallModel ? "Small model - using optimized prompt" : "Large model - using detailed prompt"}`);

      // Read image file and convert to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString("base64");

      console.log(`📸 Image loaded for analysis, size: ${imageBuffer.length} bytes`);

      const prompt = this.createVisionAnalysisPrompt(documentType);

      const requestData = {
        model: modelToUse,
        prompt: prompt,
        images: [base64Image],
        stream: false,
        options: isSmallModel
          ? {
              // Optimized settings for smaller models
              temperature: 0.2, // Slightly higher for more creativity in text extraction
              top_p: 0.8, // More focused sampling
              num_predict: 2000, // Reduced to prevent hallucination
              repeat_penalty: 1.2, // Higher to avoid repetition
              top_k: 40, // Limit vocabulary for better focus
              stop: ["Human:", "Assistant:", "```"], // Stop tokens to prevent unwanted output
            }
          : {
              // Original settings for larger models
              temperature: 0.1,
              top_p: 0.9,
              num_predict: 4000,
              repeat_penalty: 1.1,
            },
      };

      console.log(`🌐 Making vision analysis request to: ${this.baseURL}/api/generate`);

      const response = await axios.post(`${this.baseURL}/api/generate`, requestData, {
        timeout: this.timeout,
        family: 4,
      });

      console.log(`📥 Vision analysis response received`);

      const analysis = this.parseAnalysisResponse(response.data.response);
      console.log("✅ Vision-based document analysis completed successfully");
      console.log(`📊 Analysis result:`, JSON.stringify(analysis, null, 2));

      // If small model extracted no text, try llava:latest for better text recognition
      if (isSmallModel && (!analysis.extractedText || analysis.extractedText.trim().length === 0)) {
        console.log("⚠️ Small model extracted 0 characters, trying llava:latest for better text recognition");

        // Try with llava:latest if available
        const availableModels = await this.getAvailableModels();
        if (availableModels.includes("llava:latest") && modelToUse !== "llava:latest") {
          console.log("🔄 Retrying with llava:latest model");

          const llavaRequestData = {
            model: "llava:latest",
            prompt: prompt,
            images: [base64Image],
            stream: false,
            options: {
              temperature: 0.1,
              top_p: 0.9,
              num_predict: 4000,
              repeat_penalty: 1.1,
            },
          };

          try {
            const llavaResponse = await axios.post(`${this.baseURL}/api/generate`, llavaRequestData, {
              timeout: this.timeout,
              family: 4,
            });

            const llavaAnalysis = this.parseAnalysisResponse(llavaResponse.data.response);

            if (llavaAnalysis.extractedText && llavaAnalysis.extractedText.trim().length > 0) {
              console.log("✅ llava:latest successfully extracted text");
              console.log(`📊 llava:latest Analysis result:`, JSON.stringify(llavaAnalysis, null, 2));
              return llavaAnalysis;
            }
          } catch (llavaError) {
            console.log("⚠️ llava:latest also failed, continuing with original result");
          }
        }
      }

      // Validate that we got meaningful analysis
      if (!analysis.extractedText && !analysis.summary && (!analysis.keyPoints || analysis.keyPoints.length === 0)) {
        console.warn("⚠️ Vision analysis appears to be empty, creating fallback analysis");
        return this.createFallbackVisionAnalysis(response.data.response, documentType);
      }

      return analysis;
    } catch (error) {
      console.error("❌ Error in vision-based document analysis:");
      console.error("Error message:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`Vision document analysis failed: ${error.message}`);
    }
  }

  createVisionAnalysisPrompt(documentType) {
    // Check if we're using a smaller model that needs a simpler prompt
    const isSmallModel = this.currentVisionModel.includes("qwen:7b") || this.currentVisionModel.includes("llava:7b") || this.currentVisionModel.includes("phi3");

    if (isSmallModel) {
      return this.createOptimizedVisionPrompt(documentType);
    }

    // Use the original complex prompt for larger models
    return this.createDetailedVisionPrompt(documentType);
  }

  createOptimizedVisionPrompt(documentType) {
    return `TASK: Look at this image very carefully and find ALL text.

This is a ${documentType} document image. There IS text in this image that you need to find.

STEP 1: LOOK HARDER - Scan the entire image for:
- Handwritten text (may be small or faint)
- Printed text (headers, names, dates)
- Numbers (account numbers, dates, amounts)
- Signatures or stamps
- Address information (street, city, postal code, country)

STEP 2: READ EVERYTHING - Even if text is:
- Handwritten and messy
- Very small
- Partially visible
- In different languages

STEP 3: EXTRACT ALL TEXT you can see, even if unclear.

Return this JSON (fill in what you actually see):
{
  "documentType": "Meeting Minutes",
  "extractedText": "WRITE EVERY WORD, NUMBER AND DATE YOU CAN SEE - even if handwritten or unclear. If you see ANY text at all, write it here. Do not say 'no text found'.",
  "summary": "Brief description of what this document appears to be about",
  "clientIdentification": {
    "names": ["Any person names you can read"],
    "accountNumbers": ["Any numbers that look like accounts: CH1234, IBAN, etc."],
    "dates": ["Any dates you see: DD.MM.YYYY, YYYY-MM-DD"],
    "bankingProducts": ["investment", "savings", "checking", "pension"],
    "addressInfo": {
      "oldAddress": "Previous address if mentioned",
      "newAddress": "New address if mentioned", 
      "addressChangeIndicators": ["moved", "relocated", "new address", "address change"]
    }
  },
  "keyPoints": ["What appears to be the main topics"],
  "clientNeeds": ["What the client seems to need"],
  "riskAssessment": {
    "level": "low",
    "factors": ["Based on what you can read"]
  },
  "complianceFlags": [],
  "suggestedActions": [{
    "type": "CREATE_CLIENT_NOTE",
    "priority": "medium", 
    "description": "Document analysis completed",
    "data": {
      "noteContent": "Based on the text I could extract from this document",
      "category": "follow-up"
    }
  }]
}

CRITICAL: There IS text in this image. Look very carefully. Extract ANY text you can see, even if handwritten, small, or unclear. Do not give up!`;
  }

  createDetailedVisionPrompt(documentType) {
    return `You are an expert financial advisor assistant analyzing a document image. 
Please analyze this document image and provide a comprehensive analysis in JSON format.

Document Type Context: ${documentType}

Please examine the image and provide your analysis in the following JSON structure:
{
  "documentType": "Classify the document (e.g., 'Advisory Meeting Minutes', 'Client Portfolio Review', 'Financial Report', 'Handwritten Notes', 'Form', etc.)",
  "extractedText": "All text content extracted from the image, preserving formatting where possible. Pay special attention to names, account numbers, IBANs, dates, address information, and banking product references.",
  "summary": "Brief summary of the document content and purpose",
  "clientIdentification": {
    "names": ["List all person names found in the document"],
    "accountNumbers": ["List all account numbers, IBANs, or banking references found"],
    "dates": ["List all dates found, especially birth dates or account opening dates"],
    "bankingProducts": ["List any banking products mentioned (checking, savings, investment, pension, etc.)"],
    "addressInfo": {
      "oldAddress": "Previous address if address change is mentioned",
      "newAddress": "New address if address change is mentioned",
      "addressChangeIndicators": ["List any words/phrases indicating address change: moved, relocated, new address, change of address, etc."]
    }
  },
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "clientNeeds": ["identified need 1", "identified need 2"],
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": ["risk factor 1", "risk factor 2"]
  },
  "complianceFlags": ["compliance issue 1", "compliance issue 2"],
  "suggestedActions": [
    {
      "type": "CREATE_CLIENT_NOTE",
      "priority": "high|medium|low",
      "description": "Description of the action",
      "data": {
        "noteContent": "Detailed note content based on document analysis",
        "category": "follow-up|compliance|risk|investment"
      }
    },
    {
      "type": "PROCESS_ADDRESS_CHANGE",
      "priority": "high|medium|low",
      "description": "Process client address change",
      "data": {
        "oldAddress": "Previous address",
        "newAddress": "New address",
        "effectiveDate": "YYYY-MM-DD",
        "verificationRequired": true,
        "documentationNeeded": ["proof of address", "updated ID"]
      }
    },
    {
      "type": "SCHEDULE_FOLLOW_UP",
      "priority": "high|medium|low",
      "description": "Description of the action",
      "data": {
        "suggestedDate": "YYYY-MM-DD",
        "purpose": "Purpose of follow-up based on document content",
        "meetingType": "in-person|video|phone"
      }
    }
  ]
}

Focus on:
1. Accurately extracting all visible text from the image, especially client identification data
2. Identifying any names (first names, last names, full names)
3. Finding account numbers, IBANs, or any banking references (format: CH XXXX XXXX XXXX XX XX)
4. Extracting dates, particularly birth dates or account opening dates
5. **DETECTING ADDRESS CHANGES**: Look for phrases like "moved to", "new address", "address change", "relocated", "changed residence"
6. Extracting old and new address information if address change is mentioned
7. Noting any banking products mentioned (checking, savings, investment accounts, etc.)
8. Understanding the document's purpose and context
9. Identifying client needs and concerns
10. Suggesting appropriate banking/financial advisor actions including address change processing
11. Flagging any compliance or risk issues

Pay special attention to Swiss banking formats:
- Account numbers: CH followed by numbers and spaces
- IBANs: CH followed by 2 digits and account details
- Dates in formats: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
- Swiss addresses: Street number, postal code, city format

Respond only with valid JSON. Do not include any other text or explanations.`;
  }

  async analyzeDocument(documentText, documentType = "unknown") {
    try {
      console.log(`🦙 Starting Ollama analysis with model: ${this.defaultModel}`);
      console.log(`📄 Document type: ${documentType}`);
      console.log(`📝 Document text length: ${documentText.length} characters`);
      console.log(`📝 Document preview: ${documentText.substring(0, 200)}...`);

      const prompt = this.createAnalysisPrompt(documentText, documentType);
      console.log(`🔤 Prompt length: ${prompt.length} characters`);

      console.log(`🌐 Making request to: ${this.baseURL}/api/generate`);

      const requestData = {
        model: this.defaultModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 2000,
        },
      };

      console.log(`📤 Request data:`, JSON.stringify(requestData, null, 2));

      const response = await axios.post(`${this.baseURL}/api/generate`, requestData, {
        timeout: this.timeout,
        family: 4, // Force IPv4
      });

      console.log(`📥 Response status: ${response.status}`);

      const analysis = this.parseAnalysisResponse(response.data.response);
      console.log("✅ Ollama analysis completed successfully");

      return analysis;
    } catch (error) {
      console.error("❌ Error in Ollama document analysis:");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`Ollama analysis failed: ${error.message}`);
    }
  }

  createAnalysisPrompt(documentText, documentType) {
    return `You are an expert financial advisor assistant analyzing client advisory minutes. 
Please analyze the following document and provide a structured response in JSON format.

Document Type: ${documentType}
Document Content:
${documentText}

Please provide your analysis in the following JSON structure:
{
  "documentType": "Classify the document type based on content",
  "summary": "Brief summary of the document content",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "clientNeeds": ["identified need 1", "identified need 2"],
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": ["risk factor 1", "risk factor 2"]
  },
  "complianceFlags": ["compliance issue 1", "compliance issue 2"],
  "addressChangeDetected": {
    "hasAddressChange": false,
    "oldAddress": "",
    "newAddress": "",
    "changeIndicators": [],
    "confidence": "low|medium|high"
  },
  "suggestedActions": [
    {
      "type": "CREATE_CLIENT_NOTE",
      "priority": "high|medium|low",
      "description": "Description of the action",
      "data": {
        "noteContent": "Detailed note content",
        "category": "follow-up|compliance|risk|investment"
      }
    },
    {
      "type": "PROCESS_ADDRESS_CHANGE",
      "priority": "high|medium|low", 
      "description": "Process client address change",
      "data": {
        "oldAddress": "Previous client address",
        "newAddress": "New client address",
        "effectiveDate": "YYYY-MM-DD",
        "verificationRequired": true,
        "documentationNeeded": ["proof of address", "updated ID", "utility bill"],
        "complianceSteps": ["update KYC", "verify new address", "update correspondence address"]
      }
    },
    {
      "type": "FILL_COMPLIANCE_FORM",
      "priority": "high|medium|low", 
      "description": "Description of the action",
      "data": {
        "formType": "KYC|AML|MiFID",
        "requiredFields": ["field1", "field2"],
        "extractedData": {"field1": "value1", "field2": "value2"}
      }
    },
    {
      "type": "UPDATE_CLIENT_PROFILE",
      "priority": "high|medium|low",
      "description": "Description of the action", 
      "data": {
        "updates": {"field": "new_value"}
      }
    },
    {
      "type": "SCHEDULE_FOLLOW_UP",
      "priority": "high|medium|low",
      "description": "Description of the action",
      "data": {
        "suggestedDate": "YYYY-MM-DD",
        "purpose": "Purpose of follow-up",
        "meetingType": "in-person|video|phone"
      }
    }
  ]
}

**IMPORTANT**: Pay special attention to detecting address changes in the document. Look for phrases like:
- "moved to", "relocated to", "new address", "address change"
- "changed residence", "new home", "different address"
- Mentions of old vs new street addresses, cities, postal codes
- References to updating address information
- Moving notifications or change of address requests

If you detect an address change, set "hasAddressChange" to true and include a PROCESS_ADDRESS_CHANGE action with high priority.

Respond only with valid JSON. Do not include any other text or explanations.`;
  }

  parseAnalysisResponse(response) {
    try {
      // Clean the response first
      let cleanResponse = response.trim();

      // Remove any markdown code blocks
      cleanResponse = cleanResponse.replace(/```json\s*/g, "").replace(/```\s*/g, "");

      // Try to extract JSON from the response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];

        // Fix common JSON issues
        jsonStr = jsonStr
          .replace(/\\_/g, "_") // Fix escaped underscores
          .replace(/\n\s*\n/g, "\n") // Remove extra newlines
          .replace(/,\s*}/g, "}") // Remove trailing commas
          .replace(/,\s*]/g, "]"); // Remove trailing commas in arrays

        try {
          const parsed = JSON.parse(jsonStr);
          console.log("✅ Successfully parsed JSON response");

          // Process address change detection
          const processedAnalysis = this.processAddressChangeDetection(parsed);
          return processedAnalysis;
        } catch (parseError) {
          console.log(`⚠️ JSON parse error: ${parseError.message}`);
          console.log(`🔍 Attempting to extract text content from response...`);

          // Try to extract key information manually
          return this.extractInfoFromText(cleanResponse);
        }
      }

      // If no JSON found, create a basic structure
      return this.createFallbackAnalysis(response);
    } catch (error) {
      console.error("Error parsing Ollama response:", error.message);
      return this.createFallbackAnalysis(response);
    }
  }

  processAddressChangeDetection(analysis) {
    try {
      console.log("🏠 Processing address change detection...");

      // Check if addressChangeDetected exists and has address change
      if (analysis.addressChangeDetected && analysis.addressChangeDetected.hasAddressChange) {
        console.log("✅ Address change detected in analysis");

        // Ensure PROCESS_ADDRESS_CHANGE action is included
        const hasAddressChangeAction = analysis.suggestedActions?.some((action) => action.type === "PROCESS_ADDRESS_CHANGE");

        if (!hasAddressChangeAction) {
          console.log("➕ Adding PROCESS_ADDRESS_CHANGE action");
          analysis.suggestedActions = analysis.suggestedActions || [];
          analysis.suggestedActions.unshift({
            type: "PROCESS_ADDRESS_CHANGE",
            priority: "high",
            description: "Process detected client address change",
            data: {
              oldAddress: analysis.addressChangeDetected.oldAddress || "Address from client records",
              newAddress: analysis.addressChangeDetected.newAddress || "New address to be verified",
              effectiveDate: new Date().toISOString().split("T")[0],
              verificationRequired: true,
              documentationNeeded: ["proof of address", "updated ID", "utility bill"],
              complianceSteps: ["update KYC", "verify new address", "update correspondence address", "notify relevant departments"],
            },
          });
        }

        // Add compliance flag if not present
        analysis.complianceFlags = analysis.complianceFlags || [];
        if (!analysis.complianceFlags.includes("Address change requires verification")) {
          analysis.complianceFlags.push("Address change requires verification");
        }
      }

      // Also check extracted text for address change indicators
      const textToCheck = (analysis.extractedText || "").toLowerCase();
      const addressChangeKeywords = ["moved to", "relocated to", "new address", "address change", "change of address", "changed residence", "new home", "different address", "moving to", "relocated from", "previous address", "former address", "current address", "umzug", "adressänderung"];

      const foundKeywords = addressChangeKeywords.filter((keyword) => textToCheck.includes(keyword));

      if (foundKeywords.length > 0 && (!analysis.addressChangeDetected || !analysis.addressChangeDetected.hasAddressChange)) {
        console.log(`🏠 Address change keywords detected: ${foundKeywords.join(", ")}`);

        // Add address change detection info
        analysis.addressChangeDetected = {
          hasAddressChange: true,
          oldAddress: "Address from client records",
          newAddress: "New address mentioned in document",
          changeIndicators: foundKeywords,
          confidence: foundKeywords.length > 2 ? "high" : "medium",
        };

        // Add PROCESS_ADDRESS_CHANGE action if not present
        const hasAddressChangeAction = analysis.suggestedActions?.some((action) => action.type === "PROCESS_ADDRESS_CHANGE");

        if (!hasAddressChangeAction) {
          analysis.suggestedActions = analysis.suggestedActions || [];
          analysis.suggestedActions.unshift({
            type: "PROCESS_ADDRESS_CHANGE",
            priority: "high",
            description: `Process address change - detected keywords: ${foundKeywords.join(", ")}`,
            data: {
              oldAddress: "Previous address from client records",
              newAddress: "New address to be extracted and verified",
              effectiveDate: new Date().toISOString().split("T")[0],
              verificationRequired: true,
              documentationNeeded: ["proof of address", "updated ID", "utility bill"],
              complianceSteps: ["update KYC", "verify new address", "update correspondence address", "notify compliance team"],
              detectedKeywords: foundKeywords,
            },
          });

          // Add compliance flag
          analysis.complianceFlags = analysis.complianceFlags || [];
          analysis.complianceFlags.push("Address change detected - verification required");
        }
      }

      return analysis;
    } catch (error) {
      console.error("Error processing address change detection:", error.message);
      return analysis; // Return original analysis if processing fails
    }
  }

  extractInfoFromText(text) {
    // Extract document type
    const docTypeMatch = text.match(/"documentType":\s*"([^"]+)"/);
    const documentType = docTypeMatch ? docTypeMatch[1] : "Unknown Document";

    // Extract summary
    const summaryMatch = text.match(/"summary":\s*"([^"]+)"/);
    const summary = summaryMatch ? summaryMatch[1] : "Document processed successfully";

    // Extract text content
    const extractedTextMatch = text.match(/"extractedText":\s*"([^"]+)"/);
    const extractedText = extractedTextMatch ? extractedTextMatch[1].replace(/\\n/g, "\n") : null;

    // Look for any readable text in the response
    if (!extractedText && text.length > 100) {
      // Try to find readable text content
      const textLines = text.split("\n").filter((line) => line.length > 10 && !line.includes("{") && !line.includes("}") && !line.includes('"documentType"') && !line.includes('"summary"'));

      if (textLines.length > 0) {
        const readableText = textLines.slice(0, 10).join("\n").trim();
        if (readableText.length > 20) {
          return {
            documentType,
            summary,
            extractedText: readableText,
            keyPoints: ["Text extracted from document", "Content analyzed", "Summary generated"],
            clientNeeds: ["Review extracted content", "Verify accuracy"],
            riskAssessment: {
              level: "medium",
              factors: ["Manual text extraction required"],
            },
            complianceFlags: [],
            suggestedActions: [
              {
                type: "CREATE_CLIENT_NOTE",
                priority: "medium",
                description: "Review extracted document content",
                data: {
                  noteContent: `Extracted content: ${readableText.substring(0, 200)}...`,
                  category: "follow-up",
                },
              },
            ],
          };
        }
      }
    }

    return {
      documentType,
      summary,
      extractedText,
      keyPoints: ["Document processed", "Content analyzed", "Information extracted"],
      clientNeeds: ["Review document content"],
      riskAssessment: {
        level: "medium",
        factors: ["Standard document review required"],
      },
      complianceFlags: [],
      suggestedActions: [
        {
          type: "CREATE_CLIENT_NOTE",
          priority: "medium",
          description: "Document analysis completed",
          data: {
            noteContent: summary,
            category: "follow-up",
          },
        },
      ],
    };
  }

  createFallbackAnalysis(response) {
    return {
      summary: "Document analysis completed using Ollama",
      keyPoints: ["Document processed successfully", "Content analyzed for advisory insights", "Recommendations generated based on content"],
      clientNeeds: ["Follow-up required", "Documentation needed"],
      riskAssessment: {
        level: "medium",
        factors: ["Standard advisory review required"],
      },
      complianceFlags: [],
      suggestedActions: [
        {
          type: "CREATE_CLIENT_NOTE",
          priority: "medium",
          description: "Create summary note from advisory meeting",
          data: {
            noteContent: response.substring(0, 500) + "...",
            category: "follow-up",
          },
        },
        {
          type: "SCHEDULE_FOLLOW_UP",
          priority: "medium",
          description: "Schedule follow-up meeting to review discussion points",
          data: {
            suggestedDate: this.getDefaultFollowUpDate(),
            purpose: "Review and follow up on advisory discussion",
            meetingType: "in-person",
          },
        },
      ],
    };
  }

  createFallbackVisionAnalysis(response, documentType) {
    console.log("🎭 Creating fallback vision analysis due to empty results");
    console.log("📝 Raw vision response:", response);

    // Try to extract any meaningful text from the response
    const extractedText = response || "No text could be extracted from the image";
    const extractedInfo = this.extractInfoFromText(response);

    return {
      documentType: documentType || "Image Document",
      extractedText: extractedText,
      summary: "Image document processed but content extraction was limited. Manual review recommended.",
      clientIdentification: {
        names: [],
        accountNumbers: [],
        dates: [],
        bankingProducts: [],
      },
      keyPoints: extractedInfo.keyPoints.length > 0 ? extractedInfo.keyPoints : ["Image document processed"],
      clientNeeds: ["Manual document review required"],
      riskAssessment: {
        level: "unknown",
        factors: ["Image content not fully extracted"],
      },
      complianceFlags: ["Manual review required - image content extraction incomplete"],
      suggestedActions: [
        {
          type: "CREATE_CLIENT_NOTE",
          priority: "high",
          description: "Review image document manually - automatic extraction was incomplete",
          data: {
            noteContent: "Image document uploaded but automatic text extraction was incomplete. Manual review required.",
            category: "follow-up",
          },
        },
      ],
    };
  }

  getDefaultFollowUpDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days from now
    return date.toISOString().split("T")[0];
  }

  async generateClientNote(content, category = "general") {
    try {
      const prompt = `As a professional financial advisor, please create a concise client note based on the following content:

Content: ${content}
Category: ${category}

Please write a professional client note that:
- Summarizes key discussion points
- Highlights important decisions or recommendations
- Notes any follow-up actions required
- Maintains professional tone suitable for client records

Keep the note concise but comprehensive, suitable for inclusion in client files.`;

      const response = await axios.post(
        `${this.baseURL}/api/generate`,
        {
          model: this.defaultModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.2,
            top_p: 0.8,
            num_predict: 500,
          },
        },
        {
          timeout: this.timeout,
          family: 4, // Force IPv4
        }
      );

      return response.data.response.trim();
    } catch (error) {
      console.error("Error generating client note with Ollama:", error.message);
      return `Client Note (${category}): ${content.substring(0, 200)}...`;
    }
  }

  async checkHealth() {
    try {
      const isAvailable = await this.isAvailable();
      const models = isAvailable ? await this.getAvailableModels() : [];

      return {
        status: isAvailable ? "healthy" : "unavailable",
        baseURL: this.baseURL,
        defaultModel: this.defaultModel,
        availableModels: models.map((m) => m.name || m),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

module.exports = { OllamaService };
