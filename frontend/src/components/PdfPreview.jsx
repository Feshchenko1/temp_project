import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Music, AlertCircle, Loader2 } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfPreview = ({ fileUrl, className, onLoadSuccess }) => {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(false);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden h-full w-full bg-base-200/20 ${className}`}>
      {!error ? (
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            if (onLoadSuccess) onLoadSuccess(numPages);
          }}
          onLoadError={() => setError(true)}
          loading={
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <Loader2 className="animate-spin text-primary/40" size={24} />
              <span className="text-[10px] text-base-content/40 font-black uppercase tracking-widest">Loading...</span>
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
            className="shadow-2xl transition-all duration-700 group-hover:scale-105 border border-base-300 rounded-sm"
          />
        </Document>
      ) : (
        <div className="flex flex-col items-center gap-3 text-base-content/10 group-hover:text-primary/20 transition-colors">
          <Music size={64} strokeWidth={1} />
          <span className="text-[10px] uppercase font-black tracking-[0.2em]">Sheet Music Preview</span>
        </div>
      )}

      {/* Page count or fallback tag */}
      <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-base-100/60 backdrop-blur-md rounded border border-base-300 text-[9px] font-mono text-base-content/40 opacity-0 group-hover:opacity-100 transition-opacity">
        {numPages ? `${numPages} PGS` : "PDF"}
      </div>
    </div>
  );
};

export default PdfPreview;
