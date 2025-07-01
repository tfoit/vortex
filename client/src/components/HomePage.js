import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { Menu, X, Clock, CheckCircle, AlertTriangle, Eye, Upload, Camera, TrendingUp } from "lucide-react";
import CameraCapture from "./CameraCapture";
import VortexAnimation from "./VortexAnimation";

const HomePage = () => {
  const navigate = useNavigate();
  const { sessions, currentSession: activeSession, loadSession, uploadDocument, loading: isProcessing, processingDocument, uploadProgress, processingStage: contextProcessingStage, processingDetails, createSession, clearSession, loadSessions } = useSession();

  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [vortexSize, setVortexSize] = useState(400);

  // New state to track completed stages cumulatively
  const [stageStatus, setStageStatus] = useState({
    sessionCreated: false,
    visionCompleted: false,
    aiCompleted: false,
    reviewReady: false,
  });

  // Use processing stage from context
  const processingStage = contextProcessingStage;

  // Debug processing stage changes
  useEffect(() => {
    if (processingStage) {
      console.log("🎯 [DEBUG] HomePage received processing stage:", processingStage);
      console.log("🎯 [DEBUG] isProcessing state:", isProcessing);
      console.log("🎯 [DEBUG] processingDocument state:", processingDocument);
    }
  }, [processingStage, isProcessing, processingDocument]);

  // Mobile responsive sizing for vortex animation
  useEffect(() => {
    const updateVortexSize = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth < 480) {
        setVortexSize(Math.min(280, screenWidth - 40));
      } else if (screenWidth < 768) {
        setVortexSize(320);
      } else {
        setVortexSize(400);
      }
    };

    updateVortexSize();
    window.addEventListener("resize", updateVortexSize);
    return () => window.removeEventListener("resize", updateVortexSize);
  }, []);

  // Memoize and sort sessions from newest to oldest
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const dateA = new Date(a.timestamp || a.createdAt);
      const dateB = new Date(b.timestamp || b.createdAt);
      return dateB - dateA;
    });
  }, [sessions]);

  // Effect to cumulatively update the completed stages
  useEffect(() => {
    if (!processingStage) {
      // If processing stops or hasn't started, reset stages
      if (stageStatus.sessionCreated || stageStatus.visionCompleted || stageStatus.aiCompleted || stageStatus.reviewReady) {
        setStageStatus({
          sessionCreated: false,
          visionCompleted: false,
          aiCompleted: false,
          reviewReady: false,
        });
      }
      return;
    }

    setStageStatus((currentStatus) => {
      // Create a new object to avoid direct mutation and unnecessary re-renders
      const newStatus = { ...currentStatus };
      let hasChanged = false;

      // Stage 1: Document Upload & Session Setup
      if (!newStatus.sessionCreated) {
        const isComplete =
          processingStage.includes("Document upload") ||
          processingStage.includes("Session validated") ||
          processingStage.includes("Starting document processing") ||
          processingStage.includes("Image detected") ||
          processingStage.includes("vision") ||
          processingStage.includes("Text extraction") ||
          processingStage.includes("AI analysis") ||
          processingStage.includes("Saving document") ||
          processingStage.includes("Processing complete");
        if (isComplete) {
          newStatus.sessionCreated = true;
          hasChanged = true;
        }
      }

      // Stage 2: Vision/Text Processing
      if (!newStatus.visionCompleted) {
        const isComplete = processingStage.includes("Vision processing completed") || processingStage.includes("Text extraction completed") || processingStage.includes("AI analysis") || processingStage.includes("Saving document") || processingStage.includes("Processing complete");
        if (isComplete) {
          newStatus.visionCompleted = true;
          hasChanged = true;
        }
      }

      // Stage 3: AI Analysis & Insights
      if (!newStatus.aiCompleted) {
        const isComplete = processingStage.includes("AI analysis completed") || processingStage.includes("Saving document") || processingStage.includes("Processing complete");
        if (isComplete) {
          newStatus.aiCompleted = true;
          hasChanged = true;
        }
      }

      // Stage 4: Ready for Review
      if (!newStatus.reviewReady) {
        const isComplete = processingStage.includes("Processing complete!");
        if (isComplete) {
          newStatus.reviewReady = true;
          hasChanged = true;
        }
      }

      // Only update state if something has actually changed
      return hasChanged ? newStatus : currentStatus;
    });
  }, [processingStage, stageStatus]);

  // Effect to handle navigation after processing is truly complete
  useEffect(() => {
    // Navigate only when the final "Ready for Review" stage is marked as complete
    if (stageStatus.reviewReady && activeSession?.id) {
      console.log("✅ Final stage 'Ready for Review' is complete. Waiting 5s before navigation...");

      // Wait a moment after the final checkmark appears to ensure the user sees it
      const timer = setTimeout(() => {
        console.log("🚀 Navigating to session results...");
        navigate(`/session/${activeSession.id}`);
      }, 5000); // 5-second delay after final checkmark

      return () => clearTimeout(timer);
    }
  }, [stageStatus.reviewReady, activeSession?.id, navigate]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
    // Reset stage status for new upload
    setStageStatus({
      sessionCreated: false,
      visionCompleted: false,
      aiCompleted: false,
      reviewReady: false,
    });

    try {
      // Always create a new session for each upload, as requested.
      console.log("📝 Creating new session for new upload...");
      const newSession = await createSession();
      if (!newSession?.id) {
        throw new Error("Failed to create session.");
      }
      console.log("✅ Session created:", newSession.id);

      // Step 2: Intelligent Document Processing (Upload + Vision + AI Analysis)
      console.log("🚀 Starting fully automated document processing pipeline...");

      const uploadResult = await uploadDocument(
        file,
        null, // Context handles progress now
        newSession.id
      );

      console.log("✅ Automated processing completed:", uploadResult);

      // Check if we got a full analysis
      if (uploadResult.analysis) {
        console.log("🔍 Document analysis received, processing method:", uploadResult.processingMethod);
        console.log("📊 Analysis includes:", {
          hasText: !!uploadResult.analysis.extractedText,
          hasActions: uploadResult.analysis.suggestedActions?.length || 0,
          documentType: uploadResult.analysis.documentType,
        });
      } else {
        console.warn("⚠️ No analysis received from automated processing");
      }

      // Navigation will be handled automatically when "Processing complete!" status is received
    } catch (error) {
      console.error("Failed to process document:", error);
      // Error handling is now managed by the context
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (showCamera) {
    return <CameraCapture onBack={() => setShowCamera(false)} />;
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header - UBS Style */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div
              className="flex items-center space-x-2 sm:space-x-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                if (activeSession) {
                  // Clear session to return to main page
                  clearSession();
                }
              }}
            >
              <img src="/ubs-logo.png" alt="UBS" className="h-8 sm:h-10 w-auto mr-2 sm:mr-3" />
              <div className="text-base sm:text-lg font-light text-gray-900 tracking-wide">Vortex AI Agent</div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button onClick={() => navigate("/dashboard")} className="hidden sm:block text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">
                Dashboard
              </button>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 sm:p-2.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-all duration-200">
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Side Panel - UBS Corporate Style */}
      <div className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-30 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? "translate-x-0" : "translate-x-full"} w-full sm:w-80 max-w-sm`}>
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
            {sortedSessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No sessions yet</p>
              </div>
            ) : (
              <div>
                <div className="space-y-2">
                  {sortedSessions.slice(0, 5).map((session) => (
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
                {sortedSessions.length > 5 && (
                  <div className="mt-4 text-center">
                    <button onClick={() => navigate("/dashboard")} className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                      View all {sortedSessions.length} sessions
                    </button>
                  </div>
                )}
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {isProcessing || processingDocument ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            {/* Mobile-responsive vortex animation */}
            <div className="w-full max-w-lg aspect-square flex items-center justify-center">
              <VortexAnimation width={vortexSize} height={vortexSize} state="processing" />
            </div>
            <div className="mt-8 text-center max-w-md w-full px-4">
              <h2 className="text-xl sm:text-2xl font-light text-gray-900 mb-4">Processing Document</h2>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-red-600 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
              </div>

              {/* Progress Percentage */}
              <div className="text-sm text-gray-500 mb-2">{Math.round(uploadProgress)}% Complete</div>

              {/* Current Stage */}
              <p className={`font-medium text-sm sm:text-base transition-colors duration-300 ${processingStage.includes("Processing complete!") ? "text-green-600" : processingStage.includes("Error") ? "text-red-600" : "text-gray-600"}`}>{processingStage}</p>

              {/* Show navigation hint when complete */}
              {processingStage.includes("Processing complete!") && <p className="text-sm text-green-500 mt-2 animate-pulse">Redirecting to results in a moment...</p>}

              {/* Enhanced Processing Steps */}
              <div className="mt-6 space-y-3 text-sm">
                <div className={`flex items-center justify-center space-x-3 transition-all duration-300 ${stageStatus.sessionCreated ? "text-green-600 font-medium" : "text-gray-500"}`}>
                  {stageStatus.sessionCreated ? <CheckCircle className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full bg-gray-300"></div>}
                  <span>Document Upload & Session Setup</span>
                </div>
                <div className={`flex items-center justify-center space-x-3 transition-all duration-300 ${stageStatus.visionCompleted ? "text-green-600 font-medium" : "text-gray-500"}`}>
                  {stageStatus.visionCompleted ? <CheckCircle className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full bg-gray-300"></div>}
                  <span>Vision/Text Processing</span>
                </div>
                <div className={`flex items-center justify-center space-x-3 transition-all duration-300 ${stageStatus.aiCompleted ? "text-green-600 font-medium" : "text-gray-500"}`}>
                  {stageStatus.aiCompleted ? <CheckCircle className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full bg-gray-300"></div>}
                  <span>AI Analysis & Insights</span>
                </div>
                <div className={`flex items-center justify-center space-x-3 transition-all duration-300 ${stageStatus.reviewReady ? "text-green-600 font-medium" : "text-gray-500"}`}>
                  {stageStatus.reviewReady ? <CheckCircle className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full bg-gray-300"></div>}
                  <span>Ready for Review</span>
                </div>
              </div>

              {/* Detailed Processing Info */}
              {processingDetails && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Processing Details</div>
                  <div className="text-sm text-gray-600">
                    <div>Type: {processingDetails.type}</div>
                    {processingDetails.progress && <div>Progress: {processingDetails.progress}%</div>}
                    <div className="text-xs text-gray-400 mt-1">{new Date(processingDetails.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : !activeSession ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            {/* Main Logo and CTA */}
            <div className="text-center mb-8 sm:mb-12">
              <div className="flex justify-center">
                <VortexAnimation width={vortexSize} height={vortexSize} />
              </div>
            </div>

            {/* Upload Area */}
            <div
              className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-6 sm:p-12 text-center transition-all duration-300 ${isDragging ? "border-red-400 bg-red-50 scale-[1.02]" : "border-gray-200 hover:border-red-300 hover:bg-gray-50"} cursor-pointer`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-upload").click()}
            >
              <div className="mb-4 sm:mb-6">
                <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-lg sm:text-xl font-light text-gray-900 mb-2">Upload Advisory Documents</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Drag and drop files here, or click to browse</p>
              <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById("file-upload").click();
                  }}
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-red-600 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-all duration-200 text-sm sm:text-base"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCamera(true);
                  }}
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all duration-200 text-sm sm:text-base"
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
            <div className="max-w-2xl mx-auto text-center">
              {/* Processing Complete */}
              <div className="mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-light text-gray-900 mb-2">Document Processing Complete</h2>
                <p className="text-gray-600 mb-6">Your document "{activeSession.documents?.[0]?.filename}" has been successfully analyzed with AI insights.</p>
              </div>

              {/* Quick Summary */}
              {activeSession.analysis && (
                <div className="bg-white border border-gray-100 rounded-xl p-6 mb-8 text-left">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Quick Summary</h3>
                    {activeSession.analysis.documentType && <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">{activeSession.analysis.documentType}</span>}
                  </div>
                  {activeSession.analysis.summary && <p className="text-gray-700 leading-relaxed mb-4">{activeSession.analysis.summary}</p>}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{activeSession.documents?.[0]?.size ? formatFileSize(activeSession.documents[0].size) : ""}</span>
                    <span>{new Date(activeSession.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-4">
                <button onClick={() => navigate(`/session/${activeSession.id}`)} className="w-full inline-flex items-center justify-center px-8 py-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all duration-200 shadow-sm">
                  <Eye className="w-5 h-5 mr-3" />
                  View Complete Analysis & Client Details
                </button>

                <div className="flex space-x-4">
                  <button onClick={() => clearSession()} className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200">
                    <Upload className="w-4 h-4 mr-2" />
                    Process Another Document
                  </button>

                  <button onClick={() => navigate("/dashboard")} className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Dashboard
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              {activeSession.suggestedActions && activeSession.suggestedActions.length > 0 && (
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-red-600">{activeSession.suggestedActions.length}</span> advised actions identified • View complete analysis for detailed recommendations
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;
