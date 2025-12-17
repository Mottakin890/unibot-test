
import React, { useState, useEffect } from 'react';
import { Chatbot, CustomAction, User } from '../src/types';
import { storage } from '../services/storage';

interface ChatbotManagerProps {
  chatbots: Chatbot[];
  onSave: (bot: Chatbot) => void;
  onDelete: (id: string) => void;
}

const MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & Cost-effective)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (High Reasoning & Complexity)' },
];

const COLORS = ['blue', 'indigo', 'purple', 'pink', 'green', 'orange'];
const ICONS = ['🤖', '👋', '🎓', '🚀', '💼', '🎧', '👩‍💼', '👨‍💻', '🦄', '⚡'];

export const ChatbotManager: React.FC<ChatbotManagerProps> = ({ chatbots, onSave, onDelete }) => {
  const [editingBot, setEditingBot] = useState<Chatbot | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'tools'>('general');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
     const session = storage.getSession();
     if(session) setCurrentUser(session.user);
  }, []);

  // Custom Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [newAction, setNewAction] = useState<CustomAction>({
      id: '', name: '', description: '', url: '', method: 'POST', headers: '{}', parameters: '{\n  "type": "OBJECT",\n  "properties": {\n    "param1": { "type": "STRING" }\n  }\n}'
  });

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'editor';

  const handleCreateNew = () => {
    if (!canEdit) {
        alert("Permission Denied: You do not have permission to create chatbots.");
        return;
    }
    setEditingBot({
      id: crypto.randomUUID(),
      workspaceId: '', 
      name: 'New Chatbot',
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are a helpful assistant.',
      icon: '🤖',
      color: 'blue',
      createdAt: new Date(),
      enabledTools: ['leadCapture'], // Default enabled
      customActions: []
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

  const saveAction = () => {
      if (!editingBot) return;
      const actionToSave = { ...newAction, id: newAction.id || crypto.randomUUID() };
      
      const currentActions = editingBot.customActions || [];
      const idx = currentActions.findIndex(a => a.id === actionToSave.id);
      
      let updatedActions;
      if (idx !== -1) {
          updatedActions = [...currentActions];
          updatedActions[idx] = actionToSave;
      } else {
          updatedActions = [...currentActions, actionToSave];
      }
      
      setEditingBot({ ...editingBot, customActions: updatedActions });
      setIsActionModalOpen(false);
  };

  const deleteAction = (id: string) => {
      if (!editingBot) return;
      setEditingBot({ 
          ...editingBot, 
          customActions: editingBot.customActions?.filter(a => a.id !== id) 
      });
  };

  const openActionModal = (action?: CustomAction) => {
      if (action) {
          setNewAction(action);
      } else {
          setNewAction({
              id: '', name: '', description: '', url: '', method: 'POST', headers: '{}', parameters: '{\n  "type": "OBJECT",\n  "properties": {\n    "orderId": { "type": "STRING" }\n  }\n}'
          });
      }
      setIsActionModalOpen(true);
  };

  if (editingBot) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        <header className="bg-white border-b px-8 py-6 flex justify-between items-center">
          <div>
             <h2 className="text-2xl font-bold text-slate-800">{editingBot.id ? 'Edit Chatbot' : 'Create Chatbot'}</h2>
             <p className="text-slate-500 mt-1">Configure your AI agent's personality and tools.</p>
          </div>
          <button 
            onClick={() => setEditingBot(null)}
            className="text-slate-500 hover:text-slate-700 px-4 py-2"
          >
            Cancel
          </button>
        </header>

        {/* TABS */}
        <div className="bg-white border-b px-8">
            <div className="flex gap-6">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    General Settings
                </button>
                <button 
                    onClick={() => setActiveTab('tools')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tools' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Tools & Integrations
                </button>
            </div>
        </div>

        <main className="flex-1 overflow-auto p-8">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6 animate-fade-in">
                    {!canEdit && (
                         <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm mb-4">
                             You are in Read-Only mode. Ask an admin to make changes.
                         </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bot Name</label>
                        <input
                            type="text"
                            required
                            disabled={!canEdit}
                            value={editingBot.name}
                            onChange={(e) => setEditingBot({...editingBot, name: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border disabled:bg-slate-100"
                        />
                        </div>
                        <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">AI Model</label>
                        <select
                            value={editingBot.model}
                            disabled={!canEdit}
                            onChange={(e) => setEditingBot({...editingBot, model: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white disabled:bg-slate-100"
                        >
                            {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Appearance</label>
                        <div className="flex gap-4 items-center mt-2">
                            <div className="flex gap-2 bg-slate-50 p-2 rounded-lg border">
                                {ICONS.map(icon => (
                                    <button
                                    key={icon}
                                    type="button"
                                    disabled={!canEdit}
                                    onClick={() => setEditingBot({...editingBot, icon})}
                                    className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white ${editingBot.icon === icon ? 'bg-white shadow ring-2 ring-blue-500' : ''}`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 bg-slate-50 p-2 rounded-lg border">
                                {COLORS.map(color => (
                                    <button
                                    key={color}
                                    type="button"
                                    disabled={!canEdit}
                                    onClick={() => setEditingBot({...editingBot, color})}
                                    className={`w-8 h-8 rounded-full border-2 ${editingBot.color === color ? 'border-slate-400 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color === 'indigo' ? '#4f46e5' : color }} 
                                    >
                                    <div className={`w-full h-full rounded-full bg-${color}-500 opacity-80`}></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            System Instructions (Personality)
                        </label>
                        <textarea
                            rows={10}
                            required
                            disabled={!canEdit}
                            value={editingBot.systemInstruction}
                            onChange={(e) => setEditingBot({...editingBot, systemInstruction: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border font-mono disabled:bg-slate-100"
                        />
                    </div>
                </div>
            )}

            {/* TOOLS TAB */}
            {activeTab === 'tools' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Native Tools */}
                    <div className="bg-white rounded-xl shadow-sm border p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Built-in Capabilities</h3>
                        <div className="space-y-4">
                            <label className="flex items-start gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    disabled={!canEdit}
                                    checked={editingBot.enabledTools?.includes('leadCapture')} 
                                    onChange={() => toggleTool('leadCapture')}
                                    className="mt-1 h-4 w-4 text-blue-600 rounded disabled:opacity-50"
                                />
                                <div>
                                    <span className="block font-medium text-slate-900">Lead Collection</span>
                                    <span className="block text-sm text-slate-500">Automatically ask for and save customer contact details when they show interest.</span>
                                </div>
                            </label>
                            
                            <label className="flex items-start gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    disabled={!canEdit}
                                    checked={editingBot.enabledTools?.includes('googleSearch')} 
                                    onChange={() => toggleTool('googleSearch')}
                                    className="mt-1 h-4 w-4 text-blue-600 rounded disabled:opacity-50"
                                />
                                <div>
                                    <span className="block font-medium text-slate-900">Google Search Grounding</span>
                                    <span className="block text-sm text-slate-500">Allow the bot to search the live web for up-to-date information. Adds citations to responses.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Custom Actions */}
                    <div className="bg-white rounded-xl shadow-sm border p-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Custom Actions (Webhooks)</h3>
                                <p className="text-sm text-slate-500">Connect to your own API to perform actions like checking stock or booking appointments.</p>
                            </div>
                            {canEdit && (
                                <button 
                                    type="button"
                                    onClick={() => openActionModal()}
                                    className="text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
                                >
                                    + Add Action
                                </button>
                            )}
                        </div>

                        {(editingBot.customActions || []).length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                <p className="text-sm text-slate-500">No custom actions defined.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {(editingBot.customActions || []).map(action => (
                                    <div key={action.id} className="border rounded-lg p-4 flex justify-between items-center hover:border-blue-300 bg-white">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">{action.method}</span>
                                                <span className="font-bold text-slate-900">{action.name}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => openActionModal(action)} className="text-slate-400 hover:text-blue-600 text-xs">Edit</button>
                                                <button type="button" onClick={() => deleteAction(action.id)} className="text-slate-400 hover:text-red-600 text-xs">Delete</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="pt-4 flex items-center justify-between border-t sticky bottom-0 bg-slate-50 py-4">
               {canEdit && (
                   <button
                    type="button"
                    onClick={() => {
                        if(confirm('Are you sure you want to delete this chatbot?')) {
                            onDelete(editingBot.id);
                            setEditingBot(null);
                        }
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                   >
                    Delete Chatbot
                   </button>
               )}
               {!canEdit && <span></span>}
               
               {canEdit && (
                   <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                   >
                    Save Chatbot
                   </button>
               )}
            </div>

          </form>
        </main>

        {/* Action Modal */}
        {isActionModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                    <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Configure Action</h3>
                        <button onClick={() => setIsActionModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Function Name (for LLM)</label>
                            <input 
                                value={newAction.name} 
                                onChange={(e) => setNewAction({...newAction, name: e.target.value})}
                                placeholder="checkOrderStatus"
                                className="w-full text-sm border-slate-300 rounded-md shadow-sm border p-2 font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                            <input 
                                value={newAction.description} 
                                onChange={(e) => setNewAction({...newAction, description: e.target.value})}
                                placeholder="Checks the status of an order given an ID"
                                className="w-full text-sm border-slate-300 rounded-md shadow-sm border p-2"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                             <div className="col-span-1">
                                <label className="block text-xs font-medium text-slate-700 mb-1">Method</label>
                                <select 
                                    value={newAction.method} 
                                    onChange={(e) => setNewAction({...newAction, method: e.target.value as any})}
                                    className="w-full text-sm border-slate-300 rounded-md shadow-sm border p-2 bg-white"
                                >
                                    <option>GET</option>
                                    <option>POST</option>
                                </select>
                             </div>
                             <div className="col-span-3">
                                <label className="block text-xs font-medium text-slate-700 mb-1">Webhook URL</label>
                                <input 
                                    value={newAction.url} 
                                    onChange={(e) => setNewAction({...newAction, url: e.target.value})}
                                    placeholder="https://api.example.com/orders"
                                    className="w-full text-sm border-slate-300 rounded-md shadow-sm border p-2 font-mono"
                                />
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Parameters (JSON Schema)</label>
                            <textarea 
                                value={newAction.parameters} 
                                onChange={(e) => setNewAction({...newAction, parameters: e.target.value})}
                                className="w-full text-xs border-slate-300 rounded-md shadow-sm border p-2 font-mono h-32"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Headers (JSON)</label>
                            <textarea 
                                value={newAction.headers} 
                                onChange={(e) => setNewAction({...newAction, headers: e.target.value})}
                                className="w-full text-xs border-slate-300 rounded-md shadow-sm border p-2 font-mono h-16"
                                placeholder='{ "Authorization": "Bearer token" }'
                            />
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
                        <button type="button" onClick={() => setIsActionModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
                        <button type="button" onClick={saveAction} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Action</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    );
  };
