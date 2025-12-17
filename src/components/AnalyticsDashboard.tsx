
"use client";

import React, { useMemo, useState } from 'react';
import { storage } from '../services/storage';
import { Workspace, ChatMessage, MessageRole } from '../types';

interface AnalyticsDashboardProps {
  workspace: Workspace;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ workspace }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fetch aggregated data
  const analytics = useMemo(() => storage.getAnalyticsData(workspace.id), [workspace.id]);
  
  // Fetch specific session logs if selected
  const selectedSessionLogs = useMemo(() => {
      if (!selectedSessionId) return [];
      return storage.getMessages(selectedSessionId);
  }, [selectedSessionId]);

  const handleExportSession = () => {
      if (!selectedSessionId || selectedSessionLogs.length === 0) return;
      
      const content = JSON.stringify(selectedSessionLogs, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-session-${selectedSessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <header className="bg-white border-b px-8 py-6">
        <h2 className="text-2xl font-bold text-slate-800">Analytics & Logs</h2>
        <p className="text-slate-500 mt-1">Monitor conversation metrics and inspect chat history.</p>
      </header>

      <main className="flex-1 overflow-auto p-8">
        
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-500">Total Conversations</h3>
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.totalSessions}</p>
                <p className="text-xs text-green-600 mt-2 font-medium flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    All time
                </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-500">Leads Captured</h3>
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.totalLeads}</p>
                 <p className="text-xs text-slate-500 mt-2">Conversion: {analytics.totalSessions > 0 ? ((analytics.totalLeads/analytics.totalSessions)*100).toFixed(1) : 0}%</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-500">User Satisfaction</h3>
                    <div className="bg-green-100 p-2 rounded-lg text-green-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                    </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.satisfactionRate}%</p>
                <p className="text-xs text-slate-500 mt-2">Based on Thumbs Up/Down feedback</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-500">Total Interactions</h3>
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                    </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{analytics.totalMessages}</p>
                <p className="text-xs text-slate-500 mt-2">Across all sessions</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Recent Sessions List */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Recent Sessions</h3>
                </div>
                <div className="divide-y divide-slate-50">
                    {analytics.recentSessions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No sessions recorded yet.</div>
                    ) : (
                        analytics.recentSessions.map(session => (
                            <div 
                                key={session.id} 
                                onClick={() => setSelectedSessionId(session.id)}
                                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between ${selectedSessionId === session.id ? 'bg-blue-50' : ''}`}
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-slate-900">
                                            {session.device === 'mobile' ? 'Mobile User' : 'Desktop User'}
                                        </span>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                            {session.location.split('/')[1] || session.location}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate max-w-md">{session.preview}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-medium text-slate-900">{session.date.toLocaleDateString()}</div>
                                    <div className="text-[10px] text-slate-400">{session.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Side Stats */}
            <div className="space-y-6">
                
                {/* Traffic Volume (Simple Bar Chart) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-4">Last 7 Days Traffic</h3>
                    <div className="flex items-end justify-between h-32 gap-2">
                        {analytics.sessionsByDate.map((day, idx) => (
                            <div key={idx} className="flex flex-col items-center flex-1 gap-1">
                                <div 
                                    className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600" 
                                    style={{ 
                                        height: `${Math.max(day.count * 10, 4)}px`, 
                                        opacity: day.count === 0 ? 0.3 : 1 
                                    }}
                                ></div>
                                <span className="text-[10px] text-slate-400 transform -rotate-45 origin-left mt-2">{day.date.split('/')[1]}/{day.date.split('/')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                 {/* Top Locations */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-4">User Locations</h3>
                    {analytics.topLocations.length === 0 ? (
                        <p className="text-xs text-slate-400">No location data.</p>
                    ) : (
                        <div className="space-y-3">
                            {analytics.topLocations.map((loc, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 truncate max-w-[150px]">{loc.region}</span>
                                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">{loc.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Modal for Chat Transcript */}
        {selectedSessionId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in-up">
                    <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                        <div>
                           <h3 className="font-bold text-slate-800">Session Transcript</h3>
                           <p className="text-xs text-slate-500">ID: {selectedSessionId}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleExportSession} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors">Export JSON</button>
                            <button onClick={() => setSelectedSessionId(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                        {selectedSessionLogs.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === MessageRole.User ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                                    msg.role === MessageRole.User ? 'bg-blue-100 text-blue-900' : 'bg-white border border-slate-200'
                                }`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-[10px] opacity-50">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                        {msg.feedback && (
                                            <span className={`text-[10px] font-bold uppercase ${msg.feedback === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                                                {msg.feedback === 'up' ? 'Helpful' : 'Unhelpful'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};
