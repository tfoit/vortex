import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import SessionPage from "./components/SessionPage";
import DashboardPage from "./components/DashboardPage";
import IntroAnimation from "./components/IntroAnimation";
import { SessionProvider } from "./context/SessionContext";
import { apiService } from "./services/apiService";
import "./App.css";

// Main app component
function MainApp() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [appError, setAppError] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [introCompleted, setIntroCompleted] = useState(false);

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

  const handleIntroComplete = () => {
    setIntroCompleted(true);
    // Add a small delay before hiding intro for smooth transition
    setTimeout(() => {
      setShowIntro(false);
    }, 800);
  };

  // Skip intro if user has seen it before (stored in localStorage)
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("vortex-intro-seen");
    const isDevelopment = process.env.NODE_ENV === "development";
    const skipIntroForDev = isDevelopment && localStorage.getItem("vortex-skip-intro-dev") === "true";

    console.log("Intro debug:", {
      hasSeenIntro,
      isDevelopment,
      skipIntroForDev,
      showIntro,
      nodeEnv: process.env.NODE_ENV,
    });

    if (hasSeenIntro || skipIntroForDev) {
      console.log("Skipping intro due to localStorage flags");
      setShowIntro(false);
      setIntroCompleted(true);
    } else {
      console.log("Intro should show");
    }
  }, [showIntro]);

  const handleSkipIntro = () => {
    localStorage.setItem("vortex-intro-seen", "true");
    setShowIntro(false);
    setIntroCompleted(true);
  };

  // Development helper to permanently skip intro
  const handleSkipIntroDev = () => {
    if (process.env.NODE_ENV === "development") {
      localStorage.setItem("vortex-skip-intro-dev", "true");
      handleSkipIntro();
    }
  };

  // Show intro animation
  if (showIntro) {
    console.log("Rendering intro animation");
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <IntroAnimation width={typeof window !== "undefined" ? window.innerWidth : 1200} height={typeof window !== "undefined" ? window.innerHeight : 800} onComplete={handleIntroComplete} />

        {/* Skip button for returning users */}
        <button onClick={handleSkipIntro} className="absolute top-4 right-4 z-10 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Skip intro
        </button>

        {/* Development skip button */}
        {process.env.NODE_ENV === "development" && (
          <button onClick={handleSkipIntroDev} className="absolute top-4 left-4 z-10 px-4 py-2 text-sm text-blue-500 hover:text-blue-700 transition-colors" title="Skip intro permanently in development">
            Skip (Dev)
          </button>
        )}

        {/* Progress indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    );
  }

  console.log("Not showing intro, showIntro =", showIntro);

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
    <Router>
      <div className="App">
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
  );
}

// App wrapper with SessionProvider
function App() {
  return (
    <SessionProvider>
      <MainApp />
    </SessionProvider>
  );
}

export default App;
