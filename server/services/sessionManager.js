const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises;
const path = require("path");

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.dataDir = path.join(__dirname, "../data");
    this.sessionsFile = path.join(this.dataDir, "sessions.json");

    // Initialize persistent storage
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });

      // Load existing sessions
      await this.loadSessions();

      console.log(`💾 Session storage initialized with ${this.sessions.size} existing sessions`);
    } catch (error) {
      console.error("Error initializing session storage:", error);
    }
  }

  async loadSessions() {
    try {
      const data = await fs.readFile(this.sessionsFile, "utf8");
      const sessionsData = JSON.parse(data);

      // Convert back to Map with proper sub-sessions
      for (const [sessionId, sessionData] of Object.entries(sessionsData)) {
        // Convert subSessions back to Map
        const subSessions = new Map();
        if (sessionData.subSessions) {
          for (const [subId, subData] of Object.entries(sessionData.subSessions)) {
            subSessions.set(subId, subData);
          }
        }

        this.sessions.set(sessionId, {
          ...sessionData,
          subSessions,
        });
      }

      console.log(`📂 Loaded ${this.sessions.size} sessions from storage`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Error loading sessions:", error);
      }
      // File doesn't exist yet, start with empty sessions
    }
  }

  async saveSessions() {
    try {
      // Convert sessions Map to plain object for JSON serialization
      const sessionsData = {};
      for (const [sessionId, session] of this.sessions.entries()) {
        // Convert subSessions Map to plain object
        const subSessions = {};
        for (const [subId, subData] of session.subSessions.entries()) {
          subSessions[subId] = subData;
        }

        sessionsData[sessionId] = {
          ...session,
          subSessions,
        };
      }

      await fs.writeFile(this.sessionsFile, JSON.stringify(sessionsData, null, 2));
      console.log(`💾 Saved ${this.sessions.size} sessions to storage`);
    } catch (error) {
      console.error("Error saving sessions:", error);
    }
  }

  createSession(clientAdvisorId, clientId) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      clientAdvisorId,
      clientId,
      createdAt: new Date().toISOString(),
      status: "active",
      documents: [],
      subSessions: new Map(),
      metadata: {
        totalDocuments: 0,
        totalActions: 0,
        lastActivity: new Date().toISOString(),
      },
    };

    this.sessions.set(sessionId, session);
    console.log(`📝 Created new session: ${sessionId} for CA: ${clientAdvisorId}`);

    // Save to persistent storage
    this.saveSessions().catch((err) => console.error("Error saving session:", err));

    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Return session with proper structure for frontend
    return {
      ...session,
      subSessions: Array.from(session.subSessions.values()),
    };
  }

  getAllSessions() {
    return Array.from(this.sessions.values()).map((session) => ({
      ...session,
      subSessions: Array.from(session.subSessions.values()),
    }));
  }

  addDocument(sessionId, documentData) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const document = {
      id: uuidv4(),
      ...documentData,
      uploadedAt: new Date().toISOString(),
    };

    session.documents.push(document);
    session.metadata.totalDocuments++;
    session.metadata.lastActivity = new Date().toISOString();

    // Extract and store analysis and suggested actions at session level
    if (documentData.analysis) {
      session.analysis = documentData.analysis;
      session.suggestedActions = documentData.analysis.suggestedActions || [];
      console.log(`📊 Added analysis with ${session.suggestedActions.length} suggested actions to session`);
    }

    console.log(`📄 Added document to session ${sessionId}: ${document.filename}`);

    // Save to persistent storage
    this.saveSessions().catch((err) => console.error("Error saving session:", err));

    return document;
  }

  addAnalysisToDocument(sessionId, documentId, analysis) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const document = session.documents.find((d) => d.id === documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found in session ${sessionId}`);
    }

    document.analysis = analysis;
    session.analysis = analysis;
    session.suggestedActions = analysis.suggestedActions || [];

    console.log(`📊 Added analysis to document ${documentId}`);

    // Save to persistent storage
    this.saveSessions().catch((err) => console.error("Error saving session:", err));

    return document;
  }

  createSubSession(sessionId, actionId, actionData) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const subSessionId = uuidv4();
    const subSession = {
      id: subSessionId,
      sessionId,
      actionId,
      actionData,
      createdAt: new Date().toISOString(),
      status: "pending",
      result: null,
    };

    session.subSessions.set(subSessionId, subSession);
    session.metadata.totalActions++;
    session.metadata.lastActivity = new Date().toISOString();

    console.log(`🎯 Created sub-session ${subSessionId} for action ${actionId} in session ${sessionId}`);

    // Save to persistent storage
    this.saveSessions().catch((err) => console.error("Error saving session:", err));

    return subSessionId;
  }

  updateSubSession(sessionId, subSessionId, updateData) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const subSession = session.subSessions.get(subSessionId);
    if (!subSession) {
      throw new Error(`Sub-session ${subSessionId} not found`);
    }

    Object.assign(subSession, updateData, {
      updatedAt: new Date().toISOString(),
    });

    session.metadata.lastActivity = new Date().toISOString();

    console.log(`✅ Updated sub-session ${subSessionId} with status: ${updateData.status}`);

    // Save to persistent storage
    this.saveSessions().catch((err) => console.error("Error saving session:", err));

    return subSession;
  }

  getSubSession(sessionId, subSessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    return session.subSessions.get(subSessionId);
  }

  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "closed";
      session.closedAt = new Date().toISOString();
      console.log(`🔒 Closed session: ${sessionId}`);

      // Save to persistent storage
      this.saveSessions().catch((err) => console.error("Error saving session:", err));
    }
    return session;
  }

  getSessionsByAdvisor(clientAdvisorId) {
    return Array.from(this.sessions.values())
      .filter((session) => session.clientAdvisorId === clientAdvisorId)
      .sort((a, b) => new Date(b.metadata.lastActivity) - new Date(a.metadata.lastActivity))
      .map((session) => ({
        ...session,
        subSessions: Array.from(session.subSessions.values()),
      }));
  }

  getSessionStats() {
    const sessions = Array.from(this.sessions.values());
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === "active").length,
      totalDocuments: sessions.reduce((sum, s) => sum + s.metadata.totalDocuments, 0),
      totalActions: sessions.reduce((sum, s) => sum + s.metadata.totalActions, 0),
    };
  }
}

module.exports = { SessionManager };
