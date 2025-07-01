import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { apiService } from "../services/apiService";

const SessionContext = createContext();

// Action types
const SESSION_ACTIONS = {
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  SET_CURRENT_SESSION: "SET_CURRENT_SESSION",
  ADD_DOCUMENT: "ADD_DOCUMENT",
  ADD_ANALYSIS: "ADD_ANALYSIS",
  UPDATE_ACTION_STATUS: "UPDATE_ACTION_STATUS",
  CLEAR_SESSION: "CLEAR_SESSION",
  SET_SESSIONS_LIST: "SET_SESSIONS_LIST",
  SET_PROCESSING_DOCUMENT: "SET_PROCESSING_DOCUMENT",
  SET_UPLOAD_PROGRESS: "SET_UPLOAD_PROGRESS",
  SET_PROCESSING_STAGE: "SET_PROCESSING_STAGE",
  SET_PROCESSING_DETAILS: "SET_PROCESSING_DETAILS",
};

// Initial state
const initialState = {
  currentSession: null,
  sessions: [],
  loading: false,
  error: null,
  processingDocument: false,
  uploadProgress: 0,
  processingStage: "",
  processingDetails: null,
};

// Reducer
function sessionReducer(state, action) {
  switch (action.type) {
    case SESSION_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error,
      };

    case SESSION_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case SESSION_ACTIONS.SET_CURRENT_SESSION:
      return {
        ...state,
        currentSession: action.payload,
        error: null,
      };

    case SESSION_ACTIONS.ADD_DOCUMENT:
      return {
        ...state,
        currentSession: state.currentSession
          ? {
              ...state.currentSession,
              documents: [...(state.currentSession.documents || []), action.payload],
            }
          : null,
      };

    case SESSION_ACTIONS.ADD_ANALYSIS:
      return {
        ...state,
        currentSession: state.currentSession
          ? {
              ...state.currentSession,
              analysis: action.payload.analysis,
              suggestedActions: action.payload.suggestedActions || [],
            }
          : null,
      };

    case SESSION_ACTIONS.UPDATE_ACTION_STATUS:
      return {
        ...state,
        currentSession: state.currentSession
          ? {
              ...state.currentSession,
              actionResults: {
                ...state.currentSession.actionResults,
                [action.payload.actionId]: action.payload.result,
              },
            }
          : null,
      };

    case SESSION_ACTIONS.CLEAR_SESSION:
      return {
        ...state,
        currentSession: null,
        error: null,
      };

    case SESSION_ACTIONS.SET_SESSIONS_LIST:
      return {
        ...state,
        sessions: action.payload,
      };

    case SESSION_ACTIONS.SET_PROCESSING_DOCUMENT:
      return {
        ...state,
        processingDocument: action.payload,
      };

    case SESSION_ACTIONS.SET_UPLOAD_PROGRESS:
      return {
        ...state,
        uploadProgress: action.payload,
      };

    case SESSION_ACTIONS.SET_PROCESSING_STAGE:
      return {
        ...state,
        processingStage: action.payload,
      };

    case SESSION_ACTIONS.SET_PROCESSING_DETAILS:
      return {
        ...state,
        processingDetails: action.payload,
      };

    default:
      return state;
  }
}

// Provider component
export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const setLoading = useCallback((loading) => {
    dispatch({ type: SESSION_ACTIONS.SET_LOADING, payload: loading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: SESSION_ACTIONS.SET_ERROR, payload: error });
  }, []);

  const setProcessingDocument = useCallback((processing) => {
    dispatch({ type: SESSION_ACTIONS.SET_PROCESSING_DOCUMENT, payload: processing });
  }, []);

  const setUploadProgress = useCallback((progress) => {
    dispatch({ type: SESSION_ACTIONS.SET_UPLOAD_PROGRESS, payload: progress });
  }, []);

  const setProcessingStage = useCallback((stage) => {
    dispatch({ type: SESSION_ACTIONS.SET_PROCESSING_STAGE, payload: stage });
  }, []);

  const setProcessingDetails = useCallback((details) => {
    dispatch({ type: SESSION_ACTIONS.SET_PROCESSING_DETAILS, payload: details });
  }, []);

  const loadSession = useCallback(
    async (sessionId) => {
      try {
        setLoading(true);
        const session = await apiService.getSession(sessionId);
        dispatch({ type: SESSION_ACTIONS.SET_CURRENT_SESSION, payload: session });
        return session;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  const loadSessions = useCallback(async () => {
    try {
      const sessions = await apiService.getAllSessions();
      dispatch({ type: SESSION_ACTIONS.SET_SESSIONS_LIST, payload: sessions });
    } catch (error) {
      console.error("Failed to load sessions:", error);
      // Don't set error for this as it's background loading
    }
  }, []);

  const loadCurrentSessionFromStorage = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem("vortex_current_session_id");
      if (sessionId) {
        console.log(`📂 Restoring session: ${sessionId}`);
        await loadSession(sessionId);
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
      // Clear invalid session data
      localStorage.removeItem("vortex_current_session_id");
      localStorage.removeItem("vortex_current_session");
    }
  }, [loadSession]);

  // Load sessions and current session from localStorage on mount
  useEffect(() => {
    loadSessions();
    loadCurrentSessionFromStorage();
  }, [loadSessions, loadCurrentSessionFromStorage]);

  // Save current session to localStorage whenever it changes
  useEffect(() => {
    if (state.currentSession) {
      localStorage.setItem("vortex_current_session_id", state.currentSession.id);
      localStorage.setItem("vortex_current_session", JSON.stringify(state.currentSession));
    }
  }, [state.currentSession]);

  // Actions

  const createSession = useCallback(
    async (clientAdvisorId = "demo_advisor", clientId = "demo_client") => {
      try {
        setLoading(true);
        const session = await apiService.createSession(clientAdvisorId, clientId);
        dispatch({ type: SESSION_ACTIONS.SET_CURRENT_SESSION, payload: session });

        // Add to sessions list
        dispatch({
          type: SESSION_ACTIONS.SET_SESSIONS_LIST,
          payload: [...state.sessions, session],
        });

        return session;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [state.sessions, setLoading, setError]
  );

  const uploadDocument = useCallback(
    async (file, onProgress, sessionId) => {
      const targetSessionId = sessionId || state.currentSession?.id;
      if (!targetSessionId) {
        throw new Error("No active session");
      }

      try {
        setLoading(true);
        setProcessingDocument(true);
        setUploadProgress(0);
        setProcessingStage("Initializing...");
        setProcessingDetails(null);
        console.log("📤 Starting automated document upload and processing...");

        // Enhanced progress tracking that updates both local progress and vortex animation
        const enhancedProgressCallback = (progress) => {
          setUploadProgress(progress);
          if (onProgress) {
            onProgress(progress);
          }
        };

        // SSE status update callback for real-time processing feedback
        const statusUpdateCallback = (statusData) => {
          console.log("📡 Received status update:", statusData);

          // Update processing stage based on status type
          switch (statusData.type) {
            case "upload_start":
              setProcessingStage("Document upload started");
              break;
            case "session_validated":
              setProcessingStage("Session validated");
              break;
            case "processing_start":
              setProcessingStage("Starting document processing");
              break;
            case "vision_start":
              setProcessingStage("Image detected - starting vision processing");
              break;
            case "vision_processing":
              setProcessingStage("Processing with AI vision model...");
              break;
            case "vision_complete":
              setProcessingStage("Vision processing completed");
              break;
            case "text_extraction_start":
              setProcessingStage("Extracting text from document");
              break;
            case "text_extraction_complete":
              setProcessingStage("Text extraction completed");
              break;
            case "ai_analysis_start":
              setProcessingStage("Running AI analysis...");
              break;
            case "ai_analysis_complete":
              setProcessingStage("AI analysis completed");
              break;
            case "saving_document":
              setProcessingStage("Saving document to session");
              break;
            case "processing_complete":
              setProcessingStage("Processing complete!");
              break;
            case "complete":
              setProcessingStage("Processing complete!");
              break;
            case "error":
              setProcessingStage(`Error: ${statusData.message}`);
              break;
            default:
              if (statusData.message) {
                setProcessingStage(statusData.message);
              }
          }

          // Update progress if provided
          if (statusData.progress !== null && statusData.progress !== undefined) {
            setUploadProgress(statusData.progress);
          }

          // Store detailed status info
          setProcessingDetails(statusData);
        };

        // Upload and get complete analysis in one step with SSE status updates
        const result = await apiService.uploadDocument(targetSessionId, file, enhancedProgressCallback, statusUpdateCallback);
        console.log("✅ Document upload completed with analysis:", result);

        // Reload session to get the updated data with analysis
        const updatedSession = await loadSession(targetSessionId);
        console.log("🔄 Session reloaded after upload");

        return {
          ...result,
          session: updatedSession,
          fullyProcessed: true,
        };
      } catch (error) {
        setError(error.message);
        setProcessingStage(`Error: ${error.message}`);
        throw error;
      } finally {
        setLoading(false);
        setProcessingDocument(false);
        // Don't reset progress and stage immediately to show completion state
        setTimeout(() => {
          setUploadProgress(0);
          setProcessingStage("");
          setProcessingDetails(null);
        }, 3000);
      }
    },
    [state.currentSession?.id, loadSession, setLoading, setError, setProcessingDocument, setUploadProgress, setProcessingStage, setProcessingDetails]
  );

  const analyzeDocument = useCallback(
    async (sessionId, documentId) => {
      try {
        setLoading(true);
        const result = await apiService.analyzeDocument(sessionId, documentId);
        await loadSession(sessionId); // Reload to get the final analysis
        return result;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadSession, setLoading, setError]
  );

  const analyzeDocumentWithVision = useCallback(
    async (sessionId, documentId) => {
      try {
        setLoading(true);
        const result = await apiService.analyzeDocumentWithVision(sessionId, documentId);
        await loadSession(sessionId); // Reload to get the final analysis
        return result;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadSession, setLoading, setError]
  );

  const processImageCapture = useCallback(
    async (imageData) => {
      if (!state.currentSession) {
        throw new Error("No active session");
      }

      try {
        setLoading(true);
        setProcessingDocument(true);

        const result = await apiService.processImageCapture(state.currentSession.id, imageData);

        // After capture processing, reload the session to get the updated data
        await loadSession(state.currentSession.id);

        return result;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
        setProcessingDocument(false);
      }
    },
    [state.currentSession, loadSession, setLoading, setError, setProcessingDocument]
  );

  const executeAction = useCallback(
    async (sessionId, actionId) => {
      if (!state.currentSession) {
        throw new Error("No active session");
      }

      try {
        setLoading(true);

        // Find the action data from the suggested actions
        const action = state.currentSession.suggestedActions?.find((a) => a.id === actionId);
        if (!action) {
          throw new Error(`Action ${actionId} not found`);
        }

        console.log(`🎯 Executing action: ${action.type} (${actionId})`);
        const result = await apiService.executeAction(sessionId, actionId, action);

        // Update action status
        dispatch({
          type: SESSION_ACTIONS.UPDATE_ACTION_STATUS,
          payload: {
            actionId,
            result,
          },
        });

        // Reload session to get updated data
        await loadSession(sessionId);

        return result;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [state.currentSession, loadSession, setLoading, setError]
  );

  const clearSession = useCallback(() => {
    dispatch({ type: SESSION_ACTIONS.CLEAR_SESSION });
    // Clear from localStorage
    localStorage.removeItem("vortex_current_session_id");
    localStorage.removeItem("vortex_current_session");
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: SESSION_ACTIONS.SET_ERROR, payload: null });
  }, []);

  const value = React.useMemo(
    () => ({
      ...state,
      // Actions
      createSession,
      loadSession,
      loadSessions,
      uploadDocument,
      analyzeDocument,
      analyzeDocumentWithVision,
      processImageCapture,
      executeAction,
      clearSession,
      clearError,
      setError,
      setProcessingDocument,
      setUploadProgress,
      setProcessingStage,
      setProcessingDetails,
    }),
    [state, createSession, loadSession, loadSessions, uploadDocument, analyzeDocument, analyzeDocumentWithVision, processImageCapture, executeAction, clearSession, clearError, setError, setProcessingDocument, setUploadProgress, setProcessingStage, setProcessingDetails]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// Hook to use the session context
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
