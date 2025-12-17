import { KnowledgeItem, Lead, User, Workspace, AuthSession, Chatbot, KnowledgeChunk, ChatSession, ChatMessage, MessageRole, AuditLog } from '../types';
import { Logger } from './logger';

const DB_KEYS = {
  USERS: 'unibot_db_users',
  WORKSPACES: 'unibot_db_workspaces',
  KNOWLEDGE: 'unibot_db_knowledge',
  CHUNKS: 'unibot_db_chunks',
  LEADS: 'unibot_db_leads',
  CHATBOTS: 'unibot_db_chatbots',
  SESSIONS: 'unibot_db_sessions',
  MESSAGES: 'unibot_db_messages',
  SESSION: 'unibot_session_v1',
  AUDIT: 'unibot_db_audit_logs'
};

const DEFAULT_SYSTEM_INSTRUCTION = `You are UniBot, a highly empathetic, warm, and professional customer support agent. 
You are NOT a robot. You are a helpful human assistant.`;

export class StorageService {
  
  // --- AUTHENTICATION & USER MANAGEMENT ---

  getSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    const sessionStr = localStorage.getItem(DB_KEYS.SESSION);
    if (!sessionStr) return null;
    try {
      const session = JSON.parse(sessionStr);
      session.expiresAt = new Date(session.expiresAt);
      session.user.createdAt = new Date(session.user.createdAt);
      session.workspace.createdAt = new Date(session.workspace.createdAt);
      
      // Role Migration (ensure role exists)
      if (!session.user.role) session.user.role = 'admin';

      if (new Date() > session.expiresAt) {
        this.logout();
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  login(email: string): AuthSession {
    const users = this.getTable<User>(DB_KEYS.USERS);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) throw new Error("User not found");
    
    // Ensure role (Migration)
    if (!user.role) {
        user.role = 'admin';
        this.updateRow(DB_KEYS.USERS, user);
    }

    const workspaces = this.getTable<Workspace>(DB_KEYS.WORKSPACES);
    const workspace = workspaces.find(w => w.id === user.workspaceId);
    if (!workspace) throw new Error("Workspace data integrity error");

    this.ensureDefaultChatbot(workspace.id);

    const session: AuthSession = {
      token: `mock_jwt_${crypto.randomUUID()}`,
      user,
      workspace,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
    
    // Log Login
    Logger.log(user, 'LOGIN', 'System', 'User logged in successfully');
    
    return session;
  }

  register(fullName: string, email: string, workspaceName: string): AuthSession {
    const users = this.getTable<User>(DB_KEYS.USERS);
    if (users.find(u => u.email === email)) {
      throw new Error("User already exists");
    }

    const workspaceId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    const newWorkspace: Workspace = {
      id: workspaceId,
      name: workspaceName,
      createdAt: new Date()
    };

    const newUser: User = {
      id: userId,
      email,
      fullName,
      workspaceId,
      role: 'admin', // Creator is Admin
      createdAt: new Date()
    };

    this.saveRow(DB_KEYS.WORKSPACES, newWorkspace);
    this.saveRow(DB_KEYS.USERS, newUser);
    this.ensureDefaultChatbot(workspaceId);

    // Log Registration
    Logger.log(newUser, 'REGISTER', 'System', `Created workspace: ${workspaceName}`);

    return this.login(email);
  }

  logout() {
    const session = this.getSession();
    if (session) {
        Logger.log(session.user, 'LOGOUT', 'System', 'User logged out');
    }
    localStorage.removeItem(DB_KEYS.SESSION);
  }

  // --- COMPLIANCE & DATA EXPORT ---

  exportWorkspaceData(workspaceId: string): string {
      const data = {
          workspace: this.getTable<Workspace>(DB_KEYS.WORKSPACES).find(w => w.id === workspaceId),
          chatbots: this.getChatbots(workspaceId),
          knowledgeBase: this.getKnowledgeBase(workspaceId),
          leads: this.getLeads(workspaceId),
          auditLogs: this.getAuditLogs(workspaceId),
          sessions: this.getTable<ChatSession>(DB_KEYS.SESSIONS).filter(s => s.workspaceId === workspaceId),
          messages: this.getTable<ChatMessage>(DB_KEYS.MESSAGES).filter(m => {
              const sessionIds = this.getTable<ChatSession>(DB_KEYS.SESSIONS)
                  .filter(s => s.workspaceId === workspaceId)
                  .map(s => s.id);
              return sessionIds.includes(m.sessionId || '');
          })
      };
      return JSON.stringify(data, null, 2);
  }

  deleteWorkspaceData(workspaceId: string) {
      // In a real DB this would be a cascade delete.
      // For LocalStorage, we filter and save.
      
      const filterOut = <T extends { workspaceId?: string }>(key: string) => {
          const items = this.getTable<T>(key);
          const filtered = items.filter(i => i.workspaceId !== workspaceId);
          localStorage.setItem(key, JSON.stringify(filtered));
      };

      filterOut(DB_KEYS.CHATBOTS);
      filterOut(DB_KEYS.LEADS);
      filterOut(DB_KEYS.KNOWLEDGE);
      
      // Chunks
      const chunks = this.getTable<KnowledgeChunk>(DB_KEYS.CHUNKS);
      const keptChunks = chunks.filter(c => c.workspaceId !== workspaceId);
      localStorage.setItem(DB_KEYS.CHUNKS, JSON.stringify(keptChunks));

      // Sessions & Messages require a bit more logic to link back, 
      // but simplistic filtering by workspaceId works if present on the object.
      // ChatSession has workspaceId.
      filterOut(DB_KEYS.SESSIONS);
      
      // Users
      filterOut(DB_KEYS.USERS);
      
      // Workspaces (id match)
      const workspaces = this.getTable<Workspace>(DB_KEYS.WORKSPACES);
      const keptWorkspaces = workspaces.filter(w => w.id !== workspaceId);
      localStorage.setItem(DB_KEYS.WORKSPACES, JSON.stringify(keptWorkspaces));

      this.logout();
  }

  // --- WORKSPACE & SETTINGS ---

  updateWorkspace(workspace: Workspace, actor?: User) {
    const workspaces = this.getTable<Workspace>(DB_KEYS.WORKSPACES);
    const index = workspaces.findIndex(w => w.id === workspace.id);
    
    if (index !== -1) {
      workspaces[index] = workspace;
      localStorage.setItem(DB_KEYS.WORKSPACES, JSON.stringify(workspaces));
      
      // Update active session if needed
      const session = this.getSession();
      if (session && session.workspace.id === workspace.id) {
          session.workspace = workspace; 
          localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
      }

      if (actor) Logger.log(actor, 'UPDATE_WORKSPACE', 'Settings', 'Updated workspace details', 'info');
    }
  }

  // --- LOGS ---
  getAuditLogs(workspaceId: string): AuditLog[] {
      return Logger.getWorkspaceLogs(workspaceId);
  }

  // --- CHATBOTS ---

  getChatbots(workspaceId: string): Chatbot[] {
    const items = this.getTable<Chatbot>(DB_KEYS.CHATBOTS);
    return items
      .filter(i => i.workspaceId === workspaceId)
      .map(i => ({ 
          ...i, 
          createdAt: new Date(i.createdAt),
          enabledTools: i.enabledTools || ['leadCapture'], 
          customActions: i.customActions || []
      }));
  }

  saveChatbot(chatbot: Chatbot, actor?: User) {
    const items = this.getTable<Chatbot>(DB_KEYS.CHATBOTS);
    const index = items.findIndex(c => c.id === chatbot.id);
    if (index !== -1) {
      items[index] = chatbot;
      if (actor) Logger.log(actor, 'UPDATE_CHATBOT', `Chatbot: ${chatbot.name}`, 'Updated configuration');
    } else {
      items.push(chatbot);
      if (actor) Logger.log(actor, 'CREATE_CHATBOT', `Chatbot: ${chatbot.name}`, 'Created new chatbot');
    }
    localStorage.setItem(DB_KEYS.CHATBOTS, JSON.stringify(items));
  }

  deleteChatbot(id: string, actor?: User) {
    let items = this.getTable<Chatbot>(DB_KEYS.CHATBOTS);
    const bot = items.find(b => b.id === id);
    items = items.filter(c => c.id !== id);
    localStorage.setItem(DB_KEYS.CHATBOTS, JSON.stringify(items));
    
    if (actor && bot) Logger.log(actor, 'DELETE_CHATBOT', `Chatbot: ${bot.name}`, 'Deleted chatbot', 'critical');
  }

  private ensureDefaultChatbot(workspaceId: string) {
    const bots = this.getChatbots(workspaceId);
    if (bots.length === 0) {
      const defaultBot: Chatbot = {
        id: crypto.randomUUID(),
        workspaceId,
        name: 'UniBot Support',
        // Fix: Update default model to 'gemini-3-flash-preview' for basic text tasks
        model: 'gemini-3-flash-preview',
        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
        icon: '🤖',
        color: 'blue',
        createdAt: new Date(),
        enabledTools: ['leadCapture'],
        customActions: []
      };
      this.saveRow(DB_KEYS.CHATBOTS, defaultBot);
    }
  }

  // --- CHAT SESSIONS & MESSAGES ---

  getActiveSession(chatbotId: string): ChatSession | null {
    const sessions = this.getTable<ChatSession>(DB_KEYS.SESSIONS);
    const botSessions = sessions
        .filter(s => s.chatbotId === chatbotId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    if (botSessions.length > 0) {
        const s = botSessions[0];
        return {
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt)
        };
    }
    return null;
  }

  createSession(chatbotId: string, workspaceId: string, metadata?: ChatSession['metadata']): ChatSession {
    const newSession: ChatSession = {
        id: crypto.randomUUID(),
        chatbotId,
        workspaceId,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata
    };
    this.saveRow(DB_KEYS.SESSIONS, newSession);
    return newSession;
  }

  getMessages(sessionId: string): ChatMessage[] {
    const messages = this.getTable<ChatMessage>(DB_KEYS.MESSAGES);
    return messages
        .filter(m => m.sessionId === sessionId)
        .map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  saveMessage(sessionId: string, message: ChatMessage) {
    const messages = this.getTable<ChatMessage>(DB_KEYS.MESSAGES);
    const existingIndex = messages.findIndex(m => m.id === message.id);
    const msgWithSession = { ...message, sessionId };

    if (existingIndex !== -1) {
        messages[existingIndex] = msgWithSession;
    } else {
        messages.push(msgWithSession);
    }
    localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify(messages));

    // Update Session
    const sessions = this.getTable<ChatSession>(DB_KEYS.SESSIONS);
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
        sessions[idx].updatedAt = new Date();
        localStorage.setItem(DB_KEYS.SESSIONS, JSON.stringify(sessions));
    }
  }

  clearSessionMessages(sessionId: string) {
      let messages = this.getTable<ChatMessage>(DB_KEYS.MESSAGES);
      messages = messages.filter(m => m.sessionId !== sessionId);
      localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify(messages));
      
      const sessions = this.getTable<ChatSession>(DB_KEYS.SESSIONS);
      const idx = sessions.findIndex(s => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx].updatedAt = new Date();
        localStorage.setItem(DB_KEYS.SESSIONS, JSON.stringify(sessions));
      }
  }
  
  // --- ANALYTICS ---
  
  getAnalyticsData(workspaceId: string) {
      const allSessions = this.getTable<ChatSession>(DB_KEYS.SESSIONS).filter(s => s.workspaceId === workspaceId);
      const allMessages = this.getTable<ChatMessage>(DB_KEYS.MESSAGES).filter(m => 
          allSessions.some(s => s.id === m.sessionId)
      );
      const allLeads = this.getLeads(workspaceId);

      const totalSessions = allSessions.length;
      const totalMessages = allMessages.length;
      const totalLeads = allLeads.length;

      const ratedMessages = allMessages.filter(m => m.feedback);
      const positiveRatings = ratedMessages.filter(m => m.feedback === 'up').length;
      const satisfactionRate = ratedMessages.length > 0 
          ? Math.round((positiveRatings / ratedMessages.length) * 100) 
          : 0;

      const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toLocaleDateString();
      }).reverse();

      const sessionsByDate = last7Days.map(dateStr => {
          const count = allSessions.filter(s => new Date(s.createdAt).toLocaleDateString() === dateStr).length;
          return { date: dateStr, count };
      });

      const recentSessions = allSessions
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10)
        .map(s => {
            const sessionMsgs = allMessages.filter(m => m.sessionId === s.id);
            const userMsgs = sessionMsgs.filter(m => m.role === MessageRole.User);
            const lastMsg = sessionMsgs[sessionMsgs.length - 1];
            return {
                id: s.id,
                date: new Date(s.createdAt),
                msgCount: sessionMsgs.length,
                preview: lastMsg ? lastMsg.text.substring(0, 50) + '...' : 'No messages',
                location: s.metadata?.region || 'Unknown',
                device: s.metadata?.deviceType || 'Desktop'
            };
        });
        
      const locationCounts: Record<string, number> = {};
      allSessions.forEach(s => {
         const loc = s.metadata?.region || 'Unknown';
         locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      });
      const topLocations = Object.entries(locationCounts)
         .sort((a, b) => b[1] - a[1])
         .slice(0, 5)
         .map(([region, count]) => ({ region, count }));

      return {
          totalSessions,
          totalMessages,
          totalLeads,
          satisfactionRate,
          sessionsByDate,
          recentSessions,
          topLocations
      };
  }

  // --- KNOWLEDGE BASE ---

  getKnowledgeBase(workspaceId: string): KnowledgeItem[] {
    const items = this.getTable<KnowledgeItem>(DB_KEYS.KNOWLEDGE);
    return items
      .filter(i => i.workspaceId === workspaceId)
      .map(i => ({ ...i, dateAdded: new Date(i.dateAdded) }));
  }

  addKnowledgeItem(item: KnowledgeItem, actor?: User) {
    this.saveRow(DB_KEYS.KNOWLEDGE, item);
    if (actor) Logger.log(actor, 'ADD_KNOWLEDGE', `Item: ${item.name}`, `Type: ${item.type}`);
  }

  removeKnowledgeItem(id: string, actor?: User) {
    let items = this.getTable<KnowledgeItem>(DB_KEYS.KNOWLEDGE);
    const item = items.find(i => i.id === id);
    items = items.filter(i => i.id !== id);
    localStorage.setItem(DB_KEYS.KNOWLEDGE, JSON.stringify(items));

    let chunks = this.getTable<KnowledgeChunk>(DB_KEYS.CHUNKS);
    chunks = chunks.filter(c => c.knowledgeItemId !== id);
    localStorage.setItem(DB_KEYS.CHUNKS, JSON.stringify(chunks));
    
    if (actor && item) Logger.log(actor, 'DELETE_KNOWLEDGE', `Item: ${item.name}`, 'Deleted item');
  }
  
  updateKnowledgeStatus(id: string, status: 'processing' | 'ready' | 'error') {
     const items = this.getTable<KnowledgeItem>(DB_KEYS.KNOWLEDGE);
     const index = items.findIndex(i => i.id === id);
     if (index !== -1) {
         items[index].status = status;
         localStorage.setItem(DB_KEYS.KNOWLEDGE, JSON.stringify(items));
     }
  }

  // --- VECTOR STORE (CHUNKS) ---

  saveChunks(newChunks: KnowledgeChunk[]) {
      const chunks = this.getTable<KnowledgeChunk>(DB_KEYS.CHUNKS);
      const updatedChunks = [...chunks, ...newChunks];
      localStorage.setItem(DB_KEYS.CHUNKS, JSON.stringify(updatedChunks));
  }

  getChunks(workspaceId: string): KnowledgeChunk[] {
      const chunks = this.getTable<KnowledgeChunk>(DB_KEYS.CHUNKS);
      return chunks.filter(c => c.workspaceId === workspaceId);
  }

  // --- LEADS & CONTACTS ---

  getLeads(workspaceId: string): Lead[] {
    const items = this.getTable<Lead>(DB_KEYS.LEADS);
    return items
      .filter(i => i.workspaceId === workspaceId)
      .map(i => ({ 
        ...i, 
        capturedAt: new Date(i.capturedAt),
        status: i.status || 'New',
        tags: i.tags || [],
        customAttributes: i.customAttributes || {},
        notes: i.notes || ''
      }))
      .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
  }

  addLead(lead: Lead) {
    this.saveRow(DB_KEYS.LEADS, lead);
    // System action, no actor needed usually, or 'System'
    Logger.log(null, 'CAPTURE_LEAD', `Lead: ${lead.name}`, 'Lead captured via Chat');
  }

  updateLead(updatedLead: Lead, actor?: User) {
    const items = this.getTable<Lead>(DB_KEYS.LEADS);
    const index = items.findIndex(l => l.id === updatedLead.id);
    if (index !== -1) {
      items[index] = updatedLead;
      localStorage.setItem(DB_KEYS.LEADS, JSON.stringify(items));
      if (actor) Logger.log(actor, 'UPDATE_LEAD', `Lead: ${updatedLead.name}`, 'Updated lead details');
    }
  }

  deleteLead(id: string, actor?: User) {
    let items = this.getTable<Lead>(DB_KEYS.LEADS);
    const lead = items.find(l => l.id === id);
    items = items.filter(l => l.id !== id);
    localStorage.setItem(DB_KEYS.LEADS, JSON.stringify(items));
    if (actor && lead) Logger.log(actor, 'DELETE_LEAD', `Lead: ${lead.name}`, 'Deleted lead', 'warning');
  }

  // --- INTERNAL HELPERS ---

  private getTable<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveRow<T>(key: string, item: T) {
    if (typeof window === 'undefined') return;
    const items = this.getTable<T>(key);
    items.push(item);
    localStorage.setItem(key, JSON.stringify(items));
  }

  private updateRow<T extends { id: string }>(key: string, item: T) {
      if (typeof window === 'undefined') return;
      const items = this.getTable<T>(key);
      const index = items.findIndex(i => i.id === item.id);
      if (index !== -1) {
          items[index] = item;
          localStorage.setItem(key, JSON.stringify(items));
      }
  }
}

export const storage = new StorageService();