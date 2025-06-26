import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, CheckCircle, AlertTriangle, ArrowLeft, Play, Loader2, Check, User, Briefcase, File, Zap } from "lucide-react";

import { useSession } from "../context/SessionContext";
import VortexAnimation from "./VortexAnimation";

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

const SessionPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { getSession, executeAction, loading, error } = useSession();
  const [currentSession, setCurrentSession] = useState(null);
  const [executingActions, setExecutingActions] = useState(new Set());

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession(sessionId);
      setCurrentSession(session);
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
        <h1 className="text-3xl font-bold text-on-surface mb-2">Session Analysis</h1>
        <p className="text-on-surface-secondary">Created on {new Date(currentSession.createdAt).toLocaleDateString()}</p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Analysis Card */}
          <motion.div className="card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="card-header">
              <h2 className="card-title">AI Analysis</h2>
            </div>
            {currentSession.analysis ? (
              <div className="space-y-6">
                <AnalysisSection title="Summary" content={currentSession.analysis.summary} />
                <AnalysisSection title="Key Points" items={currentSession.analysis.keyPoints} />
                <AnalysisSection title="Client Needs" items={currentSession.analysis.clientNeeds} />
                <AnalysisSection title="Risk Assessment">
                  <RiskAssessmentDisplay riskAssessment={currentSession.analysis.riskAssessment} />
                </AnalysisSection>
                <AnalysisSection title="Compliance Flags" items={currentSession.analysis.complianceFlags} type="compliance" />
              </div>
            ) : (
              <p className="text-on-surface-secondary">No analysis available yet. The document may still be processing.</p>
            )}
          </motion.div>

          {/* Suggested Actions Card */}
          <motion.div className="card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="card-header">
              <h2 className="card-title">Suggested Actions</h2>
            </div>
            <div className="space-y-4">
              {currentSession.suggestedActions?.length > 0 ? (
                currentSession.suggestedActions.map((action) => <ActionItem key={action.id} action={action} isExecuting={executingActions.has(action.id)} isCompleted={currentSession.actionResults?.[action.id]} onExecute={() => handleExecuteAction(action)} />)
              ) : (
                <p className="text-on-surface-secondary">No suggested actions.</p>
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

const ActionItem = ({ action, isExecuting, isCompleted, onExecute }) => (
  <div className="p-4 bg-gray-100 rounded-lg flex items-center justify-between">
    <div>
      <p className="font-semibold text-on-surface">{action.title}</p>
      <p className="text-sm text-on-surface-secondary">{action.description}</p>
    </div>
    <div className="w-32 text-right">
      {isCompleted ? (
        <div className="flex items-center justify-end gap-2 text-green-400">
          <Check size={18} />
          <span className="text-sm font-medium">Completed</span>
        </div>
      ) : (
        <button onClick={onExecute} disabled={isExecuting} className="btn btn-secondary">
          {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{isExecuting ? "..." : "Execute"}</span>
        </button>
      )}
    </div>
  </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex justify-between items-center">
    <p className="flex items-center gap-2 text-on-surface-secondary">
      <Icon className="w-4 h-4" />
      {label}
    </p>
    <p className="font-medium text-on-surface">{value}</p>
  </div>
);

export default SessionPage;
