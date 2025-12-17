
"use client";

import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';

interface LeadsDashboardProps {
  leads: Lead[];
  onUpdate: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export const LeadsDashboard: React.FC<LeadsDashboardProps> = ({ leads, onUpdate, onDelete }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isEditing, setIsEditing] = useState(false);

  // Filter Logic
  const filteredLeads = leads.filter(lead => {
     const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
     const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
     return matchesSearch && matchesStatus;
  });

  // Edit State Helpers
  const handleSave = () => {
    if (selectedLead) {
       onUpdate(selectedLead);
       setIsEditing(false);
    }
  };

  const handleStatusChange = (status: LeadStatus) => {
     if (selectedLead) {
         setSelectedLead({ ...selectedLead, status });
     }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && selectedLead) {
          const val = e.currentTarget.value.trim();
          if (val && !selectedLead.tags.includes(val)) {
              setSelectedLead({ ...selectedLead, tags: [...selectedLead.tags, val] });
              e.currentTarget.value = '';
          }
      }
  };

  const removeTag = (tag: string) => {
      if (selectedLead) {
          setSelectedLead({ ...selectedLead, tags: selectedLead.tags.filter(t => t !== tag) });
      }
  };

  const handleAttributeChange = (key: string, value: string) => {
      if (selectedLead) {
          setSelectedLead({
              ...selectedLead,
              customAttributes: { ...selectedLead.customAttributes, [key]: value }
          });
      }
  };
  
  const addAttribute = () => {
      if(selectedLead) {
          const key = prompt("Enter attribute name (e.g., Company Size):");
          if(key) {
              handleAttributeChange(key, "");
          }
      }
  }


  return (
    <div className="flex h-full bg-slate-50 relative">
      
      {/* LEFT: List View */}
      <div className={`flex-1 flex flex-col h-full ${selectedLead ? 'hidden md:flex md:w-1/2 lg:w-2/5 border-r border-slate-200' : 'w-full'}`}>
          <header className="bg-white border-b px-6 py-4">
            <h2 className="text-xl font-bold text-slate-800">Contacts & Leads</h2>
            
            <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                    <input 
                      type="text" 
                      placeholder="Search contacts..." 
                      className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <select 
                    className="bg-slate-100 border-none rounded-lg text-sm px-3 py-2 text-slate-600 focus:ring-2 focus:ring-blue-500"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="All">All Status</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Lost">Lost</option>
                    <option value="Customer">Customer</option>
                </select>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
             {filteredLeads.length === 0 ? (
                 <div className="p-8 text-center text-slate-500 text-sm">No contacts found matching your filters.</div>
             ) : (
                 <div className="divide-y divide-slate-100 bg-white">
                     {filteredLeads.map(lead => (
                         <div 
                           key={lead.id} 
                           onClick={() => { setSelectedLead(lead); setIsEditing(false); }}
                           className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${selectedLead?.id === lead.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                         >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-sm font-semibold text-slate-900">{lead.name}</h3>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                    lead.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                    lead.status === 'Qualified' ? 'bg-green-100 text-green-700' :
                                    lead.status === 'Lost' ? 'bg-slate-100 text-slate-600' :
                                    'bg-purple-100 text-purple-700'
                                }`}>
                                    {lead.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate mb-1">{lead.email || 'No email'}</p>
                            <p className="text-xs text-slate-400 truncate">{lead.inquirySummary}</p>
                         </div>
                     ))}
                 </div>
             )}
          </div>
      </div>

      {/* RIGHT: Detail View */}
      {selectedLead ? (
          <div className="flex-1 bg-white h-full flex flex-col md:w-1/2 lg:w-3/5 absolute md:relative inset-0 z-20 overflow-hidden animate-slide-in-right">
              {/* Toolbar */}
              <div className="border-b px-6 py-4 flex justify-between items-center bg-white sticky top-0">
                 <div className="flex items-center gap-3">
                     <button onClick={() => setSelectedLead(null)} className="md:hidden text-slate-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                     </button>
                     <h2 className="text-lg font-bold text-slate-800">Contact Details</h2>
                 </div>
                 <div className="flex items-center gap-2">
                     {!isEditing ? (
                         <>
                            <button onClick={() => setIsEditing(true)} className="text-slate-600 hover:text-blue-600 px-3 py-1.5 text-sm font-medium border rounded-lg">Edit</button>
                            <button 
                                onClick={() => {
                                    if(confirm('Delete this contact?')) {
                                        onDelete(selectedLead.id);
                                        setSelectedLead(null);
                                    }
                                }} 
                                className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                         </>
                     ) : (
                         <>
                            <button onClick={() => setIsEditing(false)} className="text-slate-500 px-3 py-1.5 text-sm">Cancel</button>
                            <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm">Save Changes</button>
                         </>
                     )}
                 </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-2xl mx-auto space-y-8">
                      
                      {/* Header Info */}
                      <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-sm">
                              {selectedLead.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                              {isEditing ? (
                                  <input 
                                    className="text-2xl font-bold text-slate-900 border-b border-slate-300 w-full focus:outline-none focus:border-blue-500 pb-1 mb-2"
                                    value={selectedLead.name}
                                    onChange={(e) => setSelectedLead({...selectedLead, name: e.target.value})}
                                  />
                              ) : (
                                  <h1 className="text-2xl font-bold text-slate-900">{selectedLead.name}</h1>
                              )}
                              
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                  <span>Captured: {selectedLead.capturedAt.toLocaleDateString()}</span>
                                  {isEditing ? (
                                      <select 
                                        value={selectedLead.status} 
                                        onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                                      >
                                          <option value="New">New</option>
                                          <option value="Contacted">Contacted</option>
                                          <option value="Qualified">Qualified</option>
                                          <option value="Lost">Lost</option>
                                          <option value="Customer">Customer</option>
                                      </select>
                                  ) : (
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          selectedLead.status === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                      }`}>{selectedLead.status}</span>
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* Contact Info */}
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Contact Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                                  {isEditing ? (
                                      <input 
                                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm"
                                        value={selectedLead.email || ''}
                                        onChange={(e) => setSelectedLead({...selectedLead, email: e.target.value})}
                                      />
                                  ) : (
                                      <div className="text-sm font-medium text-slate-800">{selectedLead.email || '—'}</div>
                                  )}
                              </div>
                              <div>
                                  <label className="block text-xs text-slate-500 mb-1">Phone</label>
                                  {isEditing ? (
                                      <input 
                                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm"
                                        value={selectedLead.phone || ''}
                                        onChange={(e) => setSelectedLead({...selectedLead, phone: e.target.value})}
                                      />
                                  ) : (
                                      <div className="text-sm font-medium text-slate-800">{selectedLead.phone || '—'}</div>
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* Inquiry & Notes */}
                      <div>
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Inquiry & Notes</h3>
                          <div className="bg-white border rounded-xl p-4 shadow-sm">
                             {isEditing ? (
                                 <div className="space-y-4">
                                     <div>
                                         <label className="text-xs text-slate-500 block mb-1">Initial Inquiry</label>
                                         <textarea 
                                            className="w-full border border-slate-300 rounded p-2 text-sm"
                                            rows={2}
                                            value={selectedLead.inquirySummary}
                                            onChange={(e) => setSelectedLead({...selectedLead, inquirySummary: e.target.value})}
                                         />
                                     </div>
                                     <div>
                                         <label className="text-xs text-slate-500 block mb-1">Internal Notes</label>
                                         <textarea 
                                            className="w-full border border-slate-300 rounded p-2 text-sm"
                                            rows={4}
                                            placeholder="Add private notes about this customer..."
                                            value={selectedLead.notes || ''}
                                            onChange={(e) => setSelectedLead({...selectedLead, notes: e.target.value})}
                                         />
                                     </div>
                                 </div>
                             ) : (
                                 <div className="space-y-4">
                                     <div>
                                         <span className="text-xs text-slate-400 block mb-1">Initial Inquiry</span>
                                         <p className="text-sm text-slate-700 leading-relaxed">{selectedLead.inquirySummary}</p>
                                     </div>
                                     {selectedLead.notes && (
                                         <div className="pt-4 border-t border-slate-100">
                                            <span className="text-xs text-slate-400 block mb-1">Notes</span>
                                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedLead.notes}</p>
                                         </div>
                                     )}
                                 </div>
                             )}
                          </div>
                      </div>

                      {/* Tags */}
                      <div>
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Tags</h3>
                          <div className="flex flex-wrap gap-2 items-center">
                              {selectedLead.tags.map(tag => (
                                  <span key={tag} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                      {tag}
                                      {isEditing && (
                                          <button onClick={() => removeTag(tag)} className="hover:text-indigo-900">&times;</button>
                                      )}
                                  </span>
                              ))}
                              {isEditing && (
                                  <input 
                                    placeholder="+ Add Tag" 
                                    className="bg-transparent border-b border-slate-300 focus:border-blue-500 focus:outline-none text-xs px-2 py-1 w-24"
                                    onKeyDown={handleAddTag}
                                  />
                              )}
                          </div>
                      </div>

                      {/* Custom Attributes */}
                      <div>
                          <div className="flex items-center justify-between mb-2">
                             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Additional Info</h3>
                             {isEditing && <button onClick={addAttribute} className="text-xs text-blue-600 hover:underline">+ Add Field</button>}
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100">
                              {Object.entries(selectedLead.customAttributes).length === 0 && (
                                  <div className="p-4 text-xs text-slate-400 text-center">No custom attributes added.</div>
                              )}
                              {Object.entries(selectedLead.customAttributes).map(([key, value]) => (
                                  <div key={key} className="flex p-3 items-center">
                                      <div className="w-1/3 text-xs font-medium text-slate-500">{key}</div>
                                      <div className="flex-1">
                                          {isEditing ? (
                                              <input 
                                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                                                value={value}
                                                onChange={(e) => handleAttributeChange(key, e.target.value)}
                                              />
                                          ) : (
                                              <div className="text-sm text-slate-800">{value || '—'}</div>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                  </div>
              </div>

          </div>
      ) : (
         <div className="hidden md:flex flex-1 items-center justify-center bg-white text-slate-400 flex-col p-12 text-center">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             </div>
             <h3 className="text-lg font-medium text-slate-900">Select a Contact</h3>
             <p className="mt-2 max-w-sm">
                 Click on any contact on the left to view details, update status, or add notes.
             </p>
         </div>
      )}

    </div>
  );
};
