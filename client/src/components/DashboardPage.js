import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, FileText, CheckCircle, Clock, TrendingUp, AlertTriangle } from "lucide-react";

import { useSession } from "../context/SessionContext";
import VortexAnimation from "./VortexAnimation";

const DashboardPage = () => {
  const { sessions, loadSessions, loading } = useSession();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <VortexAnimation size={100} particleCount={8} isActive={true} />
        <p className="mt-4 text-on-surface-secondary">Loading dashboard...</p>
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
    </main>
  );
};

export default DashboardPage;
