const OpenAI = require("openai");
const { OllamaService } = require("./ollamaService");

class AIService {
  constructor() {
    // Force Ollama only - disable OpenAI
    this.openai = null;
    console.log("🔒 OpenAI disabled - using Ollama only");

    // Initialize Ollama
    this.ollama = new OllamaService();

    // Set AI provider to Ollama only
    this.aiProvider = "ollama";

    this.initializeProvider();
  }

  async initializeProvider() {
    // Force Ollama only
    const ollamaAvailable = await this.ollama.isAvailable();

    if (ollamaAvailable) {
      this.aiProvider = "ollama";
      console.log("🦙 AI Provider: Ollama (Local) - FORCED");
    } else {
      console.log("❌ Ollama not available - check if Ollama server is running");
      this.aiProvider = "mock";
      console.log("🎭 AI Provider: Mock responses (fallback)");
    }
  }

  async analyzeAdvisoryMinutes(documentText) {
    console.log("🚀 AI Service: Starting document analysis");
    console.log(`🔧 Current AI provider: ${this.aiProvider}`);

    // Ensure provider is initialized
    if (this.aiProvider === "auto") {
      console.log("🔄 AI Service: Provider is auto, initializing...");
      await this.initializeProvider();
    }

    console.log(`🎯 AI Service: Using provider: ${this.aiProvider}`);

    switch (this.aiProvider) {
      case "openai":
        console.log("🤖 AI Service: Routing to OpenAI analysis");
        return this.analyzeWithOpenAI(documentText);
      case "ollama":
        console.log("🦙 AI Service: Routing to Ollama analysis");
        return this.analyzeWithOllama(documentText);
      default:
        console.log("🎭 AI Service: Routing to mock analysis");
        return this.getMockAnalysis(documentText);
    }
  }

  async analyzeWithOpenAI(documentText) {
    if (!this.openai) {
      console.warn("OpenAI not available, falling back to mock");
      return this.getMockAnalysis(documentText);
    }

    try {
      console.log("🤖 Analyzing advisory minutes with OpenAI...");

      const prompt = this.buildAnalysisPrompt(documentText);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert banking assistant that analyzes client advisory meeting minutes and suggests appropriate actions for client advisors.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const response = completion.choices[0].message.content;
      const analysis = this.parseAnalysisResponse(response);

      console.log(`✅ OpenAI analysis completed with ${analysis.suggestedActions.length} suggested actions`);

      return analysis;
    } catch (error) {
      console.error("Error with OpenAI analysis:", error);
      // Fallback to mock analysis if API fails
      return this.getMockAnalysis(documentText);
    }
  }

  async analyzeWithOllama(documentText) {
    try {
      console.log("🦙 AI Service: Starting Ollama analysis...");
      console.log(`📝 Document text length: ${documentText.length} characters`);

      const analysis = await this.ollama.analyzeDocument(documentText, "advisory_minutes");

      console.log("🔍 AI Service: Received analysis from Ollama");
      console.log(`📊 Raw analysis:`, JSON.stringify(analysis, null, 2));

      // Add IDs to suggested actions if not present
      if (analysis.suggestedActions) {
        analysis.suggestedActions = analysis.suggestedActions.map((action, index) => ({
          id: action.id || `action_${index + 1}`,
          title: action.title || action.description || `Action ${index + 1}`,
          ...action,
        }));
        console.log(`🎯 AI Service: Added IDs to ${analysis.suggestedActions.length} suggested actions`);
      } else {
        console.log("⚠️ AI Service: No suggested actions found in analysis");
      }

      console.log(`✅ AI Service: Ollama analysis completed with ${analysis.suggestedActions?.length || 0} suggested actions`);
      console.log(`📊 Final analysis:`, JSON.stringify(analysis, null, 2));

      return analysis;
    } catch (error) {
      console.error("❌ AI Service: Error with Ollama analysis:");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.log("🔄 AI Service: Falling back to mock analysis");
      // Fallback to mock analysis if Ollama fails
      return this.getMockAnalysis(documentText);
    }
  }

  buildAnalysisPrompt(documentText) {
    return `
Please analyze the following client advisory meeting minutes and provide structured insights:

DOCUMENT TEXT:
${documentText}

Please provide your analysis in the following JSON format:
{
  "summary": "Brief summary of the meeting",
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "clientNeeds": ["Need 1", "Need 2", ...],
  "riskAssessment": "Risk level and concerns",
  "complianceFlags": ["Flag 1", "Flag 2", ...],
  "suggestedActions": [
    {
      "id": "action_1",
      "type": "CREATE_CLIENT_NOTE",
      "title": "Create follow-up note",
      "description": "Description of the action",
      "priority": "high|medium|low",
      "data": {
        "noteContent": "Suggested note content",
        "category": "follow-up|compliance|risk|other"
      }
    },
    {
      "id": "action_2",
      "type": "FILL_COMPLIANCE_FORM",
      "title": "Complete compliance documentation",
      "description": "Description of compliance requirements",
      "priority": "high|medium|low",
      "data": {
        "formType": "KYC|AML|MIFID|OTHER",
        "requiredFields": ["field1", "field2"],
        "extractedData": {"field1": "value1", "field2": "value2"}
      }
    }
  ]
}

Focus on banking-specific actions like compliance documentation, risk assessment updates, client profile updates, and follow-up scheduling.
`;
  }

  parseAnalysisResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback parsing if JSON is not properly formatted
      return this.parseUnstructuredResponse(response);
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return this.getDefaultAnalysis();
    }
  }

  parseUnstructuredResponse(response) {
    // Simple parsing for unstructured responses
    return {
      summary: "AI analysis completed but response format was not structured",
      keyPoints: response
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .slice(0, 5),
      clientNeeds: [],
      riskAssessment: "Unable to determine from unstructured response",
      complianceFlags: [],
      suggestedActions: [
        {
          id: "manual_review",
          type: "CREATE_CLIENT_NOTE",
          title: "Manual review required",
          description: "AI response needs manual interpretation",
          priority: "medium",
          data: {
            noteContent: response.substring(0, 500),
            category: "other",
          },
        },
      ],
    };
  }

  getMockAnalysis(documentText) {
    console.log("🎭 Using mock AI analysis (OpenAI not configured)");

    // Generate realistic mock analysis based on document content
    const wordCount = documentText.split(" ").length;
    const hasNumbers = /\d/.test(documentText);
    const hasFinancialTerms = /investment|portfolio|risk|return|fund|asset|bond|stock|equity/i.test(documentText);

    return {
      summary: `Advisory meeting minutes analyzed (${wordCount} words). ${hasFinancialTerms ? "Financial products discussed." : "General advisory session."}`,
      keyPoints: ["Client consultation documented", hasFinancialTerms ? "Investment products mentioned" : "General banking services discussed", hasNumbers ? "Numerical data present in document" : "Qualitative discussion recorded", "Follow-up actions required"],
      clientNeeds: ["Investment advice", "Risk assessment review", "Portfolio optimization"],
      riskAssessment: hasFinancialTerms ? "Medium risk - investment products discussed" : "Low risk - general advisory",
      complianceFlags: [hasFinancialTerms ? "MiFID II documentation required" : "Standard KYC review", "Client suitability assessment needed"],
      suggestedActions: [
        {
          id: "note_creation",
          type: "CREATE_CLIENT_NOTE",
          title: "Create meeting summary note",
          description: "Document key outcomes and decisions from the advisory session",
          priority: "high",
          data: {
            noteContent: `Meeting summary: ${documentText.substring(0, 200)}...`,
            category: "follow-up",
          },
        },
        {
          id: "compliance_check",
          type: "FILL_COMPLIANCE_FORM",
          title: "Complete compliance documentation",
          description: "Ensure all regulatory requirements are met",
          priority: "high",
          data: {
            formType: hasFinancialTerms ? "MIFID" : "KYC",
            requiredFields: ["client_id", "advisor_id", "meeting_date", "products_discussed"],
            extractedData: {
              meeting_date: new Date().toISOString().split("T")[0],
              products_discussed: hasFinancialTerms ? "Investment products" : "Banking services",
            },
          },
        },
        {
          id: "follow_up",
          type: "SCHEDULE_FOLLOW_UP",
          title: "Schedule follow-up meeting",
          description: "Plan next client interaction based on discussion outcomes",
          priority: "medium",
          data: {
            suggestedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            purpose: "Review implementation of discussed strategies",
          },
        },
      ],
    };
  }

  getDefaultAnalysis() {
    return {
      summary: "Document processed but analysis failed",
      keyPoints: ["Analysis error occurred"],
      clientNeeds: [],
      riskAssessment: "Unable to assess",
      complianceFlags: ["Manual review required"],
      suggestedActions: [
        {
          id: "manual_review",
          type: "CREATE_CLIENT_NOTE",
          title: "Manual review required",
          description: "Automatic analysis failed, manual intervention needed",
          priority: "high",
          data: {
            noteContent: "Document uploaded but automatic analysis failed",
            category: "other",
          },
        },
      ],
    };
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
      ollama: await this.ollama.checkHealth(),
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
}

module.exports = { AIService };
