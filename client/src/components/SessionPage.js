import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, ArrowLeft, Play, Loader2, Check, Eye, FileText, User, Calendar, MapPin, Phone, Mail, CreditCard, Building, Globe } from "lucide-react";

import { useSession } from "../context/SessionContext";
import VortexAnimation from "./VortexAnimation";
import { clientIdentificationService } from "../services/clientIdentificationService";
import { apiService } from "../services/apiService";

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
                <li key={`risk-factor-${index}`}>{factor}</li>
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
        <User className="w-12 h-12 text-on-surface-secondary/30 mx-auto mb-3" />
        <p className="text-on-surface-secondary">No client information available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="flex items-center space-x-3 p-3 bg-background rounded-lg">
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
            <Mail className="w-4 h-4 text-on-surface-secondary" />
            <span className="text-on-surface-secondary">{clientData.email}</span>
          </div>
        )}
        {clientData.phone && (
          <div className="flex items-center space-x-2 text-sm">
            <Phone className="w-4 h-4 text-on-surface-secondary" />
            <span className="text-on-surface-secondary">{clientData.phone}</span>
          </div>
        )}
        {clientData.birthdate && (
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="w-4 h-4 text-on-surface-secondary" />
            <span className="text-on-surface-secondary">Born: {new Date(clientData.birthdate).toLocaleDateString()}</span>
          </div>
        )}
        {clientData.nationality && (
          <div className="flex items-center space-x-2 text-sm">
            <Globe className="w-4 h-4 text-on-surface-secondary" />
            <span className="text-on-surface-secondary">{clientData.nationality}</span>
          </div>
        )}
      </div>

      {/* Address */}
      {clientData.address && (
        <div className="flex items-start space-x-2 text-sm">
          <MapPin className="w-4 h-4 text-on-surface-secondary mt-0.5" />
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
              <div key={`account-${account.accountNumber || index}`} className="flex items-center justify-between p-2 bg-background rounded text-sm">
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
          <Building className="w-4 h-4 text-on-surface-secondary" />
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
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState(null);
  const [archiveSuccess, setArchiveSuccess] = useState(false);

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
    console.log(`🎯 UI: Starting execution of action ${action.id}`);
    setExecutingActions((prev) => new Set(prev.add(action.id)));

    try {
      const result = await executeAction(sessionId, action.id);
      console.log(`✅ UI: Action execution completed:`, result);

      const updatedSession = await getSession(sessionId);
      console.log(`🔄 UI: Session reloaded, actionResults:`, updatedSession?.actionResults);
      setCurrentSession(updatedSession);
    } catch (error) {
      console.error(`❌ UI: Action execution failed:`, error);
    } finally {
      setExecutingActions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(action.id);
        return newSet;
      });
    }
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

  const handleArchive = async () => {
    if (!currentSession?.documents?.[0]) return;
    setIsArchiving(true);
    setArchiveError(null);
    setArchiveSuccess(false);
    try {
      const documentId = currentSession.documents[0].id;
      await apiService.archiveDocument(sessionId, documentId);
      const updatedSession = await getSession(sessionId);
      setCurrentSession(updatedSession);
      setArchiveSuccess(true);
    } catch (err) {
      setArchiveError(err.message || "An unknown error occurred.");
    } finally {
      setIsArchiving(false);
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

  const document = currentSession?.documents?.[0];
  const analysis = document?.analysis;

  return (
    <main className="container">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <button onClick={() => navigate("/dashboard")} className="btn btn-secondary mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-on-surface mb-2">Document Analysis</h1>
        <p className="text-on-surface-secondary">Session created on {new Date(currentSession.createdAt).toLocaleDateString()}</p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Document Preview & Client Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Document Card */}
          <motion.div className="card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document
              </h2>
            </div>
            {document ? (
              <>
                {/* Document Info */}
                <div className="space-y-2 mb-4">
                  <h3 className="font-semibold text-on-surface">{document.filename}</h3>
                  <div className="flex items-center space-x-4 text-sm text-on-surface-secondary">
                    <span>{document.size ? formatFileSize(document.size) : ""}</span>
                    {analysis?.documentType && (
                      <>
                        <span>•</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{analysis.documentType}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Document Preview */}
                <div className="p-4 border rounded-lg bg-background flex justify-center items-center h-64 mb-4">
                  {isImageDocument ? (
                    <img src={`${getServerUrl()}/uploads/${document.filename}`} alt="Document preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-center text-on-surface-secondary">
                      <FileText className="w-12 h-12 mx-auto mb-2" />
                      <p>No preview available</p>
                    </div>
                  )}
                </div>

                {/* Archive Button Section */}
                <div className="mt-4">
                  {document.archive ? (
                    <a href={`${getServerUrl()}/archives/${document.archive.filename}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full text-center">
                      <Eye className="w-4 h-4" />
                      View Archived PDF
                    </a>
                  ) : (
                    <button onClick={handleArchive} disabled={isArchiving} className="btn btn-secondary w-full">
                      {isArchiving ? <Loader2 className="animate-spin w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      {isArchiving ? "Archiving..." : "Archive Document"}
                    </button>
                  )}
                  {archiveError && <p className="text-red-500 text-sm mt-2 text-center">{archiveError}</p>}
                  {archiveSuccess && <p className="text-green-600 text-sm mt-2 text-center">Document archived successfully!</p>}
                </div>
              </>
            ) : (
              <p className="text-on-surface-secondary">No document in this session.</p>
            )}
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
                <User className="w-12 h-12 text-on-surface-secondary/30 mx-auto mb-3" />
                <p className="text-on-surface-secondary mb-4">No client automatically identified</p>
                <div className="space-y-2">
                  <p className="text-sm text-on-surface-secondary mb-3">Please select the correct client:</p>
                  {clientIdentificationService.getAllClients().map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        console.log(`👤 Manually selected client: ${client.name}`);
                        setClientData(client);
                      }}
                      className="w-full p-3 text-left border border-border rounded-lg hover:border-border-hover hover:bg-background transition-colors"
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

        {/* Right Column: AI Analysis & Actions */}
        <div className="lg:col-span-2">
          {/* Unified Analysis and Actions Card */}
          <motion.div className="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Analysis Section */}
            <div className="card-header">
              <h2 className="card-title">Document Summary & Analysis</h2>
            </div>
            {analysis ? (
              <div className="space-y-6 mb-6">
                <AnalysisSection title="Summary" content={analysis.summary} />
                {hasVisionAnalysis && (
                  <AnalysisSection title="Extracted Text">
                    <div className="bg-background p-3 rounded-lg max-h-40 overflow-y-auto">
                      <pre className="text-sm text-on-surface-secondary whitespace-pre-wrap">{analysis.extractedText}</pre>
                    </div>
                  </AnalysisSection>
                )}
                <AnalysisSection title="Key Points" items={analysis.keyPoints} />
                <AnalysisSection title="Client Needs" items={analysis.clientNeeds} />
                <AnalysisSection title="Risk Assessment">
                  <RiskAssessmentDisplay riskAssessment={analysis.riskAssessment} />
                </AnalysisSection>
                <AnalysisSection title="Compliance Flags" items={analysis.complianceFlags} type="compliance" />
              </div>
            ) : (
              <p className="text-on-surface-secondary text-center py-8">No analysis available.</p>
            )}

            {/* Divider */}
            <hr className="border-border my-6" />

            {/* Suggested Actions Section */}
            <div>
              <h2 className="card-title mb-4">Suggested Actions</h2>
              <div className="space-y-4">
                {analysis?.suggestedActions?.length > 0 ? (
                  analysis.suggestedActions.map((action, index) => {
                    const isExecuting = executingActions.has(action.id);
                    const isCompleted = currentSession?.actionResults?.[action.id];
                    const executionResult = currentSession?.actionResults?.[action.id];

                    // Debug logging
                    console.log(`🔍 Action ${action.id} status:`, {
                      isExecuting,
                      isCompleted: !!isCompleted,
                      executionResult,
                      actionResults: currentSession?.actionResults,
                      executingActions: Array.from(executingActions),
                    });

                    return <ActionItem key={action.id || `action-${index}`} action={action} onExecute={() => handleExecuteAction(action)} isExecuting={isExecuting} isCompleted={!!isCompleted} executionResult={executionResult} />;
                  })
                ) : (
                  <p className="text-on-surface-secondary text-center py-8">No actions suggested.</p>
                )}
              </div>
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
            <li key={`${type || "item"}-${index}`} className="flex items-start text-sm">
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

const ActionItem = ({ action, onExecute, isExecuting, isCompleted, executionResult }) => (
  <div className="action-card">
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-3 flex-1">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-medium flex-shrink-0">{action.priority}</div>
        <div className="flex-1">
          <p className="font-semibold text-on-surface mb-1">{action.title || action.description}</p>
          <p className="text-sm text-on-surface-secondary mb-2">{action.description}</p>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-on-surface-secondary">{action.type}</span>
            {isCompleted && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>}
          </div>
          {executionResult && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p className="text-green-800">{executionResult.message || "Action executed successfully"}</p>
            </div>
          )}
        </div>
      </div>
      <div className="ml-4">
        {isCompleted ? (
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        ) : (
          <button onClick={onExecute} disabled={isExecuting} className="btn btn-primary">
            {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isExecuting ? "Executing..." : "Execute"}
          </button>
        )}
      </div>
    </div>
  </div>
);

export default SessionPage;
