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
    if (session) {
      const document = session.documents.find((d) => d.id === documentId);
      if (document) {
        document.analysis = analysis;
        session.metadata.lastActivity = new Date().toISOString();

        // Save to persistent storage
        this.saveSessions().catch((err) => console.error("Error saving session:", err));
      }
    }
  }

  addArchiveToDocument(sessionId, documentId, archiveInfo) {
    const session = this.sessions.get(sessionId);
    if (session) {
      const document = session.documents.find((d) => d.id === documentId);
      if (document) {
        document.archive = archiveInfo;
        session.metadata.lastActivity = new Date().toISOString();

        // Update session-level archive tracking
        if (!session.metadata.archivedDocuments) {
          session.metadata.archivedDocuments = 0;
        }
        session.metadata.archivedDocuments++;
        session.metadata.lastArchiveDate = archiveInfo.archivedAt;

        // Add archive to session-level archive list for easy access
        if (!session.archives) {
          session.archives = [];
        }
        session.archives.push({
          documentId: documentId,
          archiveId: archiveInfo.id,
          filename: archiveInfo.filename,
          archivedAt: archiveInfo.archivedAt,
          fileSize: archiveInfo.fileSize,
          status: archiveInfo.status,
        });

        // Save to persistent storage
        this.saveSessions().catch((err) => console.error("Error saving session:", err));

        console.log(`🗄️  Archive info added to document ${documentId} in session ${sessionId}`);
        console.log(`📊 Session now has ${session.metadata.archivedDocuments} archived documents`);
      }
    }
  }

  addActionResult(sessionId, actionId, result) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Initialize actionResults if it doesn't exist
      if (!session.actionResults) {
        session.actionResults = {};
      }

      // Store the action result with enhanced tracking
      session.actionResults[actionId] = {
        ...result,
        actionId: actionId,
        executedAt: new Date().toISOString(),
        executionStatus: result.success ? "completed" : "failed",
        actionType: result.auditTrail?.action || "unknown",
        systemTarget: result.systemInfo?.targetSystem || "unknown",
      };

      // Update session-level action tracking
      if (!session.actionStatus) {
        session.actionStatus = {};
      }

      // Track individual action status by type and ID
      session.actionStatus[actionId] = {
        id: actionId,
        type: result.auditTrail?.action || "unknown",
        status: result.success ? "completed" : "failed",
        executedAt: new Date().toISOString(),
        systemTarget: result.systemInfo?.targetSystem || "unknown",
        transactionId: result.systemInfo?.transactionId || null,
        message: result.message || "Action processed",
        processingTime: result.systemInfo?.processingTimeMs || 0,
      };

      // Update metadata counters
      if (!session.metadata.executedActions) {
        session.metadata.executedActions = 0;
      }
      if (!session.metadata.failedActions) {
        session.metadata.failedActions = 0;
      }

      if (result.success) {
        session.metadata.executedActions++;
      } else {
        session.metadata.failedActions++;
      }

      session.metadata.lastActivity = new Date().toISOString();

      // Save to persistent storage
      this.saveSessions().catch((err) => console.error("Error saving session:", err));

      console.log(`✅ Action result stored for action ${actionId} in session ${sessionId}`);
      console.log(`📊 Session action stats: ${session.metadata.executedActions || 0} completed, ${session.metadata.failedActions || 0} failed`);
    }
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

  getSessionActionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const actionStatus = session.actionStatus || {};
    const actionResults = session.actionResults || {};

    // Combine action status with suggested actions to provide complete picture
    const suggestedActions = session.suggestedActions || [];

    const detailedStatus = suggestedActions.map((action) => {
      const status = actionStatus[action.id];
      const result = actionResults[action.id];

      return {
        id: action.id,
        type: action.type,
        description: action.description,
        priority: action.priority,
        status: status ? status.status : "pending",
        executedAt: status ? status.executedAt : null,
        systemTarget: status ? status.systemTarget : action.systemContext?.targetSystem,
        transactionId: status ? status.transactionId : null,
        message: status ? status.message : null,
        processingTime: status ? status.processingTime : null,
        hasResult: !!result,
        result: result || null,
      };
    });

    return {
      sessionId: sessionId,
      totalActions: suggestedActions.length,
      executedActions: Object.keys(actionStatus).length,
      completedActions: Object.values(actionStatus).filter((a) => a.status === "completed").length,
      failedActions: Object.values(actionStatus).filter((a) => a.status === "failed").length,
      pendingActions: suggestedActions.length - Object.keys(actionStatus).length,
      actions: detailedStatus,
      lastExecutionTime: session.metadata.lastActivity,
    };
  }

  getSessionStats() {
    const sessions = Array.from(this.sessions.values());
    const totalArchivedDocuments = sessions.reduce((sum, s) => sum + (s.metadata.archivedDocuments || 0), 0);
    const sessionsWithArchives = sessions.filter((s) => s.metadata.archivedDocuments > 0).length;
    const totalExecutedActions = sessions.reduce((sum, s) => sum + (s.metadata.executedActions || 0), 0);
    const totalFailedActions = sessions.reduce((sum, s) => sum + (s.metadata.failedActions || 0), 0);
    const sessionsWithExecutedActions = sessions.filter((s) => s.metadata.executedActions > 0).length;

    // Calculate action type breakdown
    const actionTypeStats = {};
    sessions.forEach((session) => {
      if (session.actionStatus) {
        Object.values(session.actionStatus).forEach((action) => {
          const type = action.type;
          if (!actionTypeStats[type]) {
            actionTypeStats[type] = { completed: 0, failed: 0, total: 0 };
          }
          actionTypeStats[type].total++;
          if (action.status === "completed") {
            actionTypeStats[type].completed++;
          } else if (action.status === "failed") {
            actionTypeStats[type].failed++;
          }
        });
      }
    });

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === "active").length,
      totalDocuments: sessions.reduce((sum, s) => sum + s.metadata.totalDocuments, 0),
      totalActions: sessions.reduce((sum, s) => sum + s.metadata.totalActions, 0),
      totalArchivedDocuments,
      sessionsWithArchives,
      totalExecutedActions,
      totalFailedActions,
      sessionsWithExecutedActions,
      archiveRate: sessions.length > 0 ? Math.round((totalArchivedDocuments / sessions.reduce((sum, s) => sum + s.metadata.totalDocuments, 0)) * 100) : 0,
      actionExecutionRate: totalExecutedActions + totalFailedActions > 0 ? Math.round((totalExecutedActions / (totalExecutedActions + totalFailedActions)) * 100) : 0,
      actionTypeStats: actionTypeStats,
    };
  }
}

module.exports = { SessionManager };
