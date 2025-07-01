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
          console.log("📡 [DEBUG] Raw SSE status received:", statusData);
          console.log("📡 [DEBUG] Status type:", statusData.type);
          console.log("📡 [DEBUG] Status message:", statusData.message);
          console.log("📡 [DEBUG] Current processing stage before update:", state.processingStage);

          // Update processing stage based on status type
          let newStage = "";
          switch (statusData.type) {
            case "upload_start":
              newStage = "Document upload started";
              setProcessingStage(newStage);
              break;
            case "session_validated":
              newStage = "Session validated";
              setProcessingStage(newStage);
              break;
            case "processing_start":
              newStage = "Starting document processing";
              setProcessingStage(newStage);
              break;
            case "vision_start":
              newStage = "Image detected - starting vision processing";
              setProcessingStage(newStage);
              break;
            case "vision_processing":
              newStage = "Processing with AI vision model...";
              setProcessingStage(newStage);
              break;
            case "vision_complete":
              newStage = "Vision processing completed";
              setProcessingStage(newStage);
              break;
            case "text_extraction_start":
              newStage = "Extracting text from document";
              setProcessingStage(newStage);
              break;
            case "text_extraction_complete":
              newStage = "Text extraction completed";
              setProcessingStage(newStage);
              break;
            case "ai_analysis_start":
              newStage = "Running AI analysis...";
              setProcessingStage(newStage);
              break;
            case "ai_analysis_complete":
              newStage = "AI analysis completed";
              setProcessingStage(newStage);
              break;
            case "saving_document":
              newStage = "Saving document to session";
              setProcessingStage(newStage);
              break;
            case "processing_complete":
              newStage = "Processing complete!";
              setProcessingStage(newStage);
              // Only reset processing states when we receive completion message
              setTimeout(() => {
                setLoading(false);
                setProcessingDocument(false);
                console.log("🎯 Processing states reset after completion message");
              }, 200); // Reduced delay since navigation takes 3s anyway
              break;
            case "complete":
              newStage = "Processing complete!";
              setProcessingStage(newStage);
              // Only reset processing states when we receive completion message
              setTimeout(() => {
                setLoading(false);
                setProcessingDocument(false);
                console.log("🎯 Processing states reset after completion message");
              }, 200); // Reduced delay since navigation takes 3s anyway
              break;
            case "error":
              newStage = `Error: ${statusData.message}`;
              setProcessingStage(newStage);
              // Reset processing states on error
              setLoading(false);
              setProcessingDocument(false);
              break;
            default:
              if (statusData.message) {
                newStage = statusData.message;
                setProcessingStage(newStage);
              } else {
                console.log("📡 [DEBUG] Unknown status type, no action taken:", statusData.type);
              }
          }

          console.log("📡 [DEBUG] Setting new stage:", newStage);
          console.log("📡 [DEBUG] Status type matched:", statusData.type);

          // Force React to process this state update immediately to prevent batching issues
          if (newStage) {
            setTimeout(() => {
              console.log("📡 [DEBUG] Confirming stage was set:", newStage);
            }, 100);
          }

          // Calculate more gradual progress based on processing stage
          // HTTP upload covers 0-20%, SSE processing covers 20-100%
          let progressPercentage = statusData.progress;
          if (progressPercentage === null || progressPercentage === undefined) {
            switch (statusData.type) {
              case "upload_start":
                progressPercentage = 5; // Early upload stage
                break;
              case "session_validated":
                progressPercentage = 25; // After HTTP upload completes
                break;
              case "processing_start":
                progressPercentage = 30;
                break;
              case "vision_start":
              case "text_extraction_start":
                progressPercentage = 40;
                break;
              case "vision_processing":
                progressPercentage = 55;
                break;
              case "vision_complete":
              case "text_extraction_complete":
                progressPercentage = 70;
                break;
              case "ai_analysis_start":
                progressPercentage = 75;
                break;
              case "ai_analysis_complete":
                progressPercentage = 85;
                break;
              case "saving_document":
                progressPercentage = 90;
                break;
              case "processing_complete":
              case "complete":
                // Gradually increase to 100% instead of jumping
                progressPercentage = 95;
                // Set to 100% after a brief delay to show gradual completion
                setTimeout(() => {
                  setUploadProgress(100);
                }, 1000);
                break;
              default:
                // Don't update progress for unknown stages
                progressPercentage = null;
            }
          }

          // Update progress if we have a value
          if (progressPercentage !== null && progressPercentage !== undefined) {
            console.log("📡 [DEBUG] Setting progress:", progressPercentage);
            setUploadProgress(progressPercentage);
          } else {
            console.log("📡 [DEBUG] No progress calculation for this stage");
          }

          // Store detailed status info
          console.log("📡 [DEBUG] Storing processing details:", statusData);
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
        // Reset processing states on error
        setLoading(false);
        setProcessingDocument(false);
        throw error;
      } finally {
        // Don't immediately reset processing states here - let SSE completion message handle it
        // Only reset progress and stage after a delay to show completion state
        setTimeout(() => {
          setUploadProgress(0);
          setProcessingStage("");
          setProcessingDetails(null);
        }, 5000); // Increased delay to ensure completion is shown
      }
    },
    [state.currentSession?.id, loadSession, setLoading, setError, setProcessingDocument, setUploadProgress, setProcessingStage, setProcessingDetails, state.processingStage]
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
