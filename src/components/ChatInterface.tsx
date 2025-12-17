
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, MessageRole, Chatbot, ChatSession, KnowledgeItem, Lead } from '../types';
import { geminiService } from '../services/geminiService';
import { storage } from '../services/storage';

interface ChatInterfaceProps {
  chatbots: Chatbot[];
  knowledgeBase: KnowledgeItem[];
  onLeadCaptured: (lead: Omit<Lead, "id" | "capturedAt" | "workspaceId" | "status" | "tags" | "customAttributes">) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatbots, knowledgeBase, onLeadCaptured }) => {
  const [activeChatbotId, setActiveChatbotId] = useState<string>(chatbots[0]?.id || '');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChatbot = chatbots.find(c => c.id === activeChatbotId) || chatbots[0];
  const theme = activeChatbot?.theme;

  const getSessionMetadata = () => {
     return {
         browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
         os: navigator.platform,
         region: Intl.DateTimeFormat().resolvedOptions().timeZone,
         deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' as const : 'desktop' as const
     };
  };

  useEffect(() => {
    if (!activeChatbot) return;

    let currentSession = storage.getActiveSession(activeChatbot.id);
    if (!currentSession) {
        currentSession = storage.createSession(activeChatbot.id, activeChatbot.workspaceId, getSessionMetadata());
    }
    setSession(currentSession);

    const savedMessages = storage.getMessages(currentSession.id);
    if (savedMessages.length > 0) {
        setMessages(savedMessages);
    } else {
        const welcomeMsg: ChatMessage = {
            id: 'welcome',
            role: MessageRole.Model,
            text: theme?.welcomeMessage || `Hi! I'm ${activeChatbot.name}. How can I help you today?`,
            timestamp: new Date()
        };
        setMessages([welcomeMsg]);
    }
  }, [activeChatbotId, chatbots]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isStreaming || !activeChatbot || !session) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      role: MessageRole.User,
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    storage.saveMessage(session.id, userMessage);
    setInputText('');
    setIsStreaming(true);

    const botMessageId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: botMessageId, sessionId: session.id, role: MessageRole.Model, text: "", timestamp: new Date() }]);

    try {
      const history = messages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const stream = geminiService.sendMessageStream(activeChatbot, history, userMessage.text, knowledgeBase, onLeadCaptured);

      let fullResponse = "";
      let accumulatedSources: { title: string; url: string }[] = [];

      for await (const chunk of stream) {
        fullResponse += chunk.text;
        if (chunk.sources) {
            const newSources = chunk.sources.filter(s => !accumulatedSources.some(exist => exist.url === s.url));
            accumulatedSources = [...accumulatedSources, ...newSources];
        }
        setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, text: fullResponse, sources: accumulatedSources } : msg));
      }
      storage.saveMessage(session.id, { id: botMessageId, sessionId: session.id, role: MessageRole.Model, text: fullResponse, timestamp: new Date(), sources: accumulatedSources });
    } catch (error) {
      setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, text: "Error connecting to AI.", isError: true } : msg));
    } finally {
      setIsStreaming(false);
    }
  };

  const getBorderRadius = () => {
      switch(theme?.roundedCorners) {
          case 'none': return '0px';
          case 'sm': return '4px';
          case 'md': return '8px';
          case 'lg': return '16px';
          case 'full': return '24px';
          default: return '16px';
      }
  };

  if (!activeChatbot) return <div className="p-8 text-center text-slate-500">No Chatbots found.</div>;

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="border-b px-6 py-4 flex justify-between items-center bg-white z-10 shadow-sm">
        <div className="flex items-center gap-4">
           <div>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <h2 className="text-lg font-bold text-slate-800">{theme?.displayName || activeChatbot.name}</h2>
             </div>
           </div>
           <select value={activeChatbotId} onChange={(e) => setActiveChatbotId(e.target.value)} className="bg-slate-100 text-sm font-medium py-1 px-2 rounded-lg border-none focus:ring-0">
                {chatbots.map(bot => <option key={bot.id} value={bot.id}>{bot.icon} {bot.name}</option>)}
           </select>
        </div>
        <button onClick={() => { if(confirm('Clear?')) { storage.clearSessionMessages(session!.id); setMessages([]); }}} className="text-slate-400 hover:text-red-500 text-sm flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Reset</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === MessageRole.User ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`flex max-w-[85%] flex-col ${msg.role === MessageRole.User ? 'items-end' : 'items-start'}`}>
              <div className={`flex ${msg.role === MessageRole.User ? 'flex-row-reverse' : 'flex-row'} gap-3 group`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === MessageRole.User ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-2xl'}`}>
                   {msg.role === MessageRole.User ? 'U' : activeChatbot.icon}
                </div>
                <div className={`p-4 shadow-sm text-sm leading-relaxed whitespace-pre-wrap`} style={{ 
                    borderRadius: getBorderRadius(),
                    backgroundColor: msg.role === MessageRole.User ? (theme?.userBubbleColor || '#4f46e5') : (theme?.botBubbleColor || '#ffffff'),
                    color: msg.role === MessageRole.User ? '#ffffff' : '#1e293b'
                }}>
                  {msg.text}
                </div>
              </div>

              {/* CITATIONS */}
              {msg.role === MessageRole.Model && theme?.showSources && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 ml-11 flex flex-wrap gap-2">
                      {msg.sources.map((source, idx) => (
                          <a key={idx} href={source.url} target="_blank" rel="noreferrer" className="text-[10px] bg-white border px-2 py-1 rounded-full text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              {source.title.substring(0, 20)}...
                          </a>
                      ))}
                  </div>
              )}
            </div>
          </div>
        ))}
        {isStreaming && <div className="flex justify-start pl-11"><div className="bg-slate-100 px-4 py-2 rounded-full flex items-center gap-1"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div></div></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={inputText} onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder={`Message...`}
            className="w-full pl-4 pr-14 py-3 bg-slate-50 border-slate-200 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-slate-800 shadow-sm"
            rows={1}
          />
          <button onClick={handleSendMessage} disabled={!inputText.trim() || isStreaming} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-800 text-white rounded-lg hover:bg-black disabled:opacity-50 transition-all shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
