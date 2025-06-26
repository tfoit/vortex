import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, FileText, CheckCircle, Clock, TrendingUp, AlertTriangle, Upload, Camera } from "lucide-react";

import { useSession } from "../context/SessionContext";
import VortexAnimation from "./VortexAnimation";
import CameraCapture from "./CameraCapture";

const DashboardPage = () => {
  const { sessions, currentSession: activeSession, uploadDocument, processingDocument, createSession, loadSessions, loading } = useSession();
  const navigate = useNavigate();

  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [shouldNavigate, setShouldNavigate] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (shouldNavigate && activeSession?.id && activeSession.documents?.length > 0) {
      const timer = setTimeout(() => {
        navigate(`/session/${activeSession.id}`);
        setShouldNavigate(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [shouldNavigate, activeSession, navigate]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleDocumentUpload(files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await handleDocumentUpload(files[0]);
    }
  };

  const handleDocumentUpload = async (file) => {
    try {
      console.log("🚀 Starting upload process for file:", file.name, file.size, file.type);
      setUploadProgress(0);
      setProcessingStage("Initializing...");

      let sessionIdToUpload;
      // Create session if none exists
      if (!activeSession) {
        console.log("📝 Creating new session...");
        setProcessingStage("Creating session...");
        const newSession = await createSession();
        console.log("✅ Session created:", newSession?.id);
        sessionIdToUpload = newSession.id;
        setUploadProgress(20);
      } else {
        console.log("📝 Using existing session:", activeSession.id);
        sessionIdToUpload = activeSession.id;
      }

      // Upload the document with progress tracking
      console.log("📤 Starting document upload...");
      setProcessingStage("Uploading document...");
      await uploadDocument(
        file,
        (progress) => {
          console.log("📊 Upload progress:", progress);
          setUploadProgress(20 + progress * 0.7); // 20-90%
        },
        sessionIdToUpload
      );
      console.log("✅ Upload completed");

      setUploadProgress(100);
      setProcessingStage("Analysis complete!");
      console.log("🎉 Upload process completed successfully");

      // Trigger navigation
      setShouldNavigate(true);
    } catch (error) {
      console.error("❌ Upload failed with error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      setProcessingStage(`Upload failed: ${error.message}`);
      setUploadProgress(0);
    }
  };

  const stats = React.useMemo(() => {
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s) => s.status === "active").length;
    const totalDocuments = sessions.reduce((sum, s) => sum + (s.documents?.length || 0), 0);
    const totalActions = sessions.reduce((sum, s) => sum + (s.suggestedActions?.length || 0), 0);
    const completedActions = sessions.reduce((sum, s) => sum + Object.keys(s.actionResults || {}).length, 0);

    return {
      totalSessions,
      activeSessions,
      totalDocuments,
      totalActions,
      completedActions,
      completionRate: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
    };
  }, [sessions]);

  // Vortex Logo Component with Enhanced Animation
  const VortexLogo = ({ size = "w-24 h-24", animate = false }) => (
    <div className={`relative ${size}`}>
      <div className={`${animate ? "animate-spin" : ""} transition-transform duration-300`} style={{ animationDuration: animate ? "2s" : "0s" }}>
        <img src="/vortex-logo.png" alt="Vortex" className="w-full h-full object-contain" />
      </div>
      {animate && (
        <>
          <div className="absolute -inset-4 bg-red-600 rounded-full opacity-20 blur-xl animate-pulse"></div>
          <div className="absolute -inset-2 border-2 border-red-400 rounded-full animate-ping opacity-30"></div>
          <div className="absolute -inset-6 border border-red-300 rounded-full animate-pulse opacity-20"></div>
          {/* Whoosh effect */}
          <div className="absolute -inset-8 border border-red-200 rounded-full animate-ping opacity-10" style={{ animationDelay: "0.5s" }}></div>
          <div className="absolute -inset-10 border border-red-100 rounded-full animate-ping opacity-5" style={{ animationDelay: "1s" }}></div>
        </>
      )}
    </div>
  );

  if (loading && !sessions.length) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <VortexAnimation size={100} particleCount={8} isActive={true} />
        <p className="mt-4 text-on-surface-secondary">Loading dashboard...</p>
      </div>
    );
  }

  if (showCamera) {
    return <CameraCapture onBack={() => setShowCamera(false)} />;
  }

  if (processingDocument) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <VortexLogo size="w-32 h-32" animate={true} />
        <div className="mt-8 text-center max-w-md">
          <h2 className="text-2xl font-light text-gray-900 mb-4">Processing Document</h2>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-red-600 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
          </div>

          {/* Progress Percentage */}
          <div className="text-sm text-gray-500 mb-2">{Math.round(uploadProgress)}% Complete</div>

          {/* Current Stage */}
          <p className="text-gray-600 font-medium">{processingStage}</p>

          {/* Processing Steps */}
          <div className="mt-6 space-y-2 text-sm text-gray-500">
            <div className={`flex items-center justify-center space-x-2 ${uploadProgress >= 20 ? "text-green-600" : ""}`}>
              <div className={`w-2 h-2 rounded-full ${uploadProgress >= 20 ? "bg-green-500" : "bg-gray-300"}`}></div>
              <span>Session Created</span>
            </div>
            <div className={`flex items-center justify-center space-x-2 ${uploadProgress >= 90 ? "text-green-600" : ""}`}>
              <div className={`w-2 h-2 rounded-full ${uploadProgress >= 90 ? "bg-green-500" : "bg-gray-300"}`}></div>
              <span>Document Uploaded</span>
            </div>
            <div className={`flex items-center justify-center space-x-2 ${uploadProgress >= 100 ? "text-green-600" : ""}`}>
              <div className={`w-2 h-2 rounded-full ${uploadProgress >= 100 ? "bg-green-500" : "bg-gray-300"}`}></div>
              <span>Ready for Review</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="container">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-on-surface mb-2">Dashboard</h1>
        <p className="text-on-surface-secondary mb-6">Overview of all advisory sessions and AI insights.</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ staggerChildren: 0.05 }}>
        {[
          { label: "Total Sessions", value: stats.totalSessions, icon: Users },
          { label: "Active Sessions", value: stats.activeSessions, icon: Clock },
          { label: "Documents", value: stats.totalDocuments, icon: FileText },
          { label: "Suggested Actions", value: stats.totalActions, icon: AlertTriangle },
          { label: "Completed Actions", value: stats.completedActions, icon: CheckCircle },
          { label: "Completion Rate", value: `${stats.completionRate}%`, icon: TrendingUp },
        ].map((stat, index) => (
          <motion.div key={stat.label} className="card text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-on-surface">{stat.value}</p>
            <p className="text-xs text-on-surface-secondary uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Sessions List */}
      <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="card-header flex items-center justify-between">
          <h2 className="card-title flex items-center gap-2">
            <Users className="w-5 h-5" />
            Recent Sessions
          </h2>
          <Link to="/" className="btn btn-primary">
            New Session
          </Link>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 10)
              .map((session, index) => (
                <motion.div key={session.id} className="card card-compact hover:border-primary transition-colors duration-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">Session #{sessions.length - index}</p>
                      <p className="text-xs text-on-surface-secondary">{new Date(session.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4 md:col-span-2 justify-center">
                      <p className="text-center">
                        <span className="font-bold text-on-surface">{session.documents?.length || 0}</span>
                        <span className="text-xs text-on-surface-secondary ml-1">docs</span>
                      </p>
                      <p className="text-center">
                        <span className="font-bold text-on-surface">{session.suggestedActions?.length || 0}</span>
                        <span className="text-xs text-on-surface-secondary ml-1">actions</span>
                      </p>
                    </div>
                    <div className="flex justify-end items-center gap-4">
                      {session.analysis && <div className="text-green-400 text-xs font-medium bg-green-500/10 px-2 py-1 rounded-full">Analyzed</div>}
                      <Link to={`/session/${session.id}`} className="btn btn-secondary">
                        View
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-on-surface-secondary/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-on-surface mb-2">No Sessions Yet</h3>
            <p className="text-on-surface-secondary mb-4">Create your first session to see it here.</p>
            <Link to="/" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        )}
      </motion.div>

      {/* Upload Area */}
      <motion.div
        className={`w-full max-w-2xl mx-auto my-8 border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${isDragging ? "border-red-400 bg-red-50 scale-[1.02]" : "border-gray-200 hover:border-red-300 hover:bg-gray-50"} cursor-pointer`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-upload").click()}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mb-6">
          <Upload className="w-12 h-12 text-gray-400 mx-auto" />
        </div>
        <h3 className="text-xl font-light text-gray-900 mb-2">Upload Advisory Documents</h3>
        <p className="text-gray-600 mb-6">Drag and drop files here, or click to browse</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById("file-upload").click();
            }}
            className="inline-flex items-center px-6 py-3 border border-red-600 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-all duration-200"
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose Files
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCamera(true);
            }}
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all duration-200"
          >
            <Camera className="w-4 h-4 mr-2" />
            Use Camera
          </button>
        </div>
        <input id="file-upload" type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.txt" onChange={handleFileSelect} />
      </motion.div>
    </main>
  );
};

export default DashboardPage;
