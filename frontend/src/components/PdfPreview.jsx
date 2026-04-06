import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, AlertCircle } from "lucide-react";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PdfPreview = ({ fileUrl, className }) => {
  const [numPages, setNumPages] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden h-full w-full ${className}`}>
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setIsLoaded(true);
        }}
        loading={
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-blue-500/50" />
            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Rendering...</span>
          </div>
        }
        error={
          <div className="flex flex-col items-center gap-2 text-red-500/50">
            <AlertCircle size={20} />
            <span className="text-[10px] uppercase font-bold tracking-widest">Preview Error</span>
          </div>
        }
      >
        <Page 
          pageNumber={1} 
          width={240}
          height={320}
          renderTextLayer={false} 
          renderAnnotationLayer={false}
          className="shadow-2xl transition-transform duration-500 group-hover:scale-110"
        />
      </Document>

      {/* Page count badge */}
      {isLoaded && (
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-mono text-white/50 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          {numPages} Pages
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
