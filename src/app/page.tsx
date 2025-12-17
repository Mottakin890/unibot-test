
"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatInterface } from '../components/ChatInterface';
import { KnowledgeBase } from '../components/KnowledgeBase';
import { LeadsDashboard } from '../components/LeadsDashboard';
import { ChatbotManager } from '../components/ChatbotManager'; 
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { EmbedManager } from '../components/EmbedManager'; // New
import { AuthScreen } from '../components/AuthScreen';
import { Settings } from '../components/Settings';
import { AppView, KnowledgeItem, Lead, AuthSession, Workspace, Chatbot } from '../types';
import { storage } from '../services/storage';

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentView, setCurrentView] = useState<AppView>(AppView.Chat);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const activeSession = storage.getSession();
        if (activeSession) {
          setSession(activeSession);
          setWorkspace(activeSession.workspace);
          loadWorkspaceData(activeSession.workspace.id);
        }
        setIsLoading(false);
    }
  }, []);

  const loadWorkspaceData = (workspaceId: string) => {
    setKnowledgeBase(storage.getKnowledgeBase(workspaceId));
    setLeads(storage.getLeads(workspaceId));
    setChatbots(storage.getChatbots(workspaceId));
  };

  const handleLogin = (newSession: AuthSession) => {
    setSession(newSession);
    setWorkspace(newSession.workspace);
    loadWorkspaceData(newSession.workspace.id);
  };

  const handleLogout = () => {
    storage.logout();
    setSession(null);
    setWorkspace(null);
    setKnowledgeBase([]);
    setLeads([]);
    setChatbots([]);
  };

  const handleAddKnowledge = (item: Omit<KnowledgeItem, 'workspaceId'>) => {
    if (!workspace) return;
    const itemWithWorkspace = { ...item, workspaceId: workspace.id };
    storage.addKnowledgeItem(itemWithWorkspace);
    setKnowledgeBase(prev => [...prev, itemWithWorkspace]);
  };

  const handleRemoveKnowledge = (id: string) => {
    storage.removeKnowledgeItem(id);
    setKnowledgeBase(prev => prev.filter(item => item.id !== id));
  };

  const handleLeadCaptured = (leadData: Omit<Lead, "id" | "capturedAt" | "workspaceId" | "status" | "tags" | "customAttributes">) => {
    if (!workspace) return;
    const newLead: Lead = {
      id: crypto.randomUUID(),
      workspaceId: workspace.id,
      ...leadData,
      capturedAt: new Date(),
      status: 'New',
      tags: [],
      customAttributes: {}
    };
    storage.addLead(newLead);
    setLeads(prev => [newLead, ...prev]);
  };

  const handleSaveChatbot = (chatbot: Chatbot) => {
    if (!workspace) return;
    const botWithWorkspace = { ...chatbot, workspaceId: workspace.id };
    storage.saveChatbot(botWithWorkspace);
    setChatbots(prev => {
        const index = prev.findIndex(c => c.id === chatbot.id);
        if (index !== -1) {
            const newBots = [...prev];
            newBots[index] = botWithWorkspace;
            return newBots;
        }
        return [...prev, botWithWorkspace];
    });
  };

  const handleDeleteChatbot = (id: string) => {
    storage.deleteChatbot(id);
    setChatbots(prev => prev.filter(c => c.id !== id));
  };

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-blue-500 font-bold">UniBot Initializing...</div>;
  if (!session || !workspace) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView}
        leadCount={leads.length}
        knowledgeCount={knowledgeBase.length}
        user={session.user}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 h-full relative">
        {currentView === AppView.Chat && <ChatInterface chatbots={chatbots} knowledgeBase={knowledgeBase} onLeadCaptured={handleLeadCaptured}/>}
        {currentView === AppView.Chatbots && <ChatbotManager chatbots={chatbots} onSave={handleSaveChatbot} onDelete={handleDeleteChatbot}/>}
        {currentView === AppView.KnowledgeBase && <KnowledgeBase items={knowledgeBase} onAdd={handleAddKnowledge} onRemove={handleRemoveKnowledge}/>}
        {currentView === AppView.Leads && <LeadsDashboard leads={leads} onUpdate={()=>{}} onDelete={()=>{}}/>}
        {currentView === AppView.Analytics && <AnalyticsDashboard workspace={workspace}/>}
        {currentView === AppView.Embed && <EmbedManager chatbots={chatbots}/>}
        {currentView === AppView.Settings && <Settings workspace={workspace} onUpdateWorkspace={()=>{}}/>}
      </div>
    </div>
  );
}
