
import { KnowledgeChunk, KnowledgeItem } from "../types";
import { storage } from "./storage";

/**
 * RAG Service (Client-Side)
 * Handles text chunking and vector search using cosine similarity.
 */
export class RagService {
  
  /**
   * Splits text into manageable chunks for embedding.
   * Target size: ~500-1000 characters with overlapping.
   */
  static chunkText(text: string, chunkSize: number = 800, overlap: number = 100): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = startIndex + chunkSize;
      
      // If we are not at the end, try to break at a newline or space
      if (endIndex < text.length) {
        const nextSpace = text.indexOf(' ', endIndex);
        const nextNewline = text.indexOf('\n', endIndex);
        
        // Prioritize splitting at newline if close, else space
        if (nextNewline !== -1 && nextNewline < endIndex + 100) {
            endIndex = nextNewline + 1;
        } else if (nextSpace !== -1 && nextSpace < endIndex + 100) {
            endIndex = nextSpace + 1;
        }
      }

      const chunk = text.slice(startIndex, endIndex).trim();
      if (chunk.length > 20) { // Ignore tiny chunks
        chunks.push(chunk);
      }

      startIndex = endIndex - overlap;
      // Prevent infinite loops if overlap >= chunkSize (invalid config)
      if (startIndex >= endIndex) startIndex = endIndex;
    }

    return chunks;
  }

  /**
   * Processes a Knowledge Item: Chunks it, Embeds it (via callback), and Saves it.
   */
  static async processAndStore(
    item: KnowledgeItem, 
    embedFn: (text: string) => Promise<number[]>
  ): Promise<void> {
    
    // 1. Chunking
    const textChunks = this.chunkText(item.content);
    console.log(`[RAG] Chunked "${item.name}" into ${textChunks.length} segments.`);

    // 2. Embedding Generation (Batching could be added here, but doing serial for simplicity/rate limits)
    const knowledgeChunks: KnowledgeChunk[] = [];
    
    for (const text of textChunks) {
        // Prepare context header
        const contextText = `Source: ${item.name} (${item.type})\nContent: ${text}`;
        try {
            const embedding = await embedFn(contextText);
            knowledgeChunks.push({
                id: crypto.randomUUID(),
                knowledgeItemId: item.id,
                workspaceId: item.workspaceId,
                text: contextText,
                embedding: embedding
            });
        } catch (e) {
            console.warn(`[RAG] Failed to embed chunk: ${text.substring(0, 30)}...`, e);
        }
    }

    // 3. Storage
    storage.saveChunks(knowledgeChunks);
    storage.updateKnowledgeStatus(item.id, 'ready');
  }

  /**
   * Search for relevant contexts using Cosine Similarity
   */
  static async search(
    workspaceId: string, 
    queryEmbedding: number[], 
    limit: number = 5
  ): Promise<KnowledgeChunk[]> {
    const allChunks = storage.getChunks(workspaceId);
    if (allChunks.length === 0) return [];

    // Calculate Cosine Similarity
    const scoredChunks = allChunks.map(chunk => {
        const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        return { ...chunk, score: similarity };
    });

    // Sort by score descending
    scoredChunks.sort((a, b) => b.score - a.score);

    // Filter for relevance threshold (e.g., > 0.5)
    // For demo purposes, we might keep it loose
    return scoredChunks.slice(0, limit);
  }

  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
