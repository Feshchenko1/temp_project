import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Music, AlertCircle, Loader2 } from 'lucide-react';

// Import CSS for proper rendering
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Fix for Vite: Use a real URL for the worker source
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfPreview = ({ fileUrl, className }) => {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(false);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden h-full w-full bg-white/[0.02] ${className}`}>
      {!error ? (
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={() => setError(true)}
          loading={
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <Loader2 className="animate-spin text-blue-500/40" size={24} />
              <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Loading...</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center gap-2 text-red-500/40">
              <AlertCircle size={32} />
              <span className="text-[10px] uppercase font-black">Load Error</span>
            </div>
          }
        >
          <Page 
            pageNumber={1} 
            width={240}
            renderTextLayer={false} 
            renderAnnotationLayer={false}
            className="shadow-2xl transition-all duration-700 group-hover:scale-105"
          />
        </Document>
      ) : (
        <div className="flex flex-col items-center gap-3 text-gray-600/20 group-hover:text-blue-500/20 transition-colors">
          <Music size={64} strokeWidth={1} />
          <span className="text-[10px] uppercase font-black tracking-[0.2em]">Sheet Music Preview</span>
        </div>
      )}

      {/* Page count or fallback tag */}
      <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[9px] font-mono text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
        {numPages ? `${numPages} PAGES` : "PDF"}
      </div>
    </div>
  );
};

export default PdfPreview;
