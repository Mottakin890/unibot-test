
import React, { useState, useRef } from 'react';
import { KnowledgeItem, KnowledgeType } from '../src/types';
import { FileParser } from '../services/fileParser';
import { RagService } from '../services/ragService';
import { geminiService } from '../services/geminiService';
import { storage } from '../services/storage';

interface KnowledgeBaseProps {
  items: KnowledgeItem[];
  onAdd: (item: Omit<KnowledgeItem, 'workspaceId'>) => void;
  onRemove: (id: string) => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ items, onAdd, onRemove }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'website' | 'qna'>('text');
  
  // Inputs
  const [textInput, setTextInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  
  // Config
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HELPER: Process Item for RAG ---
  const processNewItem = async (item: Omit<KnowledgeItem, 'workspaceId'>) => {
      // 1. Add to State/Storage UI
      onAdd(item);

      // 2. Background Processing (Embedding)
      try {
          const session = storage.getSession();
          if (!session) return;

          // Fetch the full item that was just saved (to get workspaceId correct)
          const tempItem = {
              ...item,
              workspaceId: session.workspace.id
          };

          setStatusMessage("Generating embeddings...");
          await RagService.processAndStore(tempItem, (text) => 
              geminiService.getEmbedding(text)
          );
          setStatusMessage("Processing complete!");

      } catch (e) {
          console.error("Embedding generation failed", e);
          setStatusMessage("Saved, but embedding failed.");
      } finally {
          setTimeout(() => setStatusMessage(""), 3000);
      }
  };


  const handleAddText = async () => {
    if (!textInput.trim() || !titleInput.trim()) return;
    setIsProcessing(true);

    const newItem: Omit<KnowledgeItem, 'workspaceId'> = {
      id: crypto.randomUUID(),
      type: KnowledgeType.Text,
      name: titleInput,
      content: textInput,
      dateAdded: new Date(),
      status: 'processing'
    };

    await processNewItem(newItem);
    
    setTextInput('');
    setTitleInput('');
    setIsProcessing(false);
  };

  const handleAddQnA = async () => {
    if (!questionInput.trim() || !answerInput.trim()) return;
    setIsProcessing(true);

    const content = `QUESTION: ${questionInput}\nANSWER: ${answerInput}`;
    const newItem: Omit<KnowledgeItem, 'workspaceId'> = {
      id: crypto.randomUUID(),
      type: KnowledgeType.QnA,
      name: `Q&A: ${questionInput.substring(0, 30)}...`,
      content: content,
      dateAdded: new Date(),
      status: 'processing'
    };

    await processNewItem(newItem);
    
    setQuestionInput('');
    setAnswerInput('');
    setIsProcessing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(`Reading ${file.type}...`);
    
    try {
      const text = await FileParser.parseFile(file);
      
      const newItem: Omit<KnowledgeItem, 'workspaceId'> = {
        id: crypto.randomUUID(),
        type: KnowledgeType.File,
        name: file.name,
        content: text,
        dateAdded: new Date(),
        status: 'processing'
      };
      
      await processNewItem(newItem);

    } catch (error: any) {
      console.error("Failed to read file", error);
      alert(`Error reading file: ${error.message}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const scrapeFallback = async (url: string): Promise<string> => {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Proxy failed");
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const text = doc.body.textContent || "";
      return text.replace(/\s+/g, ' ').trim();
  };
  
  const handleScrapeWebsite = async () => {
    if (!urlInput.trim()) return;
    setIsProcessing(true);
    setStatusMessage("Scanning...");
    
    try {
       const content = await scrapeFallback(urlInput);
       const urlObj = new URL(urlInput);
       
       const newItem: Omit<KnowledgeItem, 'workspaceId'> = {
        id: crypto.randomUUID(),
        type: KnowledgeType.Website,
        name: urlObj.hostname,
        content: content,
        dateAdded: new Date(),
        status: 'processing'
      };
      await processNewItem(newItem);
      setUrlInput('');

    } catch (e: any) {
        alert("Scraping failed: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  }


  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b px-8 py-6">
        <h2 className="text-2xl font-bold text-slate-800">Knowledge Base</h2>
        <p className="text-slate-500 mt-1">
          Train your AI. Upload documents, add Q&A pairs, or scrape websites. 
          Content is vectorized for semantic search.
        </p>
      </header>

      <main className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Input Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Add New Knowledge</h3>
              
              <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                {['text', 'file', 'website', 'qna'].map((tab) => (
                    <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-all capitalize ${
                        activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    >
                    {tab === 'qna' ? 'Q&A' : tab}
                    </button>
                ))}
              </div>

              {/* TEXT TAB */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Title / Topic</label>
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      placeholder="e.g., Return Policy"
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Content</label>
                    <textarea
                      rows={6}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste your content here..."
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <button
                    onClick={handleAddText}
                    disabled={!titleInput || !textInput || isProcessing}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Add Text Context'}
                  </button>
                </div>
              )}

              {/* Q&A TAB */}
              {activeTab === 'qna' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 mb-2">
                     Use this for specific questions users might ask.
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Question</label>
                    <input
                      type="text"
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      placeholder="e.g., What are your opening hours?"
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Answer</label>
                    <textarea
                      rows={4}
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      placeholder="e.g., We are open 9am to 5pm, Mon-Fri."
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <button
                    onClick={handleAddQnA}
                    disabled={!questionInput || !answerInput || isProcessing}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                     {isProcessing ? 'Processing...' : 'Add Q&A Pair'}
                  </button>
                </div>
              )}

              {/* FILE TAB */}
              {activeTab === 'file' && (
                <div className="space-y-4">
                   <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                     <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                     </svg>
                     <p className="mt-1 text-sm text-slate-600">
                       Upload PDF, DOCX, TXT
                     </p>
                     <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.md,.json,.csv,.pdf,.docx"
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      style={{ position: 'relative', zIndex: 10, height: 'auto', width: 'auto' }} 
                     />
                     <div className="mt-4 text-center">
                        <span className="text-sm text-blue-600 font-medium">Select File</span>
                     </div>
                   </div>
                </div>
              )}

              {/* WEBSITE TAB */}
              {activeTab === 'website' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Website URL</label>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <button
                    onClick={handleScrapeWebsite}
                    disabled={!urlInput || isProcessing}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Scanning...' : 'Scan Page'}
                  </button>
                </div>
              )}

              {isProcessing && <p className="text-xs text-center text-blue-600 font-medium animate-pulse mt-2">{statusMessage}</p>}
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Knowledge Base ({items.length})</h3>
            
            {items.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                 <p className="text-slate-500">No knowledge items yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex items-start justify-between group hover:border-blue-300 transition-colors animate-fade-in">
                    <div className="flex items-start gap-4 overflow-hidden">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                          item.type === KnowledgeType.QnA ? 'bg-green-100 text-green-600' : 
                          item.type === KnowledgeType.File ? 'bg-orange-100 text-orange-600' : 
                          'bg-blue-100 text-blue-600'
                        }`}>
                        {item.type === KnowledgeType.QnA && <span className="font-bold text-xs">Q&A</span>}
                        {item.type !== KnowledgeType.QnA && (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="text-base font-semibold text-slate-900 truncate">{item.name}</h4>
                            {item.status === 'processing' && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded">Processing</span>}
                            {item.status === 'ready' && <span className="text-[10px] bg-green-100 text-green-800 px-1 rounded">Ready</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.type} • {item.dateAdded.toLocaleDateString()}
                        </p>
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2 font-mono text-xs bg-slate-50 p-1 rounded">{item.content.substring(0, 150)}...</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="text-slate-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
