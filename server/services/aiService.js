const { OllamaService } = require("./ollamaService");
const { MockBankingService } = require("./mockBankingService");
const OpenAI = require("openai");

class AIService {
  constructor() {
    this.ollamaService = new OllamaService();
    this.mockBankingService = new MockBankingService();
    this.openai = null;
    this.isOPENAIAvailable = false;

    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.isOPENAIAvailable = true;
        console.log("✅ OpenAI Service Initialized with GPT-4o");
      } catch (error) {
        console.error("❌ Failed to initialize OpenAI:", error.message);
      }
    } else {
      console.log("🟠 OpenAI API key not found, running in Ollama-only mode.");
    }
  }

  async analyzeAdvisoryMinutes(documentText) {
    // This function will now prefer local analysis for text, but vision is handled elsewhere
    try {
      console.log("🤖 AI Service: Analyzing document text with local model...");

      if (!this.ollamaService) {
        throw new Error("OllamaService is not available in AI Service");
      }

      const analysis = await this.ollamaService.analyzeDocument(documentText, "advisory_minutes");

      // Add unique IDs and deduplicate actions
      this.addUniqueIdsToActions(analysis);
      return analysis;
    } catch (error) {
      console.error("❌ AI Service: Error during local document analysis:", error.message);
      throw error;
    }
  }

  async analyzeDocumentWithVision(imagePath, documentType = "unknown") {
    // Prioritize GPT-4o if available
    if (this.isOPENAIAvailable) {
      try {
        console.log("✨ AI Service: Analyzing image with GPT-4o...");
        return await this.analyzeWithGPT4o(imagePath, documentType);
      } catch (error) {
        console.warn(`⚠️ GPT-4o analysis failed: ${error.message}. Falling back to local model.`);
        // Fallback to Ollama if GPT-4o fails
        return await this.ollamaService.analyzeDocumentWithVision(imagePath, documentType);
      }
    } else {
      // Use Ollama if OpenAI is not configured
      console.log("🦙 AI Service: Analyzing image with local Ollama model...");
      return await this.ollamaService.analyzeDocumentWithVision(imagePath, documentType);
    }
  }

  async analyzeWithGPT4o(imagePath, documentType) {
    const fs = require("fs");
    const base64Image = fs.readFileSync(imagePath, "base64");
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    const prompt = this.createVisionAnalysisPrompt(documentType);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    console.log("✅ GPT-4o analysis completed successfully.");
    const analysisJson = response.choices[0].message.content;
    const analysis = JSON.parse(analysisJson);

    // Add unique IDs and deduplicate actions
    this.addUniqueIdsToActions(analysis);
    return analysis;
  }

  createVisionAnalysisPrompt(documentType) {
    // This is the same detailed prompt we created before, suitable for both models
    return `You are an expert financial advisor assistant analyzing a document image. 
Please analyze this document image and extract ALL text content you can see.

CRITICAL: Read the image very carefully and extract EVERY word, number, and piece of text visible in the image.

Document Type Context: ${documentType}

Please examine the image and provide your analysis in the following JSON structure:
{
  "documentType": "Classify the document (e.g., 'Advisory Meeting Minutes', 'Client Portfolio Review', 'Financial Report', 'Handwritten Notes', 'Form', etc.)",
  "extractedText": "ALL text content extracted from the image exactly as written, preserving formatting and line breaks",
  "summary": "Brief summary of the document content and purpose",
  "clientIdentification": {
    "names": ["EVERY person name found in the document - first names, last names, full names"],
    "accountNumbers": ["EVERY account number, IBAN, client ID, or reference number found"],
    "dates": ["EVERY date found - birth dates, meeting dates, any date format"],
    "bankingProducts": ["EVERY banking product, service, or financial term mentioned"]
  },
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "clientNeeds": ["identified need 1", "identified need 2"],
  "riskAssessment": {
    "level": "low|medium|high|unknown",
    "factors": ["risk factor 1", "risk factor 2"]
  },
  "complianceFlags": ["compliance issue 1", "compliance issue 2"],
  "suggestedActions": [
    {
      "type": "CREATE_CLIENT_NOTE|SCHEDULE_FOLLOW_UP|UPDATE_CLIENT_PROFILE|FILL_COMPLIANCE_FORM",
      "priority": "low|medium|high",
      "description": "Action description",
      "data": {}
    }
  ]
}

IMPORTANT: 
- Your response MUST be a valid JSON object.
- Read the image very carefully and extract ALL visible text.
- If text is handwritten or unclear, do your best to interpret it.
- Include ALL text in the extractedText field exactly as you see it.`;
  }

  async generateClientNote(analysisData, additionalContext = "") {
    if (!this.openai) {
      return this.generateMockClientNote(analysisData);
    }

    try {
      const prompt = `
Based on the following advisory meeting analysis, generate a professional client note:

ANALYSIS DATA:
${JSON.stringify(analysisData, null, 2)}

ADDITIONAL CONTEXT:
${additionalContext}

Please generate a concise, professional client note that summarizes the key outcomes and next steps.
`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional banking assistant that creates concise client notes for advisory meetings.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error generating client note:", error);
      return this.generateMockClientNote(analysisData);
    }
  }

  generateMockClientNote(analysisData) {
    return `CLIENT ADVISORY NOTE

Date: ${new Date().toLocaleDateString()}
Summary: ${analysisData.summary || "Advisory meeting completed"}

Key Discussion Points:
${analysisData.keyPoints?.map((point) => `• ${point}`).join("\n") || "• Meeting documented"}

Risk Assessment: ${analysisData.riskAssessment || "Standard risk profile"}

Next Steps:
${
  analysisData.suggestedActions
    ?.slice(0, 3)
    .map((action) => `• ${action.title}`)
    .join("\n") || "• Follow-up required"
}

Note: This is an AI-generated summary. Please review and adjust as necessary.`;
  }

  async getAIStatus() {
    const status = {
      provider: this.aiProvider,
      openai: {
        configured: !!this.openai,
        available: !!this.openai,
      },
      ollama: await this.ollamaService.checkHealth(),
      timestamp: new Date().toISOString(),
    };

    return status;
  }

  async switchProvider(provider) {
    // Disable provider switching - force Ollama only
    console.log("🔒 Provider switching disabled - using Ollama only");

    return {
      oldProvider: this.aiProvider,
      newProvider: this.aiProvider,
      status: await this.getAIStatus(),
      message: "Provider switching disabled - using Ollama only",
    };
  }

  generateActionId(action) {
    // Create a unique ID based on action type and key properties
    const actionKey = `${action.type}_${action.priority || "medium"}_${action.title?.replace(/\s+/g, "_") || "default"}`;
    return actionKey.toLowerCase() + "_" + Date.now();
  }

  addUniqueIdsToActions(analysis) {
    if (analysis && analysis.suggestedActions) {
      // Deduplicate actions by type and similar content
      const seenActions = new Map();
      const uniqueActions = [];

      analysis.suggestedActions.forEach((action) => {
        const actionKey = `${action.type}_${action.title || action.description}`;

        if (!seenActions.has(actionKey)) {
          action.id = this.generateActionId(action);
          action.timestamp = new Date().toISOString();
          action.status = "pending";

          // Add system context information
          action.systemContext = {
            generatedBy: "AI Analysis",
            targetSystem: this.getTargetSystem(action.type),
            estimatedProcessingTime: this.getEstimatedProcessingTime(action.type),
            requiredApprovals: this.getRequiredApprovals(action.type),
          };

          uniqueActions.push(action);
          seenActions.set(actionKey, action);
          console.log(`🎯 AI Service: Added unique action ${action.type} with ID ${action.id}`);
        } else {
          console.log(`⚠️ AI Service: Skipping duplicate action ${action.type}: ${action.title || action.description}`);
        }
      });

      analysis.suggestedActions = uniqueActions;
      console.log(`🎯 AI Service: Processed ${uniqueActions.length} unique actions (removed ${analysis.suggestedActions.length - uniqueActions.length} duplicates)`);
    }
  }

  getTargetSystem(actionType) {
    const systemMap = {
      CREATE_CLIENT_NOTE: "Client Management System",
      FILL_COMPLIANCE_FORM: "Compliance Management System",
      UPDATE_CLIENT_PROFILE: "Customer Database",
      SCHEDULE_FOLLOW_UP: "Calendar & CRM System",
    };
    return systemMap[actionType] || "Banking Core System";
  }

  getEstimatedProcessingTime(actionType) {
    const timeMap = {
      CREATE_CLIENT_NOTE: "1-2 seconds",
      FILL_COMPLIANCE_FORM: "2-5 seconds",
      UPDATE_CLIENT_PROFILE: "1-3 seconds",
      SCHEDULE_FOLLOW_UP: "1-2 seconds",
    };
    return timeMap[actionType] || "1-3 seconds";
  }

  getRequiredApprovals(actionType) {
    const approvalMap = {
      CREATE_CLIENT_NOTE: ["Advisor Review"],
      FILL_COMPLIANCE_FORM: ["Advisor Review", "Compliance Officer"],
      UPDATE_CLIENT_PROFILE: ["Advisor Review", "Data Protection Officer"],
      SCHEDULE_FOLLOW_UP: ["Advisor Review"],
    };
    return approvalMap[actionType] || ["Advisor Review"];
  }
}

module.exports = { AIService };
