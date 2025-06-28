import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, ArrowLeft, Play, Loader2, Check, Eye, FileText, User, Calendar, MapPin, Phone, Mail, CreditCard, Building, Globe } from "lucide-react";

import { useSession } from "../context/SessionContext";
import VortexAnimation from "./VortexAnimation";
import { clientIdentificationService } from "../services/clientIdentificationService";

// Safe component for rendering risk assessment
const RiskAssessmentDisplay = ({ riskAssessment }) => {
  if (!riskAssessment) {
    return <p className="text-on-surface-secondary text-sm">Not available</p>;
  }

  // Handle string risk assessment
  if (typeof riskAssessment === "string") {
    return <p className="text-on-surface text-sm">{riskAssessment}</p>;
  }

  // Handle object risk assessment
  if (typeof riskAssessment === "object" && riskAssessment.level) {
    return (
      <div className="text-sm">
        <p className="mb-1 text-on-surface">
          Level: <span className="font-semibold capitalize">{riskAssessment.level}</span>
        </p>
        {riskAssessment.factors && Array.isArray(riskAssessment.factors) && riskAssessment.factors.length > 0 && (
          <div>
            <p className="text-on-surface-secondary">Factors:</p>
            <ul className="list-disc list-inside ml-2 text-on-surface-secondary">
              {riskAssessment.factors.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Fallback for any other type
  return <p className="text-on-surface-secondary text-sm">Format not recognized</p>;
};

// Client Information Component
const ClientInformation = ({ clientData }) => {
  if (!clientData) {
    return (
      <div className="text-center py-8">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-on-surface-secondary">No client information available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
        <User className="w-5 h-5 text-primary" />
        <div>
          <p className="font-semibold text-on-surface">{clientData.name}</p>
          <p className="text-sm text-on-surface-secondary">Client ID: {clientData.clientIdentificationNumber || clientData.id}</p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {clientData.email && (
          <div className="flex items-center space-x-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-on-surface-secondary">{clientData.email}</span>
          </div>
        )}
        {clientData.phone && (
          <div className="flex items-center space-x-2 text-sm">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-on-surface-secondary">{clientData.phone}</span>
          </div>
        )}
        {clientData.birthdate && (
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-on-surface-secondary">Born: {new Date(clientData.birthdate).toLocaleDateString()}</span>
          </div>
        )}
        {clientData.nationality && (
          <div className="flex items-center space-x-2 text-sm">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-on-surface-secondary">{clientData.nationality}</span>
          </div>
        )}
      </div>

      {/* Address */}
      {clientData.address && (
        <div className="flex items-start space-x-2 text-sm">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
          <div className="text-on-surface-secondary">
            <p>{clientData.address.street}</p>
            <p>
              {clientData.address.postalCode} {clientData.address.city}, {clientData.address.country}
            </p>
          </div>
        </div>
      )}

      {/* Financial Information */}
      {clientData.accounts && clientData.accounts.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-on-surface mb-2 flex items-center">
            <CreditCard className="w-4 h-4 mr-2" />
            Accounts ({clientData.accounts.length})
          </h4>
          <div className="space-y-2">
            {clientData.accounts.slice(0, 3).map((account, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div>
                  <span className="font-medium capitalize">{account.type}</span>
                  <span className="text-on-surface-secondary ml-2">••••{account.accountNumber.slice(-4)}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {account.currency} {account.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {clientData.accounts.length > 3 && <p className="text-xs text-on-surface-secondary text-center">+{clientData.accounts.length - 3} more accounts</p>}
          </div>
        </div>
      )}

      {/* Risk Profile */}
      {clientData.riskProfile && (
        <div className="flex items-center space-x-2 text-sm">
          <Building className="w-4 h-4 text-gray-400" />
          <span className="text-on-surface-secondary">Risk Profile: </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              clientData.riskProfile === "conservative" ? "bg-green-100 text-green-700" : clientData.riskProfile === "moderate" ? "bg-yellow-100 text-yellow-700" : clientData.riskProfile === "aggressive" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {clientData.riskProfile}
          </span>
        </div>
      )}
    </div>
  );
};

const SessionPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { loadSession: getSession, executeAction, analyzeDocumentWithVision, loading, error } = useSession();
  const [currentSession, setCurrentSession] = useState(null);
  const [executingActions, setExecutingActions] = useState(new Set());
  const [visionAnalyzing, setVisionAnalyzing] = useState(false);
  const [clientData, setClientData] = useState(null);

  // Dynamic server URL for mobile compatibility
  const getServerUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      return `http://${hostname}:7775`;
    }
    return "http://localhost:7775";
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession(sessionId);
      setCurrentSession(session);

      // Intelligent client identification based on document analysis
      if (session?.analysis) {
        console.log("🔍 Starting intelligent client identification...");
        console.log("📊 Analysis data:", session.analysis);

        // Check if analysis has meaningful data
        const hasContent =
          session.analysis.extractedText ||
          (session.analysis.summary && session.analysis.summary !== "Not applicable") ||
          (session.analysis.keyPoints && session.analysis.keyPoints.length > 0) ||
          (session.analysis.clientIdentification && Object.keys(session.analysis.clientIdentification).length > 0);

        if (hasContent) {
          // Use the intelligent client identification service
          const identifiedClient = clientIdentificationService.identifyClient(session.analysis);

          if (identifiedClient) {
            console.log(`✅ Client identified: ${identifiedClient.name}`);
            setClientData(identifiedClient);
          } else {
            console.log("❌ No client identified with sufficient confidence");
            console.log("🔍 Available analysis data for debugging:", {
              extractedText: session.analysis.extractedText?.substring(0, 100) + "...",
              documentType: session.analysis.documentType,
              hasClientId: !!session.analysis.clientIdentification,
              summary: session.analysis.summary,
            });
            // For now, don't set any client - user can manually correct if needed
            setClientData(null);
          }
        } else {
          console.log("⚠️ Analysis appears to be empty or meaningless - skipping client identification");
          console.log("📊 Empty analysis structure:", session.analysis);
          setClientData(null);
        }
      }
    };
    if (sessionId) fetchSession();
  }, [sessionId, getSession]);

  const handleExecuteAction = async (action) => {
    setExecutingActions((prev) => new Set(prev.add(action.id)));
    await executeAction(sessionId, action.id);
    const updatedSession = await getSession(sessionId);
    setCurrentSession(updatedSession);
    setExecutingActions((prev) => {
      const newSet = new Set(prev);
      newSet.delete(action.id);
      return newSet;
    });
  };

  const handleVisionAnalysis = async () => {
    if (!currentSession?.documents?.[0]) return;

    try {
      setVisionAnalyzing(true);
      await analyzeDocumentWithVision(sessionId, currentSession.documents[0].id);
      const updatedSession = await getSession(sessionId);
      setCurrentSession(updatedSession);
    } catch (error) {
      console.error("Vision analysis failed:", error);
    } finally {
      setVisionAnalyzing(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isImageDocument = currentSession?.documents?.[0]?.mimetype?.startsWith("image/");
  const hasVisionAnalysis = currentSession?.analysis?.extractedText;

  // Debug mobile image loading
  useEffect(() => {
    if (isImageDocument && currentSession?.documents?.[0]) {
      const imageUrl = `${getServerUrl()}/uploads/${currentSession.documents[0].filename}`;
      console.log("📱 Mobile Image Preview:", {
        filename: currentSession.documents[0].filename,
        imageUrl: imageUrl,
        serverUrl: getServerUrl(),
        hostname: window.location.hostname,
      });
    }
  }, [currentSession, isImageDocument, getServerUrl]);

  if (loading && !currentSession) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <VortexAnimation size={100} isActive={true} />
        <p className="mt-4 text-on-surface-secondary">Loading session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-2xl mx-auto text-center">
        <AlertTriangle className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-on-surface mb-2">Error Loading Session</h2>
        <p className="text-on-surface-secondary mb-4">{error}</p>
        <button onClick={() => navigate("/")} className="btn btn-primary">
          Go Back Home
        </button>
      </div>
    );
  }

  if (!currentSession) return null;

  return (
    <main className="container">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate("/dashboard")} className="btn btn-secondary mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-on-surface mb-2">Document Analysis</h1>
        <p className="text-on-surface-secondary">Session created on {new Date(currentSession.createdAt).toLocaleDateString()}</p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        {/* Left Column: Document Preview & Client Info */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          {/* Document Preview */}
          <motion.div className="card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Preview
              </h2>
            </div>
            <div className="space-y-4">
              {/* Document Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-on-surface">{currentSession.documents?.[0]?.filename || "Unknown Document"}</h3>
                <div className="flex items-center space-x-4 text-sm text-on-surface-secondary">
                  <span>{currentSession.documents?.[0]?.size ? formatFileSize(currentSession.documents[0].size) : ""}</span>
                  {currentSession.analysis?.documentType && (
                    <>
                      <span>•</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{currentSession.analysis.documentType}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Document Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[200px] flex items-center justify-center overflow-hidden">
                {isImageDocument ? (
                  <div className="w-full flex flex-col items-center">
                    <img
                      src={`${getServerUrl()}/uploads/${currentSession.documents[0].filename}`}
                      alt="Document preview"
                      className="max-w-full max-h-64 lg:max-h-80 rounded-lg shadow-sm object-contain"
                      onLoad={(e) => {
                        console.log("✅ Mobile: Image loaded successfully");
                      }}
                      onError={(e) => {
                        console.error("❌ Mobile: Failed to load image:", e.target.src);
                        e.target.style.display = "none";
                        e.target.parentNode.querySelector(".fallback-message").style.display = "block";
                      }}
                    />
                    {/* Fallback for failed image loads */}
                    <div className="fallback-message text-center text-gray-500" style={{ display: "none" }}>
                      <FileText className="w-12 h-12 mx-auto mb-2" />
                      <p>Image preview unavailable</p>
                      <p className="text-sm">Try refreshing the page</p>
                      <p className="text-xs mt-2 text-gray-400">{currentSession.documents?.[0]?.filename}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <p>No preview available</p>
                    <p className="text-sm">{currentSession.documents?.[0]?.filename}</p>
                  </div>
                )}
              </div>

              {/* Vision Analysis Button for Images */}
              {isImageDocument && !hasVisionAnalysis && (
                <button onClick={handleVisionAnalysis} disabled={visionAnalyzing} className="w-full btn btn-primary text-sm">
                  {visionAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing with Vision...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Enhance with Vision AI
                    </>
                  )}
                </button>
              )}

              {/* Mobile Debug Info */}
              {isImageDocument && (
                <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded">
                  <p>
                    <strong>Debug Info:</strong>
                  </p>
                  <p>Server: {getServerUrl()}</p>
                  <p>Image URL: {`${getServerUrl()}/uploads/${currentSession.documents?.[0]?.filename}`}</p>
                  <p>Hostname: {window.location.hostname}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Client Information */}
          <motion.div className="card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2">
                <User className="w-5 h-5" />
                Client Information
              </h2>
            </div>
            {clientData ? (
              <ClientInformation clientData={clientData} />
            ) : (
              <div className="text-center py-6">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-on-surface-secondary mb-4">No client automatically identified</p>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-3">Please select the correct client:</p>
                  {clientIdentificationService.getAllClients().map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        console.log(`👤 Manually selected client: ${client.name}`);
                        setClientData(client);
                      }}
                      className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-on-surface">{client.name}</div>
                      <div className="text-sm text-on-surface-secondary">
                        Born: {new Date(client.birthdate).toLocaleDateString()} • {client.accounts?.length || 0} accounts
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Analysis & Actions */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          {/* Document Summary & Analysis */}
          <motion.div className="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="card-header">
              <h2 className="card-title">Document Summary & Analysis</h2>
            </div>
            {currentSession.analysis ? (
              <div className="space-y-6">
                {/* Summary */}
                <AnalysisSection title="Summary" content={currentSession.analysis.summary} />

                {/* Extracted Text for Vision Analysis */}
                {hasVisionAnalysis && (
                  <AnalysisSection title="Extracted Text">
                    <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                      <pre className="text-sm text-on-surface-secondary whitespace-pre-wrap">{currentSession.analysis.extractedText}</pre>
                    </div>
                  </AnalysisSection>
                )}

                {/* Key Points */}
                <AnalysisSection title="Key Points" items={currentSession.analysis.keyPoints} />

                {/* Client Needs */}
                <AnalysisSection title="Client Needs" items={currentSession.analysis.clientNeeds} />

                {/* Risk Assessment */}
                <AnalysisSection title="Risk Assessment">
                  <RiskAssessmentDisplay riskAssessment={currentSession.analysis.riskAssessment} />
                </AnalysisSection>

                {/* Compliance Flags */}
                <AnalysisSection title="Compliance Flags" items={currentSession.analysis.complianceFlags} type="compliance" />
              </div>
            ) : (
              <p className="text-on-surface-secondary">No analysis available yet. The document may still be processing.</p>
            )}
          </motion.div>

          {/* Advised Actions */}
          <motion.div className="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="card-header">
              <h2 className="card-title">Advised Actions</h2>
            </div>
            <div className="space-y-4">
              {currentSession.suggestedActions?.length > 0 ? (
                currentSession.suggestedActions.map((action, index) => <ActionItem key={action.id} action={action} index={index} isExecuting={executingActions.has(action.id)} isCompleted={currentSession.actionResults?.[action.id]} onExecute={() => handleExecuteAction(action)} />)
              ) : (
                <p className="text-on-surface-secondary">No advised actions available.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

// Helper components to keep render clean
const AnalysisSection = ({ title, content, items, type, children }) => {
  if (!content && !items && !children) return null;
  return (
    <div>
      <h3 className="font-semibold text-on-surface mb-2">{title}</h3>
      {content && <p className="text-on-surface-secondary text-sm">{content}</p>}
      {items && (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start text-sm">
              {type === "compliance" ? <AlertTriangle className="w-4 h-4 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 text-primary mr-3 mt-0.5 flex-shrink-0" />}
              <span className="text-on-surface-secondary">{item}</span>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
};

const ActionItem = ({ action, index, isExecuting, isCompleted, onExecute }) => (
  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-3 flex-1">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-medium flex-shrink-0">{index + 1}</div>
        <div className="flex-1">
          <p className="font-semibold text-on-surface mb-1">{action.title || action.description}</p>
          <p className="text-sm text-on-surface-secondary mb-2">{action.description}</p>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${action.priority === "high" ? "bg-red-100 text-red-700" : action.priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{action.priority} priority</span>
            <span className="text-xs text-on-surface-secondary">{action.type}</span>
          </div>
        </div>
      </div>
      <div className="ml-4">
        {isCompleted ? (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        ) : (
          <button onClick={onExecute} disabled={isExecuting} className="btn btn-primary text-sm">
            {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isExecuting ? "Executing..." : "Execute"}</span>
          </button>
        )}
      </div>
    </div>
  </div>
);

export default SessionPage;
