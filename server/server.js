const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { SessionManager } = require("./services/sessionManager");
const { DocumentProcessor } = require("./services/documentProcessor");
const { AIService } = require("./services/aiService");
const { MockBankingService } = require("./services/mockBankingService");

const app = express();
const PORT = process.env.PORT || 7775;

// Initialize services
const sessionManager = new SessionManager();
const aiService = new AIService();
const documentProcessor = new DocumentProcessor();
const bankingService = new MockBankingService();

// Connect services - DocumentProcessor needs access to Ollama for vision
setTimeout(() => {
  // Wait for AI service to initialize, then connect to document processor
  if (aiService.ollama) {
    documentProcessor.setOllamaService(aiService.ollama);
    console.log("🔗 Connected DocumentProcessor to Ollama service for vision capabilities");
  }
}, 1000);

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost and local network access
      const allowedOrigins = [
        "http://localhost:7770",
        "http://127.0.0.1:7770",
        /^http:\/\/192\.168\.\d+\.\d+:7770$/, // Local network
        /^http:\/\/10\.\d+\.\d+\.\d+:7770$/, // Private network
        /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:7770$/, // Private network
      ];

      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") {
          return origin === allowed;
        }
        return allowed.test(origin);
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.log(`🚫 CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
  })
);

// Rate limiting - Relaxed for testing
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Serve uploaded files statically with CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      const allowedOrigins = ["http://localhost:7770", "http://127.0.0.1:7770", /^http:\/\/192\.168\.\d+\.\d+:7770$/, /^http:\/\/10\.\d+\.\d+\.\d+:7770$/, /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:7770$/];

      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") {
          return origin === allowed;
        }
        return allowed.test(origin);
      });

      if (isAllowed) {
        res.header("Access-Control-Allow-Origin", origin);
      }
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    next();
  },
  express.static(uploadsDir)
);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === "text/plain";

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images, PDFs, text files, and documents are allowed"));
    }
  },
});

// Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Debug endpoint for mobile testing
app.post("/api/debug/upload-test", upload.single("document"), (req, res) => {
  console.log("🧪 Debug: Upload test endpoint hit");
  console.log("📱 Request origin:", req.headers.origin);
  console.log(
    "📄 File received:",
    req.file
      ? {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        }
      : "No file"
  );

  res.json({
    success: true,
    message: "Upload test successful",
    file: req.file
      ? {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        }
      : null,
    origin: req.headers.origin,
  });
});

// Create new session
app.post("/api/sessions", async (req, res) => {
  try {
    const { clientAdvisorId, clientId } = req.body;
    const session = sessionManager.createSession(clientAdvisorId, clientId);
    res.json(session);
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Get session details
app.get("/api/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).json({ error: "Failed to retrieve session" });
  }
});

// Upload and process document
app.post("/api/sessions/:sessionId/upload", upload.single("document"), async (req, res) => {
  try {
    console.log("📤 Server: Document upload started");
    console.log("📱 Request origin:", req.headers.origin);
    console.log("📊 Request headers:", {
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
      "user-agent": req.headers["user-agent"],
    });

    const { sessionId } = req.params;
    const file = req.file;

    console.log(`📁 Session ID: ${sessionId}`);
    console.log(`📄 File: ${file?.originalname} (${file?.size} bytes, ${file?.mimetype})`);

    if (!file) {
      console.log("❌ Server: No file uploaded");
      console.log("📋 Request body keys:", Object.keys(req.body));
      console.log("📋 Request files:", req.files);
      return res.status(400).json({ error: "No file uploaded" });
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      console.log(`❌ Server: Session ${sessionId} not found`);
      return res.status(404).json({ error: "Session not found" });
    }

    console.log("✅ Server: Session found, processing document...");

    // Intelligent document processing pipeline
    console.log("🔄 Server: Starting intelligent document processing pipeline...");

    let documentText = "";
    let analysis = null;
    let processingMethod = "unknown";

    // Check if it's an image file
    const isImage = documentProcessor.isImageType(file.mimetype);

    if (isImage) {
      console.log("📸 Server: Image detected - using vision-based processing");
      processingMethod = "vision";

      try {
        // Use vision model for comprehensive analysis (includes text extraction)
        analysis = await documentProcessor.getImageAnalysis(file.path, "advisory_minutes");
        documentText = analysis.extractedText || "";
        console.log(`👁️ Server: Vision analysis completed - extracted ${documentText.length} characters`);
      } catch (visionError) {
        console.warn("⚠️ Server: Vision analysis failed, falling back to OCR:", visionError.message);
        processingMethod = "ocr_fallback";
        documentText = await documentProcessor.processDocument(file.path, file.mimetype);
        console.log(`📝 Server: OCR fallback extracted ${documentText.length} characters`);
      }
    } else {
      console.log("📄 Server: Non-image document - using OCR processing");
      processingMethod = "ocr";
      documentText = await documentProcessor.processDocument(file.path, file.mimetype);
      console.log(`📝 Server: OCR extracted ${documentText.length} characters`);
    }

    // If we don't have analysis yet (non-image or vision failed), run AI analysis
    if (!analysis && documentText.length > 0) {
      console.log("🤖 Server: Running AI analysis on extracted text...");
      try {
        analysis = await aiService.analyzeAdvisoryMinutes(documentText);
        console.log("✅ Server: AI analysis completed");
      } catch (aiError) {
        console.error("❌ Server: AI analysis failed:", aiError.message);
        // Create minimal analysis structure
        analysis = {
          documentType: isImage ? "Image Document" : "Text Document",
          summary: "Document processed but analysis failed",
          keyPoints: [],
          clientNeeds: [],
          riskAssessment: { level: "unknown", factors: [] },
          complianceFlags: [],
          suggestedActions: [],
          extractedText: documentText,
        };
      }
    }

    // Ensure extractedText is available in analysis
    if (analysis && !analysis.extractedText) {
      analysis.extractedText = documentText;
    }

    // Add document to session with complete analysis
    console.log("💾 Server: Saving document with complete analysis to session...");
    const document = sessionManager.addDocument(sessionId, {
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      text: documentText,
      analysis: analysis,
      processingMethod: processingMethod,
    });

    const response = {
      sessionId,
      documentId: document.id,
      message: "Document uploaded and fully processed with AI analysis.",
      analysis: analysis,
      suggestedActions: analysis?.suggestedActions || [],
      processingMethod: processingMethod,
      textLength: documentText.length,
    };

    console.log("📤 Server: Sending complete response to client");
    console.log(`🎯 Server: Processing summary - Method: ${processingMethod}, Text: ${documentText.length} chars, Actions: ${analysis?.suggestedActions?.length || 0}`);
    res.json(response);
  } catch (error) {
    console.error("❌ Server: Error processing document upload:", error);
    res.status(500).json({ error: "Failed to process document" });
  }
});

// Analyze a document
app.post("/api/sessions/:sessionId/documents/:documentId/analyze", async (req, res) => {
  try {
    const { sessionId, documentId } = req.params;
    console.log(`🤖 Server: Starting AI analysis for doc ${documentId} in session ${sessionId}`);

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const document = session.documents.find((d) => d.id === documentId);
    if (!document || !document.text) {
      return res.status(404).json({ error: "Document or document text not found" });
    }

    // Analyze with AI
    const analysis = await aiService.analyzeAdvisoryMinutes(document.text);
    console.log("✅ Server: AI analysis completed");

    // Update session with analysis
    sessionManager.addAnalysisToDocument(sessionId, documentId, analysis);

    const response = {
      sessionId,
      documentId,
      analysis,
      suggestedActions: analysis.suggestedActions || [],
    };

    console.log("📤 Server: Sending analysis response to client");
    res.json(response);
  } catch (error) {
    console.error("❌ Server: Error analyzing document:", error);
    res.status(500).json({ error: "Failed to analyze document" });
  }
});

// Vision-based document analysis (for images)
app.post("/api/sessions/:sessionId/documents/:documentId/analyze-vision", async (req, res) => {
  try {
    const { sessionId, documentId } = req.params;
    console.log(`👁️ Server: Starting vision-based analysis for doc ${documentId} in session ${sessionId}`);

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const document = session.documents.find((d) => d.id === documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check if it's an image file
    if (!documentProcessor.isImageType(document.mimetype)) {
      return res.status(400).json({ error: "Vision analysis is only available for image files" });
    }

    console.log(`👁️ Server: Performing vision analysis on image: ${document.filename}`);

    // Perform vision-based analysis
    const analysis = await documentProcessor.getImageAnalysis(document.path, "advisory_minutes");
    console.log("✅ Server: Vision analysis completed");

    // Update session with analysis (merge with existing data)
    const updatedAnalysis = {
      ...analysis,
      // Include extracted text from vision model
      extractedText: analysis.extractedText || document.text,
    };

    sessionManager.addAnalysisToDocument(sessionId, documentId, updatedAnalysis);

    const response = {
      sessionId,
      documentId,
      analysis: updatedAnalysis,
      suggestedActions: updatedAnalysis.suggestedActions || [],
      visionExtracted: true,
    };

    console.log("📤 Server: Sending vision analysis response to client");
    res.json(response);
  } catch (error) {
    console.error("❌ Server: Error in vision analysis:", error);
    res.status(500).json({ error: "Failed to perform vision analysis" });
  }
});

// Process image capture
app.post("/api/sessions/:sessionId/capture", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Save base64 image
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const filename = `capture-${Date.now()}.png`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, base64Data, "base64");

    // Process the image with OCR
    const documentText = await documentProcessor.processImage(filepath);

    // Analyze with AI
    const analysis = await aiService.analyzeAdvisoryMinutes(documentText);

    // Update session
    sessionManager.addDocument(sessionId, {
      filename: filename,
      path: filepath,
      mimetype: "image/png",
      text: documentText,
      analysis: analysis,
      isCapture: true,
    });

    res.json({
      sessionId,
      documentId: filename,
      analysis,
      suggestedActions: analysis.suggestedActions || [],
    });
  } catch (error) {
    console.error("Error processing image capture:", error);
    res.status(500).json({ error: "Failed to process image capture" });
  }
});

// Execute suggested action
app.post("/api/sessions/:sessionId/actions/:actionId", async (req, res) => {
  try {
    const { sessionId, actionId } = req.params;
    const { actionData } = req.body;

    console.log(`🎯 Server: Executing action ${actionId} for session ${sessionId}`);
    console.log(`📋 Action data:`, JSON.stringify(actionData, null, 2));

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check if sessionManager has createSubSession method
    let subSessionId;
    if (typeof sessionManager.createSubSession === "function") {
      subSessionId = sessionManager.createSubSession(sessionId, actionId, actionData);
    } else {
      console.log("⚠️ createSubSession method not available, skipping sub-session creation");
      subSessionId = `sub_${actionId}_${Date.now()}`;
    }

    // Execute action based on type
    let result;
    console.log(`🔄 Executing action type: ${actionData.type}`);

    switch (actionData.type) {
      case "CREATE_CLIENT_NOTE":
        result = await bankingService.createClientNote(actionData);
        break;
      case "FILL_COMPLIANCE_FORM":
        result = await bankingService.fillComplianceForm(actionData);
        break;
      case "UPDATE_CLIENT_PROFILE":
        result = await bankingService.updateClientProfile(actionData);
        break;
      case "SCHEDULE_FOLLOW_UP":
        result = await bankingService.scheduleFollowUp(actionData);
        break;
      default:
        throw new Error(`Unknown action type: ${actionData.type}`);
    }

    console.log(`✅ Action executed successfully:`, result);

    // Update sub-session with result if method exists
    if (typeof sessionManager.updateSubSession === "function") {
      sessionManager.updateSubSession(sessionId, subSessionId, { result, status: "completed" });
    } else {
      console.log("⚠️ updateSubSession method not available, skipping sub-session update");
    }

    const response = {
      sessionId,
      subSessionId,
      actionId,
      result,
      status: "completed",
    };

    console.log(`📤 Server: Sending action execution response`);
    res.json(response);
  } catch (error) {
    console.error("❌ Server: Error executing action:", error);
    res.status(500).json({ error: "Failed to execute action", details: error.message });
  }
});

// Get all sessions (for dashboard)
app.get("/api/sessions", async (req, res) => {
  try {
    const sessions = sessionManager.getAllSessions();
    res.json(sessions);
  } catch (error) {
    console.error("Error retrieving sessions:", error);
    res.status(500).json({ error: "Failed to retrieve sessions" });
  }
});

// Get sessions by advisor
app.get("/api/advisors/:advisorId/sessions", async (req, res) => {
  try {
    const { advisorId } = req.params;
    const sessions = sessionManager.getSessionsByAdvisor(advisorId);
    res.json(sessions);
  } catch (error) {
    console.error("Error retrieving advisor sessions:", error);
    res.status(500).json({ error: "Failed to retrieve advisor sessions" });
  }
});

// Get AI status and available providers
app.get("/api/ai/status", async (req, res) => {
  try {
    const status = await aiService.getAIStatus();
    res.json(status);
  } catch (error) {
    console.error("Error getting AI status:", error);
    res.status(500).json({ error: "Failed to get AI status" });
  }
});

// Switch AI provider
app.post("/api/ai/provider", async (req, res) => {
  try {
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({ error: "Provider is required" });
    }

    const result = await aiService.switchProvider(provider);
    res.json(result);
  } catch (error) {
    console.error("Error switching AI provider:", error);
    res.status(400).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Vortex Office Agent Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🔑 OpenAI API Key configured: ${!!process.env.OPENAI_API_KEY}`);
});
