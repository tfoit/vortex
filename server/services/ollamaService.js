const axios = require("axios");

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.defaultModel = process.env.OLLAMA_MODEL || "llama3.2";
    this.timeout = 60000; // 60 seconds for local processing

    console.log(`🦙 Ollama service initialized with model: ${this.defaultModel}`);
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
      console.log(`📥 Response data:`, JSON.stringify(response.data, null, 2));

      const analysis = this.parseAnalysisResponse(response.data.response);
      console.log("✅ Ollama analysis completed successfully");
      console.log(`📊 Analysis result:`, JSON.stringify(analysis, null, 2));

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
  "summary": "Brief summary of the document content",
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
        "noteContent": "Detailed note content",
        "category": "follow-up|compliance|risk|investment"
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

Respond only with valid JSON. Do not include any other text or explanations.`;
  }

  parseAnalysisResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON found, create a basic structure
      return this.createFallbackAnalysis(response);
    } catch (error) {
      console.error("Error parsing Ollama response:", error.message);
      return this.createFallbackAnalysis(response);
    }
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
