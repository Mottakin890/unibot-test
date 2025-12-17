
import React, { useState, useEffect } from 'react';
import { Workspace, AuditLog, User } from '../src/types';
import { storage } from '../services/storage';

interface SettingsProps {
  workspace: Workspace;
  onUpdateWorkspace: (w: Workspace) => void;
}

export const Settings: React.FC<SettingsProps> = ({ workspace, onUpdateWorkspace }) => {
  const [name, setName] = useState(workspace.name);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'logs' | 'compliance'>('general');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
      const session = storage.getSession();
      if (session) setCurrentUser(session.user);
      
      if (activeTab === 'logs') {
          setLogs(storage.getAuditLogs(workspace.id));
      }
  }, [activeTab, workspace.id]);

  const handleSave = () => {
    if (currentUser?.role !== 'admin') {
        alert("Permission denied: Only Admins can update workspace settings.");
        return;
    }
    const updated = { ...workspace, name };
    // Pass user for auditing
    storage.updateWorkspace(updated, currentUser || undefined); 
    onUpdateWorkspace(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportData = () => {
      const data = storage.exportWorkspaceData(workspace.id);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-export-${workspace.id}-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleDeleteWorkspace = () => {
      if (confirm("CRITICAL WARNING: This will permanently delete ALL data, chatbots, leads, and logs for this workspace. This action cannot be undone. Type 'DELETE' to confirm.")) {
          // In a real app we'd check the typed input.
          storage.deleteWorkspaceData(workspace.id);
          window.location.reload();
      }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b px-8 py-6 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Workspace Settings</h2>
            <p className="text-slate-500 mt-1">Manage AI config, security, and audit logs.</p>
        </div>
        {currentUser && (
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
            }`}>
                Role: {currentUser.role}
            </div>
        )}
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-8">
            <div className="flex gap-6">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Configuration
                </button>
                <button 
                    onClick={() => setActiveTab('logs')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Audit Logs
                </button>
                <button 
                    onClick={() => setActiveTab('compliance')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'compliance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Compliance & Data
                </button>
            </div>
      </div>

      <main className="flex-1 p-8 overflow-auto">
        
        {/* CONFIG TAB */}
        {activeTab === 'general' && (
            <div className="max-w-2xl bg-white rounded-xl shadow-sm border p-8 space-y-8">
            
            {/* Workspace Details */}
            <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">General Information</h3>
                <div className="grid gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Name</label>
                    <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border disabled:bg-slate-100 disabled:text-slate-500"
                    />
                </div>
                </div>
            </div>

            {isAdmin && (
                <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-6">
                    {isSaved && <span className="text-green-600 text-sm font-medium animate-fade-in">Changes saved successfully!</span>}
                    {!isSaved && <span></span>}
                    <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                    Save Changes
                    </button>
                </div>
            )}
            </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Severity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Resource</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">No logs found.</td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                            {log.timestamp.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                log.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                log.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {log.severity.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {log.action}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {log.actorName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                                            {log.targetResource}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={log.details}>
                                            {log.details}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* COMPLIANCE TAB */}
        {activeTab === 'compliance' && (
            <div className="max-w-3xl space-y-6">
                <div className="bg-white rounded-xl shadow-sm border p-8">
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Data Portability (GDPR/CCPA)</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Download a machine-readable JSON export of all your workspace data, including chat history, leads, settings, and audit logs.
                    </p>
                    <button 
                        onClick={handleExportData}
                        className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium border border-slate-300"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export Workspace Data (JSON)
                    </button>
                </div>

                <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-8">
                    <h3 className="text-lg font-medium text-red-800 mb-2">Danger Zone</h3>
                    <p className="text-sm text-red-600 mb-6">
                        Permanently remove your workspace and all associated data. This action is irreversible.
                    </p>
                    {isAdmin ? (
                        <button 
                            onClick={handleDeleteWorkspace}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            Delete Workspace
                        </button>
                    ) : (
                        <p className="text-xs text-red-500 font-bold">Only admins can perform this action.</p>
                    )}
                </div>
            </div>
        )}

      </main>
    </div>
  );
};
