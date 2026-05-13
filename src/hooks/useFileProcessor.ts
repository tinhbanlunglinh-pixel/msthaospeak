import React, { useState, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import { ContentMode } from '../types';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface UseFileProcessorReturn {
  isProcessingFile: boolean;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  docFileInputRef: React.RefObject<HTMLInputElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  processFile: (file: File) => Promise<void>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useFileProcessor(
  setTopic: (topic: string) => void,
  setImagePreview: (preview: string | null) => void,
  setContentMode: (mode: ContentMode) => void,
  setError: (error: string | null) => void,
  contentMode: ContentMode
): UseFileProcessorReturn {
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Image processing
    if (fileType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        if (contentMode === 'generate') setContentMode('useInput');
      };
      reader.readAsDataURL(file);
      return;
    }

    // Document processing
    setIsProcessingFile(true);
    setError(null);

    try {
      let extractedText = "";

      if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          let lastY = -1;
          let pageText = "";
          
          for (const item of textContent.items as any[]) {
            const currentY = item.transform[5];
            if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
              pageText += "\n";
            } else if (lastY !== -1) {
              pageText += " ";
            }
            pageText += item.str;
            lastY = currentY;
          }
          
          fullText += pageText + "\n\n";
        }
        extractedText = fullText;
      } else if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (fileName.endsWith('.txt')) {
        extractedText = await file.text();
      } else {
        throw new Error("Định dạng file không hỗ trợ. Vui lòng tải lên PDF, DOCX, TXT hoặc Ảnh.");
      }

      if (extractedText.trim()) {
        setTopic(extractedText.trim());
        setContentMode('useInput');
      } else {
        throw new Error("Không thể trích xuất văn bản từ file này.");
      }
    } catch (err: any) {
      console.error("File processing error:", err);
      setError(err.message || "Lỗi khi xử lý file.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) processFile(file);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return {
    isProcessingFile,
    isDragging,
    fileInputRef,
    docFileInputRef,
    imageInputRef,
    processFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    handleImageUpload,
  };
}
