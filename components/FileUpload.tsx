import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { translations, UILanguage } from '../translations';

interface FileUploadProps {
  onDataLoaded: (data: string[]) => void;
  lang: UILanguage;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, lang }) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const t = translations[lang];

  const processFile = async (file: File) => {
    setError(null);
    try {
      let workbook: XLSX.WorkBook;
      const isCSV = file.name.toLowerCase().endsWith('.csv');

      if (isCSV) {
        // Special handling for CSVs to detect encoding (UTF-8 vs GBK)
        const buffer = await file.arrayBuffer();
        let text = '';
        
        try {
          // 1. Try UTF-8 with strict error handling
          const decoder = new TextDecoder('utf-8', { fatal: true });
          text = decoder.decode(buffer);
        } catch (e) {
          // 2. If UTF-8 fails, try GBK (common for Chinese CSVs)
          try {
            console.log("UTF-8 decoding failed, switching to GBK");
            const decoder = new TextDecoder('gbk');
            text = decoder.decode(buffer);
          } catch (gbkError) {
             // 3. Fallback to ISO-8859-1 if both fail
             const decoder = new TextDecoder('iso-8859-1');
             text = decoder.decode(buffer);
          }
        }
        
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        // Standard Excel handling (XLSX handles binary formats well natively)
        const data = await file.arrayBuffer();
        workbook = XLSX.read(data);
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Get data as array of arrays
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length === 0) {
        setError("File appears to be empty.");
        return;
      }

      // intelligent column detection
      const headers = jsonData[0] as string[];
      let termColIndex = 0; // Default to first column

      if (headers && Array.isArray(headers)) {
        const searchHeaders = ['word', 'term', 'vocabulary', 'vocab', 'phrase', '单词', '词汇'];
        const foundIndex = headers.findIndex(h => 
          h && typeof h === 'string' && searchHeaders.includes(h.toLowerCase().trim())
        );
        if (foundIndex !== -1) {
          termColIndex = foundIndex;
        }
      }

      // Extract terms, skipping header if we found a matching column or if the first row looks like a header
      const startIndex = 1; // Always skip header row for safety in this logic
      
      const terms: string[] = jsonData
        .slice(startIndex)
        .map(row => row[termColIndex])
        .filter(term => typeof term === 'string' && term.trim().length > 0);

      if (terms.length === 0) {
        // Fallback: maybe there was no header and the data starts at row 0?
        // Let's check row 0 column 0 if terms is empty
        const firstCell = jsonData[0][0];
        if (typeof firstCell === 'string' && firstCell.trim().length > 0) {
           // It's possible the file has no header. 
           // But for now, let's assume valid files have headers or at least data.
           // If we parsed 0 terms, try parsing from row 0 at column 0
           const fallbackTerms = jsonData
             .map(row => row[0])
             .filter(term => typeof term === 'string' && term.trim().length > 0);
             
           if (fallbackTerms.length > 0) {
              // Heuristic: Check if first item looks like "Word"
              if (['word', 'term', '单词'].includes(fallbackTerms[0].toLowerCase())) {
                 fallbackTerms.shift();
              }
              if (fallbackTerms.length > 0) {
                 onDataLoaded(fallbackTerms);
                 return;
              }
           }
        }
        
        setError("No valid vocabulary terms found. Please ensure the file has a column named 'Word', 'Term' or '单词'.");
        return;
      }

      onDataLoaded(terms);
    } catch (err) {
      console.error(err);
      setError("Failed to parse file. Please ensure it is a valid Excel or CSV file.");
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex-1 min-h-[250px] flex flex-col items-center justify-center
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }
        `}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleInputChange}
          accept=".csv, .xlsx, .xls"
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t.import_upload_title}</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t.import_drag_drop}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{t.import_supports}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2 animate-pulse border border-red-100 dark:border-red-900/30">
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};