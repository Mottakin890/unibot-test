
"use client";

import React, { useState } from 'react';
import { Chatbot } from '../types';

interface EmbedManagerProps {
  chatbots: Chatbot[];
}

export const EmbedManager: React.FC<EmbedManagerProps> = ({ chatbots }) => {
  const [selectedBotId, setSelectedBotId] = useState(chatbots[0]?.id || '');
  const bot = chatbots.find(b => b.id === selectedBotId) || chatbots[0];

  const publicUrl = `http://localhost:3000/chatbot/${selectedBotId}`;
  const scriptSnippet = `<script
  src="http://localhost:3000/api/widget.js"
  id="${selectedBotId}"
  defer
></script>`;

  const [copied, setCopied] = useState<'url' | 'script' | null>(null);

  const handleCopy = (text: string, type: 'url' | 'script') => {
      navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
  };

  if (!bot) return <div className="p-8 text-center text-slate-500">Create a chatbot first.</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b px-8 py-6">
        <h2 className="text-2xl font-bold text-slate-800">Connect & Embed</h2>
        <p className="text-slate-500 mt-1">Make your chatbot live on your website.</p>
      </header>

      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="bg-white rounded-xl shadow-sm border p-8">
             <label className="block text-sm font-bold text-slate-700 mb-4">Select Chatbot</label>
             <select 
               value={selectedBotId} 
               onChange={(e) => setSelectedBotId(e.target.value)}
               className="w-full border rounded-lg p-3 bg-slate-50 font-medium"
             >
                 {chatbots.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
             </select>
          </div>

          {/* PUBLIC LINK */}
          <div className="bg-white rounded-xl shadow-sm border p-8">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-lg">Shareable Public Link</h3>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold uppercase">Active</span>
             </div>
             <p className="text-sm text-slate-500 mb-6">Send this link to your customers or add it to your social media bios. It opens a full-page chat interface.</p>
             <div className="flex gap-2">
                 <input readOnly value={publicUrl} className="flex-1 bg-slate-100 border-none rounded-lg px-4 text-sm font-mono text-slate-600"/>
                 <button 
                    onClick={() => handleCopy(publicUrl, 'url')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${copied === 'url' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                 >
                    {copied === 'url' ? 'Copied!' : 'Copy Link'}
                 </button>
             </div>
          </div>

          {/* EMBED SCRIPT */}
          <div className="bg-white rounded-xl shadow-sm border p-8">
             <h3 className="font-bold text-slate-900 text-lg mb-2">Embed on Website</h3>
             <p className="text-sm text-slate-500 mb-6">Add this bubble to the bottom right of your website by pasting this snippet inside your <code>&lt;head&gt;</code> or <code>&lt;body&gt;</code> tag.</p>
             <div className="bg-slate-900 rounded-xl p-6 relative group">
                 <pre className="text-blue-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{scriptSnippet}</pre>
                 <button 
                    onClick={() => handleCopy(scriptSnippet, 'script')}
                    className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                 >
                    {copied === 'script' ? 'Copied!' : 'Copy Snippet'}
                 </button>
             </div>
             <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
                 <div className="flex items-center gap-1"><svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> SSL Secure</div>
                 <div className="flex items-center gap-1"><svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> Zero Latency</div>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
};
