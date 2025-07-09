import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, FileText, CheckCircle, Clock, TrendingUp, AlertTriangle, ArrowLeft, Archive } from "lucide-react";

import { useSession } from "../context/SessionContext";
import { apiService } from "../services/apiService";
import VortexAnimation from "./VortexAnimation";

const DashboardPage = () => {
  const { sessions, loadSessions, loading } = useSession();
  const navigate = useNavigate();
  const [archiveStats, setArchiveStats] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  useEffect(() => {
    loadSessions();
    loadArchiveStats();
  }, [loadSessions]);

  const loadArchiveStats = async () => {
    try {
      setArchiveLoading(true);
      const stats = await apiService.getArchiveStats();
      setArchiveStats(stats);
    } catch (error) {
      console.error("Failed to load archive stats:", error);
    } finally {
      setArchiveLoading(false);
    }
  };

  const stats = React.useMemo(() => {
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s) => s.status === "active").length;
    const totalDocuments = sessions.reduce((sum, s) => sum + (s.documents?.length || 0), 0);
    const totalActions = sessions.reduce((sum, s) => sum + (s.suggestedActions?.length || 0), 0);
    const completedActions = sessions.reduce((sum, s) => sum + Object.keys(s.actionResults || {}).length, 0);
    const archivedDocuments = sessions.reduce((sum, s) => sum + (s.metadata?.archivedDocuments || 0), 0);
    const executedActions = sessions.reduce((sum, s) => sum + (s.metadata?.executedActions || 0), 0);
    const failedActions = sessions.reduce((sum, s) => sum + (s.metadata?.failedActions || 0), 0);

    return {
      totalSessions,
      activeSessions,
      totalDocuments,
      totalActions,
      completedActions,
      archivedDocuments,
      executedActions,
      failedActions,
      completionRate: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
      archiveRate: totalDocuments > 0 ? Math.round((archivedDocuments / totalDocuments) * 100) : 0,
      executionSuccessRate: executedActions + failedActions > 0 ? Math.round((executedActions / (executedActions + failedActions)) * 100) : 0,
    };
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <VortexAnimation width={100} height={100} state="processing" />
        <p className="mt-4 text-on-surface-secondary">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <main className="container">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate("/")} className="btn btn-secondary mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        <h1 className="text-3xl font-bold text-on-surface mb-2">Dashboard</h1>
        <p className="text-on-surface-secondary mb-6">Overview of all advisory sessions and AI insights.</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ staggerChildren: 0.05 }}>
        {[
          { label: "Total Sessions", value: stats.totalSessions, icon: Users },
          { label: "Active Sessions", value: stats.activeSessions, icon: Clock },
          { label: "Documents", value: stats.totalDocuments, icon: FileText },
          { label: "Archived", value: stats.archivedDocuments, icon: Archive },
          { label: "Suggested Actions", value: stats.totalActions, icon: AlertTriangle },
          { label: "Executed Actions", value: stats.executedActions, icon: CheckCircle },
          { label: "Failed Actions", value: stats.failedActions, icon: AlertTriangle },
          { label: "Success Rate", value: `${stats.executionSuccessRate}%`, icon: TrendingUp },
          { label: "Archive Rate", value: `${stats.archiveRate}%`, icon: Archive },
        ].map((stat, index) => (
          <motion.div key={stat.label} className="card text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-on-surface">{stat.value}</p>
            <p className="text-xs text-on-surface-secondary uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Archive Statistics */}
      {archiveStats && (
        <motion.div className="card mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Archive Overview
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-on-surface">{archiveStats.totalArchives}</p>
              <p className="text-xs text-on-surface-secondary">Total Archives</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-on-surface">{archiveStats.totalSizeMB} MB</p>
              <p className="text-xs text-on-surface-secondary">Storage Used</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-on-surface">{archiveStats.sessionStats?.sessionsWithArchives || 0}</p>
              <p className="text-xs text-on-surface-secondary">Sessions with Archives</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-on-surface">{archiveStats.sessionStats?.archiveRate || 0}%</p>
              <p className="text-xs text-on-surface-secondary">Archive Rate</p>
            </div>
          </div>
          {archiveStats.documentTypes && Object.keys(archiveStats.documentTypes).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-on-surface mb-2">Document Types Archived:</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(archiveStats.documentTypes).map(([type, count]) => (
                  <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">Session #{sessions.length - index}</p>
                      <p className="text-xs text-on-surface-secondary">{new Date(session.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4 md:col-span-3 justify-center">
                      <p className="text-center">
                        <span className="font-bold text-on-surface">{session.documents?.length || 0}</span>
                        <span className="text-xs text-on-surface-secondary ml-1">docs</span>
                      </p>
                      <p className="text-center">
                        <span className="font-bold text-on-surface">{session.metadata?.archivedDocuments || 0}</span>
                        <span className="text-xs text-on-surface-secondary ml-1">archived</span>
                      </p>
                      <p className="text-center">
                        <span className="font-bold text-on-surface">{session.suggestedActions?.length || 0}</span>
                        <span className="text-xs text-on-surface-secondary ml-1">actions</span>
                      </p>
                      <p className="text-center">
                        <span className="font-bold text-green-600">{session.metadata?.executedActions || 0}</span>
                        <span className="text-xs text-on-surface-secondary ml-1">executed</span>
                      </p>
                      {session.metadata?.failedActions > 0 && (
                        <p className="text-center">
                          <span className="font-bold text-red-600">{session.metadata.failedActions}</span>
                          <span className="text-xs text-on-surface-secondary ml-1">failed</span>
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end items-center gap-2">
                      {session.analysis && <div className="text-green-400 text-xs font-medium bg-green-500/10 px-2 py-1 rounded-full">Analyzed</div>}
                      {session.metadata?.archivedDocuments > 0 && <div className="text-blue-400 text-xs font-medium bg-blue-500/10 px-2 py-1 rounded-full">Archived</div>}
                      {session.metadata?.executedActions > 0 && <div className="text-purple-400 text-xs font-medium bg-purple-500/10 px-2 py-1 rounded-full">Actions Executed</div>}
                      {session.metadata?.failedActions > 0 && <div className="text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded-full">Failed Actions</div>}
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
    </main>
  );
};

export default DashboardPage;
