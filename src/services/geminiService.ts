import { GoogleGenAI, FunctionDeclaration, Type, Tool, GenerateContentResponse } from "@google/genai";
import { KnowledgeItem, Lead, Chatbot, CustomAction } from "../types";
import { RagService } from "./ragService";
import { SecurityService } from "./security";

// --- Tool Definitions ---

const addLeadFunctionDeclaration: FunctionDeclaration = {
  name: "addLead",
  description: "Save a new business lead or customer contact information when the user provides their name, email, phone, or specific inquiry details.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "The customer's name." },
      email: { type: Type.STRING, description: "The customer's email address." },
      phone: { type: Type.STRING, description: "The customer's phone number." },
      inquirySummary: { type: Type.STRING, description: "A brief summary of what the customer is asking about." },
    },
    required: ["name", "inquirySummary"],
  },
};

interface StreamYield {
    text: string;
    sources?: { title: string; url: string }[];
}

export class GeminiService {
  
  async getEmbedding(text: string): Promise<number[]> {
     const apiKey = process.env.API_KEY;
     if (!apiKey) throw new Error("API Key required for embeddings");
     
     // Rate Limit Check
     if (!SecurityService.checkRateLimit()) {
         throw new Error("Rate limit exceeded. Please wait a moment.");
     }

     const ai = new GoogleGenAI({ apiKey });
     const model = "text-embedding-004"; 
     const result = await ai.models.embedContent({ model, contents: text });
     return result.embeddings?.[0]?.values || [];
  }

  private buildSystemInstruction(chatbot: Chatbot, contextText: string): string {
    const baseInstruction = chatbot.systemInstruction || "You are a helpful AI assistant.";
    
    let toolsInstruction = "";
    if (chatbot.enabledTools?.includes("leadCapture")) {
        toolsInstruction += `
LEAD GENERATION DIRECTIVE:
1. If a user seems interested in services or needs follow-up, politely ask for their Name and Email.
2. Use the 'addLead' tool to save it immediately.
`;
    }

    return `
${baseInstruction}

${toolsInstruction}

RELEVANT KNOWLEDGE CONTEXT:
${contextText || "No specific context found. Rely on your general training and available tools."}
`;
  }

  private getTools(chatbot: Chatbot): Tool[] {
      const tools: Tool[] = [];
      const declarations: FunctionDeclaration[] = [];

      if (chatbot.enabledTools?.includes('googleSearch')) {
          tools.push({ googleSearch: {} });
      }

      if (chatbot.enabledTools?.includes('leadCapture')) {
          declarations.push(addLeadFunctionDeclaration);
      }

      if (chatbot.customActions && chatbot.customActions.length > 0) {
          chatbot.customActions.forEach(action => {
              try {
                  const params = JSON.parse(action.parameters);
                  declarations.push({
                      name: action.name,
                      description: action.description,
                      parameters: params
                  });
              } catch (e) {
                  console.error(`Invalid parameters JSON for action ${action.name}`);
              }
          });
      }

      if (declarations.length > 0) {
          tools.push({ functionDeclarations: declarations });
      }

      return tools;
  }

  private async executeWebhook(action: CustomAction, args: any): Promise<any> {
      try {
          const headers = action.headers ? JSON.parse(action.headers) : {};
          const options: RequestInit = {
              method: action.method,
              headers: {
                  'Content-Type': 'application/json',
                  ...headers
              }
          };

          let url = action.url;
          if (action.method === 'GET') {
              const queryParams = new URLSearchParams(args).toString();
              url += `?${queryParams}`;
          } else {
              options.body = JSON.stringify(args);
          }

          const response = await fetch(url, options);
          const data = await response.json();
          return data;
      } catch (error: any) {
          console.error("Webhook execution failed:", error);
          return { error: `Action failed: ${error.message}` };
      }
  }

  async *sendMessageStream(
    chatbot: Chatbot,
    history: { role: string; parts: { text: string }[] }[],
    newMessage: string,
    knowledgeBase: KnowledgeItem[],
    onLeadDetected: (lead: Omit<Lead, "id" | "capturedAt" | "workspaceId" | "status" | "tags" | "customAttributes">) => void
  ): AsyncGenerator<StreamYield, void, unknown> {
    
    // 1. Rate Limit Check
    if (!SecurityService.checkRateLimit()) {
         yield { text: "⚠️ System Alert: You are sending messages too quickly. Please wait a minute." };
         return;
    }

    const keyToUse = process.env.API_KEY;
    if (!keyToUse) {
      yield { text: "Configuration Error: No API Key found in environment variables." };
      return;
    }

    try {
      // 2. RAG
      let retrievedContext = "";
      try {
        const queryEmbedding = await this.getEmbedding(newMessage);
        const relevantChunks = await RagService.search(chatbot.workspaceId, queryEmbedding, 4);
        if (relevantChunks.length > 0) {
            retrievedContext = relevantChunks.map(c => c.text).join("\n\n");
        }
      } catch (err) {
        // Embed failed likely due to rate limit or key, just proceed without context
      }

      // 3. Setup
      const ai = new GoogleGenAI({ apiKey: keyToUse });
      const tools = this.getTools(chatbot);
      const systemInstruction = this.buildSystemInstruction(chatbot, retrievedContext);

      const chat = ai.chats.create({
        // Fix: Update to recommended 'gemini-3-flash-preview' for basic text tasks
        model: chatbot.model || 'gemini-3-flash-preview',
        config: {
          systemInstruction,
          tools,
          temperature: 0.7, 
        },
        history, 
      });

      const result = await chat.sendMessageStream({ message: newMessage });
      
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        
        const sources: { title: string; url: string }[] = [];
        if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            c.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                    sources.push({
                        title: chunk.web.title || chunk.web.uri,
                        url: chunk.web.uri
                    });
                }
            });
        }
        
        // Fix: Use direct functionCalls property access as per guidelines
        const functionCalls = c.functionCalls;

        if (functionCalls && functionCalls.length > 0) {
           const call = functionCalls[0];
           const args = call.args as any;
           let functionResult: any = { result: "Done" };

           if (call.name === "addLead") {
             onLeadDetected({
               name: args.name,
               email: args.email,
               phone: args.phone,
               inquirySummary: args.inquirySummary
             });
             functionResult = { result: "Lead saved successfully." };
             yield { text: "\n*(Lead captured)*\n" };
           } 
           else {
               const customAction = chatbot.customActions?.find(a => a.name === call.name);
               if (customAction) {
                   yield { text: `\n*(Running ${customAction.name}...)*\n` };
                   functionResult = await this.executeWebhook(customAction, args);
               } else {
                   functionResult = { error: "Function not found" };
               }
           }
             
           const functionResponsePart = {
                functionResponse: {
                    name: call.name,
                    response: functionResult,
                    id: call.id
                }
           };
             
           const toolResultStream = await chat.sendMessageStream({
                message: [functionResponsePart]
           });

           for await (const toolChunk of toolResultStream) {
               const tc = toolChunk as GenerateContentResponse;
               const followUpSources: { title: string; url: string }[] = [];
               if (tc.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    tc.candidates[0].groundingMetadata.groundingChunks.forEach((gChunk: any) => {
                        if (gChunk.web?.uri) {
                            followUpSources.push({
                                title: gChunk.web.title || gChunk.web.uri,
                                url: gChunk.web.uri
                            });
                        }
                    });
               }

               if (tc.text) {
                   yield { text: tc.text, sources: followUpSources.length ? followUpSources : undefined };
               }
           }
           return; 
        }

        if (c.text) {
          yield { text: c.text, sources: sources.length ? sources : undefined };
        }
      }

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error.message?.includes('403') || error.message?.includes('API key')) {
         yield { text: "Authentication Error: Please check your API Key." };
      } else {
         yield { text: "Error: Could not connect to the model." };
      }
    }
  }
}

export const geminiService = new GeminiService();