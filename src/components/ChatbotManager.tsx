"use client";

import React, { useState, useEffect } from 'react';
import { Chatbot, CustomAction, User, ChatbotTheme } from '../types';
import { storage } from '../services/storage';

interface ChatbotManagerProps {
  chatbots: Chatbot[];
  onSave: (bot: Chatbot) => void;
  onDelete: (id: string) => void;
}

const MODELS = [
  // Fix: Align model IDs with task recommendations (gemini-3 series)
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Fast & Cost-effective)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (High Reasoning & Complexity)' },
];

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#22c55e', '#f97316'];
const ICONS = ['🤖', '👋', '🎓', '🚀', '💼', '🎧', '👩‍💼', '👨‍💻', '🦄', '⚡'];

export const ChatbotManager: React.FC<ChatbotManagerProps> = ({ chatbots, onSave, onDelete }) => {
  const [editingBot, setEditingBot] = useState<Chatbot | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'tools' | 'appearance'>('general');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
     const session = storage.getSession();
     if(session) setCurrentUser(session.user);
  }, []);

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [newAction, setNewAction] = useState<CustomAction>({
      id: '', name: '', description: '', url: '', method: 'POST', headers: '{}', parameters: '{\n  "type": "OBJECT",\n  "properties": {\n    "param1": { "type": "STRING" }\n  }\n}'
  });

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'editor';

  const defaultTheme: ChatbotTheme = {
      primaryColor: '#4f46e5',
      userBubbleColor: '#4f46e5',
      botBubbleColor: '#f1f5f9',
      welcomeMessage: "Hi! How can I help you today?",
      displayName: "UniBot Support",
      roundedCorners: 'lg',
      showSources: true
  };

  const handleCreateNew = () => {
    if (!canEdit) return;
    setEditingBot({
      id: crypto.randomUUID(),
      workspaceId: '', 
      name: 'New Chatbot',
      // Fix: Default to gemini-3-flash-preview
      model: 'gemini-3-flash-preview',
      systemInstruction: 'You are a helpful assistant.',
      icon: '🤖',
      color: 'blue',
      createdAt: new Date(),
      enabledTools: ['leadCapture'],
      customActions: [],
      theme: defaultTheme
    });
    setActiveTab('general');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBot) {
      onSave(editingBot);
      setEditingBot(null);
    }
  };

  const toggleTool = (tool: string) => {
      if (!editingBot) return;
      const tools = editingBot.enabledTools || [];
      if (tools.includes(tool)) {
          setEditingBot({ ...editingBot, enabledTools: tools.filter(t => t !== tool) });
      } else {
          setEditingBot({ ...editingBot, enabledTools: [...tools, tool] });
      }
  };

  const updateTheme = (updates: Partial<ChatbotTheme>) => {
      if (!editingBot) return;
      setEditingBot({
          ...editingBot,
          theme: { ...(editingBot.theme || defaultTheme), ...updates }
      });
  };

  if (editingBot) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        <header className="bg-white border-b px-8 py-6 flex justify-between items-center">
          <div>
             <h2 className="text-2xl font-bold text-slate-800">{editingBot.name}</h2>
             <p className="text-slate-500 mt-1">Configure your AI agent's personality and tools.</p>
          </div>
          <button onClick={() => setEditingBot(null)} className="text-slate-500 hover:text-slate-700 px-4 py-2">Cancel</button>
        </header>

        <div className="bg-white border-b px-8">
            <div className="flex gap-6">
                <button onClick={() => setActiveTab('general')} className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>General</button>
                <button onClick={() => setActiveTab('appearance')} className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'appearance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Appearance</button>
                <button onClick={() => setActiveTab('tools')} className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tools' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Tools</button>
            </div>
        </div>

        <main className="flex-1 overflow-auto p-8">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            
            {activeTab === 'general' && (
                <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Internal Name</label>
                        <input
                            type="text" required disabled={!canEdit}
                            value={editingBot.name}
                            onChange={(e) => setEditingBot({...editingBot, name: e.target.value})}
                            className="w-full rounded-md border-slate-300 p-2 border"
                        />
                        </div>
                        <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">AI Model</label>
                        <select
                            value={editingBot.model} disabled={!canEdit}
                            onChange={(e) => setEditingBot({...editingBot, model: e.target.value})}
                            className="w-full rounded-md border-slate-300 p-2 border bg-white"
                        >
                            {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">System Instructions</label>
                        <textarea
                            rows={8} required disabled={!canEdit}
                            value={editingBot.systemInstruction}
                            onChange={(e) => setEditingBot({...editingBot, systemInstruction: e.target.value})}
                            className="w-full rounded-md border-slate-300 p-3 border font-mono text-sm"
                        />
                    </div>
                </div>
            )}

            {activeTab === 'appearance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6">
                        <h3 className="font-bold text-slate-900 border-b pb-2">Branding</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                            <input
                                type="text"
                                value={editingBot.theme?.displayName || editingBot.name}
                                onChange={(e) => updateTheme({ displayName: e.target.value })}
                                className="w-full rounded-md border-slate-300 p-2 border"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Message</label>
                            <textarea
                                rows={2}
                                value={editingBot.theme?.welcomeMessage || ''}
                                onChange={(e) => updateTheme({ welcomeMessage: e.target.value })}
                                className="w-full rounded-md border-slate-300 p-2 border"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Theme Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c} type="button" 
                                            onClick={() => updateTheme({ primaryColor: c, userBubbleColor: c })}
                                            className={`w-6 h-6 rounded-full border-2 ${editingBot.theme?.primaryColor === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rounded Corners</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm"
                                    value={editingBot.theme?.roundedCorners || 'lg'}
                                    onChange={(e) => updateTheme({ roundedCorners: e.target.value as any })}
                                >
                                    <option value="none">Square (None)</option>
                                    <option value="sm">Small</option>
                                    <option value="md">Medium</option>
                                    <option value="lg">Large</option>
                                    <option value="full">Capsule</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={editingBot.theme?.showSources ?? true}
                                onChange={(e) => updateTheme({ showSources: e.target.checked })}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <label className="text-sm font-medium text-slate-700">Show Sources / Citations</label>
                        </div>
                    </div>

                    {/* PREVIEW */}
                    <div className="bg-slate-200 rounded-xl border p-4 flex items-center justify-center min-h-[400px]">
                        <div className="w-full max-w-sm bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col h-[450px]">
                            <div className="p-4 flex items-center gap-3 border-b text-white" style={{ backgroundColor: editingBot.theme?.primaryColor }}>
                                <span className="text-xl">{editingBot.icon}</span>
                                <span className="font-bold text-sm">{editingBot.theme?.displayName}</span>
                            </div>
                            <div className="flex-1 p-4 bg-slate-50 space-y-4">
                                <div className={`p-3 text-xs shadow-sm bg-white text-slate-800 self-start max-w-[80%]`} 
                                     style={{ borderRadius: editingBot.theme?.roundedCorners === 'full' ? '20px' : '8px' }}>
                                    {editingBot.theme?.welcomeMessage}
                                </div>
                                <div className={`p-3 text-xs shadow-sm text-white self-end ml-auto max-w-[80%]`} 
                                     style={{ 
                                         backgroundColor: editingBot.theme?.userBubbleColor,
                                         borderRadius: editingBot.theme?.roundedCorners === 'full' ? '20px' : '8px' 
                                     }}>
                                    How much does it cost?
                                </div>
                            </div>
                            <div className="p-3 border-t bg-white flex gap-2">
                                <div className="flex-1 h-8 bg-slate-100 rounded-full"></div>
                                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: editingBot.theme?.primaryColor }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'tools' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-sm border p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Built-in Capabilities</h3>
                        <div className="space-y-4">
                            <label className="flex items-start gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" checked={editingBot.enabledTools?.includes('leadCapture')} onChange={() => toggleTool('leadCapture')} className="mt-1 h-4 w-4"/>
                                <div><span className="block font-medium">Lead Collection</span><span className="text-sm text-slate-500">Auto-capture contacts via chat.</span></div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <div className="pt-4 flex items-center justify-between border-t sticky bottom-0 bg-slate-50 py-4">
               {canEdit && (
                   <button type="button" onClick={() => { if(confirm('Delete?')) { onDelete(editingBot.id); setEditingBot(null); } }} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete Bot</button>
               )}
               <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm">Save Chatbot</button>
            </div>

          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b px-8 py-6 flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-slate-800">My Chatbots</h2><p className="text-slate-500 mt-1">Manage all your specialized AI agents.</p></div>
        {canEdit && (
            <button onClick={handleCreateNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all">+ Create New Bot</button>
        )}
      </header>
      <main className="p-8 overflow-auto"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chatbots.map(bot => (
            <div key={bot.id} className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setEditingBot(bot)}>
                <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl" style={{ borderBottom: `4px solid ${bot.theme?.primaryColor || '#3b82f6'}` }}>{bot.icon}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">ID: {bot.id.substring(0,6)}</div>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{bot.name}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{bot.systemInstruction}</p>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-xs text-slate-400">Created: {new Date(bot.createdAt).toLocaleDateString()}</span>
                    <span className="text-blue-600 text-xs font-bold group-hover:translate-x-1 transition-transform">Edit Bot →</span>
                </div>
            </div>
        ))}
      </div></main>
    </div>
  );
};