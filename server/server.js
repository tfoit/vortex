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
const documentProcessor = new DocumentProcessor();
const aiService = new AIService();
const bankingService = new MockBankingService();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
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

// Middleware to log all requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`🌐 ${timestamp} - ${req.method} ${req.url}`);
  if (req.method === "POST" && req.url.includes("/upload")) {
    console.log("📋 Upload request headers:", req.headers);
    console.log("📋 Content-Type:", req.get("Content-Type"));
  }
  next();
});

// Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
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
  console.log("📤 Server: Upload endpoint called");
  console.log("📊 Request details:", {
    sessionId: req.params.sessionId,
    hasFile: !!req.file,
    fileName: req.file?.originalname,
    fileSize: req.file?.size,
    fileType: req.file?.mimetype,
    filePath: req.file?.path,
  });

  try {
    const { sessionId } = req.params;
    const file = req.file;

    if (!file) {
      console.error("❌ No file provided in upload request");
      return res.status(400).json({ error: "No file provided" });
    }

    console.log("🔍 Server: Looking for session:", sessionId);
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      console.error("❌ Session not found:", sessionId);
      return res.status(404).json({ error: "Session not found" });
    }
    console.log("✅ Session found:", session.id);

    console.log("📄 Server: Processing document...");
    const documentId = `document-${Date.now()}-${Math.floor(Math.random() * 1000000000)}${path.extname(file.originalname)}`;

    console.log("🤖 Server: Starting AI analysis...");
    let analysis;
    try {
      analysis = await aiService.analyzeAdvisoryMinutes(file.path, file.mimetype);
      console.log("✅ Server: AI analysis completed");
      console.log("📊 Server: Analysis result:", analysis);
    } catch (aiError) {
      console.error("❌ AI analysis failed:", aiError);
      console.error("🔍 AI Error details:", {
        message: aiError.message,
        stack: aiError.stack,
        filePath: file.path,
        fileType: file.mimetype,
      });
      throw aiError;
    }

    console.log("💾 Server: Saving document and analysis to session...");
    const document = {
      id: documentId,
      filename: file.originalname,
      size: file.size,
      type: file.mimetype,
      path: file.path,
      uploadedAt: new Date().toISOString(),
    };

    // Add document to session
    session.documents.push(document);
    session.analysis = analysis;
    session.suggestedActions = analysis.suggestedActions || [];
    session.metadata.totalDocuments = session.documents.length;
    session.metadata.lastAnalyzed = new Date().toISOString();

    console.log("📊 Added analysis with", analysis.suggestedActions?.length || 0, "suggested actions to session");
    console.log("📄 Added document to session", sessionId + ":", file.originalname);

    // Save session
    try {
      sessionManager.updateSession(sessionId, session);
      console.log("✅ Session saved successfully");
    } catch (saveError) {
      console.error("❌ Failed to save session:", saveError);
      throw saveError;
    }

    console.log("📤 Server: Sending response to client");
    const response = {
      sessionId,
      documentId,
      analysis,
      suggestedActions: analysis.suggestedActions || [],
    };
    console.log("📊 Server: Response:", response);

    res.json(response);
  } catch (error) {
    console.error("❌ Server: Upload endpoint error:", error);
    console.error("🔍 Error details:", {
      message: error.message,
      stack: error.stack,
      sessionId: req.params.sessionId,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
    });
    res.status(500).json({
      error: "Failed to process document",
      details: error.message,
      sessionId: req.params.sessionId,
      fileName: req.file?.originalname,
    });
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

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Create sub-session for this action
    const subSessionId = sessionManager.createSubSession(sessionId, actionId, actionData);

    // Execute action based on type
    let result;
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

    // Update sub-session with result
    sessionManager.updateSubSession(sessionId, subSessionId, { result, status: "completed" });

    res.json({
      sessionId,
      subSessionId,
      actionId,
      result,
      status: "completed",
    });
  } catch (error) {
    console.error("Error executing action:", error);
    res.status(500).json({ error: "Failed to execute action" });
  }
});

// Get all sessions
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
