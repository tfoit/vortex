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

// Connect services - DocumentProcessor needs access to AI service for vision
setTimeout(() => {
  // Wait for AI service to initialize, then connect to document processor
  documentProcessor.setAIService(aiService);
  if (aiService.ollamaService) {
    documentProcessor.setOllamaService(aiService.ollamaService);
    console.log("🔗 Connected DocumentProcessor to AI service and Ollama service for vision capabilities");
  } else {
    console.log("🔗 Connected DocumentProcessor to AI service");
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

// SSE endpoint for processing status updates
app.get("/api/sessions/:sessionId/status", (req, res) => {
  const { sessionId } = req.params;

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Store the response object for this session
  if (!global.sseConnections) {
    global.sseConnections = new Map();
  }
  global.sseConnections.set(sessionId, res);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: "connected", message: "Status stream connected" })}\n\n`);

  // Handle client disconnect
  req.on("close", () => {
    global.sseConnections.delete(sessionId);
  });
});

// Helper function to send status updates
function sendStatusUpdate(sessionId, type, message, progress = null) {
  if (global.sseConnections && global.sseConnections.has(sessionId)) {
    const data = {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...(progress !== null && { progress }),
    };

    const res = global.sseConnections.get(sessionId);
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      console.log(`📡 SSE: Sent status to ${sessionId}: ${message}`);
    } catch (error) {
      console.error(`❌ SSE: Failed to send status to ${sessionId}:`, error.message);
      global.sseConnections.delete(sessionId);
    }
  }
}

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

    // Send initial status update
    sendStatusUpdate(sessionId, "upload_start", "Document upload started", 10);

    if (!file) {
      console.log("❌ Server: No file uploaded");
      console.log("📋 Request body keys:", Object.keys(req.body));
      console.log("📋 Request files:", req.files);
      sendStatusUpdate(sessionId, "error", "No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      console.log(`❌ Server: Session ${sessionId} not found`);
      sendStatusUpdate(sessionId, "error", "Session not found");
      return res.status(404).json({ error: "Session not found" });
    }

    console.log("✅ Server: Session found, processing document...");
    sendStatusUpdate(sessionId, "session_validated", "Session validated, starting document processing", 20);

    // Intelligent document processing pipeline
    console.log("🔄 Server: Starting intelligent document processing pipeline...");
    sendStatusUpdate(sessionId, "processing_start", "Starting intelligent document processing pipeline", 25);

    let documentText = "";
    let analysis = null;
    let processingMethod = "unknown";

    // Check if it's an image file
    const isImage = documentProcessor.isImageType(file.mimetype);

    if (isImage) {
      console.log("📸 Server: Image detected - using vision-based processing");
      sendStatusUpdate(sessionId, "vision_start", "Image detected - starting vision-based processing", 40);
      processingMethod = "vision";

      // Use vision model for comprehensive analysis (includes text extraction)
      sendStatusUpdate(sessionId, "vision_processing", "Processing image with AI vision model...", 50);
      analysis = await documentProcessor.getImageAnalysis(file.path, "advisory_minutes");
      documentText = analysis.extractedText || "";
      console.log(`👁️ Server: Vision analysis completed - extracted ${documentText.length} characters`);
      sendStatusUpdate(sessionId, "vision_complete", `Vision analysis completed - extracted ${documentText.length} characters`, 70);
    } else {
      console.log("📄 Server: Non-image document - using text extraction");
      sendStatusUpdate(sessionId, "text_extraction_start", "Processing text document", 40);
      processingMethod = "text_extraction";
      documentText = await documentProcessor.processDocument(file.path, file.mimetype);
      console.log(`📝 Server: Text extraction completed - ${documentText.length} characters`);
      sendStatusUpdate(sessionId, "text_extraction_complete", `Text extraction completed - ${documentText.length} characters`, 60);
    }

    // If we don't have analysis yet (non-image or vision failed), run AI analysis
    if (!analysis && documentText.length > 0) {
      console.log("🤖 Server: Running AI analysis on extracted text...");
      sendStatusUpdate(sessionId, "ai_analysis_start", "Running AI analysis on extracted text...", 75);
      try {
        analysis = await aiService.analyzeAdvisoryMinutes(documentText);
        console.log("✅ Server: AI analysis completed");
        sendStatusUpdate(sessionId, "ai_analysis_complete", `AI analysis completed with ${analysis?.suggestedActions?.length || 0} suggested actions`, 85);
      } catch (aiError) {
        console.error("❌ Server: AI analysis failed:", aiError.message);
        sendStatusUpdate(sessionId, "ai_analysis_error", `AI analysis failed: ${aiError.message}`, 85);
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
    sendStatusUpdate(sessionId, "saving_document", "Saving document with analysis to session...", 90);
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
    sendStatusUpdate(sessionId, "processing_complete", `Processing complete! Found ${analysis?.suggestedActions?.length || 0} suggested actions`, 100);

    // Close SSE connection after a brief delay
    setTimeout(() => {
      if (global.sseConnections && global.sseConnections.has(sessionId)) {
        try {
          const sseRes = global.sseConnections.get(sessionId);
          sseRes.write(`data: ${JSON.stringify({ type: "complete", message: "Processing finished" })}\n\n`);
          sseRes.end();
        } catch (error) {
          console.error("Error closing SSE connection:", error.message);
        }
        global.sseConnections.delete(sessionId);
      }
    }, 1000);

    res.json(response);
  } catch (error) {
    console.error("❌ Server: Error processing document upload:", error);
    sendStatusUpdate(sessionId, "error", `Processing failed: ${error.message}`);

    // Close SSE connection on error
    setTimeout(() => {
      if (global.sseConnections && global.sseConnections.has(sessionId)) {
        try {
          const sseRes = global.sseConnections.get(sessionId);
          sseRes.end();
        } catch (sseError) {
          console.error("Error closing SSE connection on error:", sseError.message);
        }
        global.sseConnections.delete(sessionId);
      }
    }, 1000);

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

    // Process the image with vision analysis
    console.log("📸 Server: Processing camera capture with vision model");
    const analysis = await documentProcessor.getImageAnalysis(filepath, "advisory_minutes");
    const documentText = analysis.extractedText || "";

    // Update session
    sessionManager.addDocument(sessionId, {
      filename: filename,
      path: filepath,
      mimetype: "image/png",
      text: documentText,
      analysis: analysis,
      processingMethod: "vision",
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
