import React, { createContext, useContext, useReducer, useEffect } from "react";
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
};

// Initial state
const initialState = {
  currentSession: null,
  sessions: [],
  loading: false,
  error: null,
  processingDocument: false,
  uploadProgress: 0,
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

    default:
      return state;
  }
}

// Provider component
export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  // Load sessions and current session from localStorage on mount
  useEffect(() => {
    loadSessions();
    loadCurrentSessionFromStorage();
  }, []);

  // Save current session to localStorage whenever it changes
  useEffect(() => {
    if (state.currentSession) {
      localStorage.setItem("vortex_current_session_id", state.currentSession.id);
      localStorage.setItem("vortex_current_session", JSON.stringify(state.currentSession));
    }
  }, [state.currentSession]);

  // Load current session from localStorage
  const loadCurrentSessionFromStorage = async () => {
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
  };

  // Actions
  const setLoading = (loading) => {
    dispatch({ type: SESSION_ACTIONS.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: SESSION_ACTIONS.SET_ERROR, payload: error });
  };

  const createSession = async (clientAdvisorId = "demo_advisor", clientId = "demo_client") => {
    try {
      setLoading(true);
      const session = await apiService.createSession(clientAdvisorId, clientId);
      dispatch({ type: SESSION_ACTIONS.SET_CURRENT_SESSION, payload: session });

      // Add to sessions list
      const updatedSessions = [...state.sessions, session];
      dispatch({ type: SESSION_ACTIONS.SET_SESSIONS_LIST, payload: updatedSessions });

      return session;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (sessionId) => {
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
  };

  const loadSessions = async () => {
    try {
      const sessions = await apiService.getAllSessions();
      dispatch({ type: SESSION_ACTIONS.SET_SESSIONS_LIST, payload: sessions });
    } catch (error) {
      console.error("Failed to load sessions:", error);
      // Don't set error for this as it's background loading
    }
  };

  const uploadDocument = async (file, onProgress) => {
    if (!state.currentSession) {
      throw new Error("No active session");
    }

    try {
      setLoading(true);

      const result = await apiService.uploadDocument(state.currentSession.id, file, onProgress);

      // After upload, reload the session to get the updated data with the new document
      await loadSession(state.currentSession.id);

      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const processImageCapture = async (imageData) => {
    if (!state.currentSession) {
      throw new Error("No active session");
    }

    try {
      setLoading(true);

      const result = await apiService.processImageCapture(state.currentSession.id, imageData);

      // After capture processing, reload the session to get the updated data
      await loadSession(state.currentSession.id);

      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (actionId, actionData) => {
    if (!state.currentSession) {
      throw new Error("No active session");
    }

    try {
      setLoading(true);

      const result = await apiService.executeAction(state.currentSession.id, actionId, actionData);

      // Update action status
      dispatch({
        type: SESSION_ACTIONS.UPDATE_ACTION_STATUS,
        payload: {
          actionId,
          result,
        },
      });

      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearSession = () => {
    dispatch({ type: SESSION_ACTIONS.CLEAR_SESSION });
    // Clear from localStorage
    localStorage.removeItem("vortex_current_session_id");
    localStorage.removeItem("vortex_current_session");
  };

  const clearError = () => {
    dispatch({ type: SESSION_ACTIONS.SET_ERROR, payload: null });
  };

  const value = {
    ...state,
    // Actions
    createSession,
    loadSession,
    loadSessions,
    uploadDocument,
    processImageCapture,
    executeAction,
    clearSession,
    clearError,
    setError,
  };

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
