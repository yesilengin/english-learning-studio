import ePub from 'epubjs';
import * as pdfjsLib from 'pdfjs-dist';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Parse .txt file
 */
export async function parseTxt(file) {
  try {
    const text = await file.text();
    return {
      title: file.name.replace(/\.[^/.]+$/, ""),
      content: text,
      success: true
    };
  } catch (error) {
    console.error('Error parsing TXT:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse .epub file
 */
export async function parseEpub(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    
    await book.ready;
    
    // Get metadata
    const metadata = await book.loaded.metadata;
    const title = metadata.title || file.name.replace(/\.[^/.]+$/, "");
    
    // Get all text content
    let fullText = '';
    const spine = await book.loaded.spine;
    
    for (const item of spine.items) {
      try {
        await book.spine.get(item.href).load(book.load.bind(book));
        const doc = await book.spine.get(item.href).load(book.load.bind(book));
        const text = doc.innerText || doc.textContent || '';
        fullText += text + '\n\n';
      } catch (err) {
        console.warn('Error loading chapter:', err);
      }
    }
    
    return {
      title,
      content: fullText.trim(),
      success: true
    };
  } catch (error) {
    console.error('Error parsing EPUB:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse .pdf file
 */
export async function parsePdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    
    const title = file.name.replace(/\.[^/.]+$/, "");
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return {
      title,
      content: fullText.trim(),
      success: true
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Auto-detect file type and parse
 */
export async function parseFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'txt':
      return await parseTxt(file);
    case 'epub':
      return await parseEpub(file);
    case 'pdf':
      return await parsePdf(file);
    default:
      return {
        success: false,
        error: 'Desteklenmeyen dosya formatı. Lütfen .txt, .epub veya .pdf dosyası yükleyin.'
      };
  }
}
