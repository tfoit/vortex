import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { Menu, X, Clock, CheckCircle, AlertTriangle, Eye, Users, TrendingUp, Shield, FileText, Upload, Camera } from "lucide-react";
import CameraCapture from "./CameraCapture";

const HomePage = () => {
  const navigate = useNavigate();
  const { sessions, currentSession: activeSession, loadSession, uploadDocument, loading: isProcessing, executeAction, createSession, clearSession } = useSession();

  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [shouldNavigate, setShouldNavigate] = useState(false);

  // Effect to handle navigation after upload completion
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
      setUploadProgress(0);
      setProcessingStage("Initializing...");

      // Always create a new session for each upload, as requested.
      console.log("📝 Creating new session for new upload...");
      setProcessingStage("Creating session...");
      const newSession = await createSession();
      console.log("✅ Session created:", newSession?.id);
      const sessionIdToUpload = newSession.id;
      setUploadProgress(20);

      // Upload the document with progress tracking
      setProcessingStage("Uploading document...");
      await uploadDocument(
        file,
        (progress) => {
          setUploadProgress(20 + progress * 0.3); // 20-50%
        },
        sessionIdToUpload
      );

      setUploadProgress(50);
      setProcessingStage("Analyzing with Ollama vision...");

      // Simulate analysis progress
      const analysisInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(analysisInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 200);

      // Wait a moment for the session to be fully updated
      setTimeout(() => {
        clearInterval(analysisInterval);
        setUploadProgress(100);
        setProcessingStage("Analysis complete!");

        // Trigger navigation
        setShouldNavigate(true);
      }, 2000);
    } catch (error) {
      console.error("Failed to upload document:", error);
      setProcessingStage("Upload failed");
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "text-red-600 bg-red-50 border-red-200";
      case "Medium":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "Low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getSystemIcon = (system) => {
    switch (system) {
      case "Trading System":
        return <TrendingUp className="w-4 h-4" />;
      case "CRM System":
        return <Users className="w-4 h-4" />;
      case "Compliance System":
        return <Shield className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

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

  if (showCamera) {
    return <CameraCapture onBack={() => setShowCamera(false)} />;
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header - UBS Style */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                if (activeSession) {
                  // Clear session to return to main page
                  clearSession();
                }
              }}
            >
              <div className="w-8 h-8">
                <img src="/vortex-logo.png" alt="UBS Vortex" className="w-full h-full object-contain" />
              </div>
              <div className="text-lg font-light text-gray-900 tracking-wide">Vortex</div>
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-all duration-200">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Side Panel - UBS Corporate Style */}
      <div className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-30 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`} style={{ width: "380px" }}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-light text-gray-900">Dashboard</h3>
          <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-50 transition-all duration-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto h-[calc(100vh-77px)]">
          {/* User Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">CA</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">Client Advisor</div>
                <div className="text-sm text-gray-500">Demo User</div>
              </div>
            </div>
          </div>

          {/* Session History */}
          <div className="mb-8">
            <h4 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide">Recent Sessions</h4>
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm ${activeSession?.id === session.id ? "border-red-200 bg-red-50" : "border-gray-100 hover:border-gray-200"}`}
                    onClick={() => {
                      loadSession(session.id);
                      setIsMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm text-gray-900 truncate">{session.fileName || "Document Session"}</h5>
                        <p className="text-xs text-gray-500 mt-1">{new Date(session.timestamp || session.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {session.suggestedActions && session.suggestedActions.filter((a) => a.status === "completed").length > 0 && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {session.suggestedActions && session.suggestedActions.some((a) => a.priority === "High") && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Status */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide">System Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Ollama Vision (Local)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600 font-medium">Active</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">UBS Mainframe</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-blue-600 font-medium">Mock Mode</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">CRM System</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-blue-600 font-medium">Mock Mode</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Trading System</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-blue-600 font-medium">Mock Mode</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Compliance System</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-blue-600 font-medium">Mock Mode</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black bg-opacity-20 z-20"></div>}

      <main className="max-w-4xl mx-auto px-6 lg:px-8">
        {isProcessing ? (
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
                <div className={`flex items-center justify-center space-x-2 ${uploadProgress >= 50 ? "text-green-600" : ""}`}>
                  <div className={`w-2 h-2 rounded-full ${uploadProgress >= 50 ? "bg-green-500" : "bg-gray-300"}`}></div>
                  <span>Document Uploaded</span>
                </div>
                <div className={`flex items-center justify-center space-x-2 ${uploadProgress >= 90 ? "text-green-600" : ""}`}>
                  <div className={`w-2 h-2 rounded-full ${uploadProgress >= 90 ? "bg-green-500" : "bg-gray-300"}`}></div>
                  <span>AI Analysis</span>
                </div>
                <div className={`flex items-center justify-center space-x-2 ${uploadProgress >= 100 ? "text-green-600" : ""}`}>
                  <div className={`w-2 h-2 rounded-full ${uploadProgress >= 100 ? "bg-green-500" : "bg-gray-300"}`}></div>
                  <span>Ready for Review</span>
                </div>
              </div>
            </div>
          </div>
        ) : !activeSession ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            {/* Main Logo and CTA */}
            <div className="text-center mb-12">
              <VortexLogo size="w-40 h-40" />
              <h1 className="text-4xl font-light text-gray-900 mt-8 mb-4">Vortex</h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl">Intelligent document analysis for UBS client advisors</p>
            </div>

            {/* Upload Area */}
            <div
              className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${isDragging ? "border-red-400 bg-red-50 scale-[1.02]" : "border-gray-200 hover:border-red-300 hover:bg-gray-50"} cursor-pointer`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-upload").click()}
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
            </div>

            {/* Supported Formats */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">Supports PDF, images, and handwritten notes</p>
            </div>
          </div>
        ) : (
          <div className="py-8">
            {/* Document Header */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-light text-gray-900 mb-2">{activeSession.documents?.[0]?.filename || "Document Analysis"}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{activeSession.documents?.[0]?.size ? formatFileSize(activeSession.documents[0].size) : ""}</span>
                    <span>•</span>
                    <span>{new Date(activeSession.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {activeSession.analysis && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <Eye className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">Analysis Complete</span>
                  </div>
                )}
              </div>
            </div>

            {/* Suggested Actions */}
            {activeSession.suggestedActions && activeSession.suggestedActions.length > 0 && (
              <div>
                <h3 className="text-xl font-light text-gray-900 mb-6">Recommended Actions</h3>
                <div className="space-y-4">
                  {activeSession.suggestedActions.map((action, index) => (
                    <div key={action.id} className="bg-white border border-gray-100 rounded-xl p-6 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">{index + 1}</div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-2">{action.description}</h4>
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(action.priority)}`}>{action.priority} Priority</span>
                              <div className="flex items-center text-xs text-gray-500">
                                {getSystemIcon(action.system)}
                                <span className="ml-1">{action.system}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => executeAction(action.id)}
                          disabled={action.status === "completed"}
                          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${action.status === "completed" ? "bg-green-50 text-green-700 border border-green-200 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700 hover:shadow-sm"}`}
                        >
                          {action.status === "completed" ? "Completed" : "Execute"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;
