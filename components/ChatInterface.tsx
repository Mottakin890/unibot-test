
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, MessageRole, Chatbot, ChatSession } from '../src/types';
import { geminiService } from '../services/geminiService';
import { storage } from '../services/storage';
import { KnowledgeItem, Lead } from '../src/types';

interface ChatInterfaceProps {
  chatbots: Chatbot[];
  knowledgeBase: KnowledgeItem[]; // Used internally by service now
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

  // Helper to detect environment
  const getSessionMetadata = () => {
     return {
         browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other',
         os: navigator.platform,
         region: Intl.DateTimeFormat().resolvedOptions().timeZone,
         deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' as const : 'desktop' as const
     };
  };

  useEffect(() => {
    if (!activeChatbot) return;

    let currentSession = storage.getActiveSession(activeChatbot.id);
    if (!currentSession) {
        // Create new session with Analytics Metadata
        currentSession = storage.createSession(
            activeChatbot.id, 
            activeChatbot.workspaceId,
            getSessionMetadata()
        );
    }
    setSession(currentSession);

    const savedMessages = storage.getMessages(currentSession.id);
    if (savedMessages.length > 0) {
        setMessages(savedMessages);
    } else {
        const welcomeMsg: ChatMessage = {
            id: 'welcome',
            role: MessageRole.Model,
            text: `Hi! I'm ${activeChatbot.name}. How can I help you today?`,
            timestamp: new Date()
        };
        setMessages([welcomeMsg]);
    }
  }, [activeChatbotId, chatbots]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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
    const initialBotMessage: ChatMessage = {
        id: botMessageId,
        sessionId: session.id,
        role: MessageRole.Model,
        text: "",
        timestamp: new Date()
    };
    setMessages(prev => [...prev, initialBotMessage]);

    try {
      const historyMessages = messages.filter(m => !m.isError && m.id !== 'welcome');
      const apiHistory = historyMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const stream = geminiService.sendMessageStream(
        activeChatbot, 
        apiHistory,
        userMessage.text,
        knowledgeBase,
        onLeadCaptured
      );

      let fullResponse = "";
      let accumulatedSources: { title: string; url: string }[] = [];

      for await (const chunk of stream) {
        fullResponse += chunk.text;
        
        // Accumulate unique sources
        if (chunk.sources) {
            const newSources = chunk.sources.filter(
                s => !accumulatedSources.some(exist => exist.url === s.url)
            );
            accumulatedSources = [...accumulatedSources, ...newSources];
        }

        setMessages(prev => 
            prev.map(msg => 
                msg.id === botMessageId 
                    ? { ...msg, text: fullResponse, sources: accumulatedSources }
                    : msg
            )
        );
      }

      const finalBotMessage: ChatMessage = {
          ...initialBotMessage,
          text: fullResponse,
          sources: accumulatedSources
      };
      storage.saveMessage(session.id, finalBotMessage);

    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg => 
          msg.id === botMessageId
            ? { ...msg, text: "I apologize, I'm having trouble connecting to my brain right now.", isError: true }
            : msg
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
      if (!session) return;
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
          const updated = { ...msg, feedback: type };
          setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
          storage.saveMessage(session.id, updated);
      }
  };

  const handleResetChat = () => {
      if (!session || !confirm("Are you sure you want to clear this conversation history?")) return;
      storage.clearSessionMessages(session.id);
      setMessages([{
          id: 'welcome',
          role: MessageRole.Model,
          text: `Hi! I'm ${activeChatbot.name}. How can I help you today?`,
          timestamp: new Date()
      }]);
  };

  if (!activeChatbot) {
      return <div className="p-8 text-center text-slate-500">No Chatbots found.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="border-b px-6 py-4 flex justify-between items-center bg-white z-10 shadow-sm">
        <div className="flex items-center gap-4">
           <div>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <h2 className="text-lg font-bold text-slate-800">Live Preview</h2>
             </div>
             <p className="text-xs text-slate-500 mt-0.5">Test your chatbot's responses</p>
           </div>
           
           <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <select 
                value={activeChatbotId}
                onChange={(e) => setActiveChatbotId(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-700 py-1 px-2 border-none outline-none focus:ring-0"
              >
                  {chatbots.map(bot => (
                      <option key={bot.id} value={bot.id}>{bot.icon} {bot.name}</option>
                  ))}
              </select>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
             <button onClick={handleResetChat} className="text-slate-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors" title="Clear History">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 Clear Chat
             </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === MessageRole.User ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`flex max-w-[85%] flex-col ${msg.role === MessageRole.User ? 'items-end' : 'items-start'}`}>
              
              <div className={`flex ${msg.role === MessageRole.User ? 'flex-row-reverse' : 'flex-row'} gap-3 group`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === MessageRole.User ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-2xl'}`}>
                   {msg.role === MessageRole.User ? (
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                   ) : (
                     <span>{activeChatbot.icon}</span>
                   )}
                </div>
                
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === MessageRole.User 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : msg.isError 
                      ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>

                {/* Feedback Buttons for Bot */}
                {msg.role === MessageRole.Model && !msg.isError && msg.id !== 'welcome' && (
                    <div className={`flex flex-col justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.feedback ? 'opacity-100' : ''}`}>
                        <button 
                            onClick={() => handleFeedback(msg.id, 'up')}
                            className={`p-1 rounded hover:bg-slate-100 ${msg.feedback === 'up' ? 'text-green-500' : 'text-slate-400'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                        </button>
                        <button 
                            onClick={() => handleFeedback(msg.id, 'down')}
                            className={`p-1 rounded hover:bg-slate-100 ${msg.feedback === 'down' ? 'text-red-500' : 'text-slate-400'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.92m-3.76 9.02V19a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
                        </button>
                    </div>
                )}
              </div>

              {/* SOURCES / GROUNDING */}
              {msg.role === MessageRole.Model && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 ml-12 bg-white border border-slate-200 rounded-lg p-2 max-w-sm">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 px-1">Sources</p>
                      <div className="flex flex-col gap-1">
                          {msg.sources.map((source, idx) => (
                              <a 
                                key={idx} 
                                href={source.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:underline truncate px-1"
                              >
                                  {idx + 1}. {source.title}
                              </a>
                          ))}
                      </div>
                  </div>
              )}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start pl-11">
               <div className="bg-slate-100 px-4 py-2 rounded-full flex items-center gap-1">
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
               </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder={`Message ${activeChatbot.name}...`}
            className="w-full pl-4 pr-14 py-3 bg-slate-50 border-slate-200 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-slate-800 shadow-sm transition-all focus:bg-white"
            rows={1}
            style={{ minHeight: '52px', maxHeight: '150px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isStreaming}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          {activeChatbot.name} can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
};
