import React, { useState } from "react";
import { useScoreStore } from "../store/useScoreStore";
import { FilePlus, X, Upload, Loader2, FileText } from "lucide-react";
import Select from "react-select";
import axios from "axios";
import toast from "react-hot-toast";

const UploadScoreModal = ({ isOpen, onClose }) => {
  const { createScore, getPresignedUrl, availableTags, isUploading } = useScoreStore();
  
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      // Auto-fill title from filename if empty
      if (!title) {
        setTitle(selectedFile.name.replace(".pdf", ""));
      }
    } else {
      toast.error("Please select a valid PDF file");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title) return toast.error("Please provide title and PDF file");

    try {
      // 1. Get Presigned URL
      const uploadData = await getPresignedUrl(file.name, file.type);
      if (!uploadData) return;

      const { presignedUrl, fileUrl } = uploadData;

      // 2. Upload directly to S3/R2
      await axios.put(presignedUrl, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      // 3. Create metadata record in DB
      await createScore({
        title,
        artist,
        fileUrl,
        fileSize: file.size,
        tags: selectedTags.map(t => t.value)
      });

      onClose();
      // Reset state
      setFile(null);
      setTitle("");
      setArtist("");
      setSelectedTags([]);
      setProgress(0);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload score");
    }
  };

  const tagOptions = availableTags.map(tag => ({ value: tag, label: tag }));

  // Dynamic Studio Styles for react-select
  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      borderColor: "rgba(255, 255, 255, 0.1)",
      "&:hover": { borderColor: "rgba(255, 255, 255, 0.2)" },
      color: "white"
    }),
    multiselect: (base) => ({ ...base, color: "white" }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "rgba(255, 255, 255, 0.1)" : "transparent",
      color: "black",
      "&:active": { backgroundColor: "rgba(255, 255, 255, 0.2)" }
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: "6px"
    }),
    multiValueLabel: (base) => ({ ...base, color: "white" }),
    multiValueRemove: (base) => ({
      ...base,
      color: "white",
      "&:hover": { backgroundColor: "rgba(255, 0, 0, 0.2)", color: "white" }
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#1f2937",
      border: "1px solid rgba(255, 255, 255, 0.1)"
    }),
    input: (base) => ({ ...base, color: "white" }),
    singleValue: (base) => ({ ...base, color: "white" })
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <FilePlus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Upload Sheet Music</h2>
              <p className="text-sm text-gray-400">Add a new score to your collective library</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* File Upload Area */}
          <div className="relative">
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/50 cursor-pointer transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-gray-500 mb-3" />
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold text-blue-400 underline">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF only (max 50MB)</p>
                </div>
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <FileText size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="p-2 hover:bg-black/20 rounded-lg text-gray-400">
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-left">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-tight">Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Nocturne Op. 9 No. 2"
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-tight">Artist / Composer</label>
              <input 
                type="text" 
                value={artist} 
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Frédéric Chopin"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-tight">Tags (Instruments, Genre, Level)</label>
            <Select 
              isMulti 
              options={tagOptions} 
              styles={selectStyles}
              value={selectedTags}
              onChange={setSelectedTags}
              placeholder="Select tags..."
              className="mt-1"
            />
          </div>

          <div className="pt-4 border-t border-white/5">
            {isUploading && progress > 0 && progress < 100 && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Uploading PDF...</span>
                  <span className="text-blue-400 font-bold">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            <button 
              disabled={isUploading || !file || !title}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isUploading || !file || !title 
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload size={20} />
                  <span>Upload Score</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadScoreModal;
