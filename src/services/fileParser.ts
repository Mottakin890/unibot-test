import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF Worker
// Note: We are using ES modules, so we point to the CDN for the worker
// In Next.js client components, this should still work.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
}

export class FileParser {
  
  static async parseFile(file: File): Promise<string> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return this.parsePdf(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      fileName.endsWith('.docx')
    ) {
      return this.parseDocx(file);
    } else if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
      return await file.text();
    } else {
      throw new Error('Unsupported file type. Please upload PDF, DOCX, TXT, MD, CSV, or JSON.');
    }
  }

  private static async parsePdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }

    return fullText;
  }

  private static async parseDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
  }
}