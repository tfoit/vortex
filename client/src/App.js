import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import SessionPage from "./components/SessionPage";
import DashboardPage from "./components/DashboardPage";
import { SessionProvider } from "./context/SessionContext";
import { apiService } from "./services/apiService";
import "./App.css";
import VortexAnimation from "./components/VortexAnimation";

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [appError, setAppError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Don't check API health on startup to avoid purple screen flashing
    // API errors will be handled by individual components when they make requests

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const checkApiHealth = async () => {
    try {
      // Add a timeout and retry logic to make it more robust
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));

      await Promise.race([apiService.healthCheck(), timeoutPromise]);
      setAppError(null);
    } catch (error) {
      console.error("API health check failed:", error);
      // Only show error after a delay to avoid flashing on quick page loads
      setTimeout(() => {
        setAppError("Unable to connect to server. Please check your connection.");
      }, 2000);
    }
  };

  if (appError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-light text-gray-800 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-6 font-light">{appError}</p>
          <button onClick={checkApiHealth} className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-light">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider>
      <Router>
        <div className="App">
          <button
            onClick={() => setProcessing((p) => !p)}
            style={{
              margin: "24px auto 12px",
              display: "block",
              padding: "8px 20px",
              fontSize: "1rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: processing ? "#E60100" : "#f5f5f5",
              color: processing ? "white" : "#222",
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {processing ? "Stop Processing" : "Start Processing"}
          </button>
          <VortexAnimation processing={processing} />
          {!isOnline && <div className="bg-yellow-500 text-white px-4 py-2 text-center">⚠️ You're offline. Some features may not be available.</div>}

          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/session/:sessionId" element={<SessionPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SessionProvider>
  );
}

export default App;
