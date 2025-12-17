
export enum MessageRole {
  User = 'user',
  Model = 'model',
  System = 'system'
}

export interface ChatMessage {
  id: string;
  sessionId?: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  isError?: boolean;
  sources?: { title: string; url: string }[];
  feedback?: 'up' | 'down';
}

export interface ChatSession {
  id: string;
  chatbotId: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    browser?: string;
    os?: string;
    region?: string;
    deviceType?: 'mobile' | 'desktop';
  };
}

export enum KnowledgeType {
  Text = 'TEXT',
  File = 'FILE',
  Website = 'WEBSITE',
  QnA = 'QNA'
}

export interface KnowledgeItem {
  id: string;
  workspaceId: string;
  type: KnowledgeType;
  name: string;
  content: string;
  dateAdded: Date;
  status?: 'processing' | 'ready' | 'error';
}

export interface KnowledgeChunk {
  id: string;
  knowledgeItemId: string;
  workspaceId: string;
  text: string;
  embedding: number[];
}

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Lost' | 'Customer';

export interface Lead {
  id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  inquirySummary: string;
  capturedAt: Date;
  status: LeadStatus;
  tags: string[];
  customAttributes: Record<string, string>;
  notes?: string;
}

export enum AppView {
  Chat = 'CHAT',
  Chatbots = 'CHATBOTS',
  KnowledgeBase = 'KNOWLEDGE_BASE',
  Leads = 'LEADS',
  Analytics = 'ANALYTICS',
  Settings = 'SETTINGS',
  Embed = 'EMBED'
}

export interface CustomAction {
  id: string;
  name: string;
  description: string;
  url: string;
  method: 'GET' | 'POST';
  headers?: string;
  parameters: string;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface AuditLog {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  action: string;
  targetResource: string;
  details: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  ip?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  workspaceId: string;
  role: UserRole;
  createdAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: Date;
}

export interface AuthSession {
  token: string;
  user: User;
  workspace: Workspace;
  expiresAt: Date;
}

// --- UPDATED: THEME ENGINE ---
export interface ChatbotTheme {
  primaryColor: string;
  userBubbleColor: string;
  botBubbleColor: string;
  welcomeMessage: string;
  displayName: string;
  roundedCorners: 'none' | 'sm' | 'md' | 'lg' | 'full';
  showSources: boolean;
}

export interface Chatbot {
  id: string;
  workspaceId: string;
  name: string;
  model: string; 
  systemInstruction: string;
  icon: string; 
  color: string; 
  createdAt: Date;
  enabledTools: string[];
  customActions: CustomAction[];
  theme?: ChatbotTheme; // New
}
