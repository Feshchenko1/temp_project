import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useScoreStore } from "../store/useScoreStore";
import { FilePlus, X, Upload, Loader2, FileText, Pencil } from "lucide-react";
import Select from "react-select";
import axios from "axios";
import toast from "react-hot-toast";

const ScoreFormModal = ({ isOpen, onClose, scoreToEdit = null }) => {
  const { createScore, updateScore, getPresignedUrl, availableTags, isUploading } = useScoreStore();

  const mode = scoreToEdit ? "edit" : "create";

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (scoreToEdit && isOpen) {
      setTitle(scoreToEdit.title || "");
      setArtist(scoreToEdit.artist || "");
      setSelectedTags(
        scoreToEdit.tags?.map(tag => ({ value: tag, label: tag })) || []
      );
    } else if (!scoreToEdit && isOpen) {
      setTitle("");
      setArtist("");
      setSelectedTags([]);
      setFile(null);
    }
  }, [scoreToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(".pdf", ""));
      }
    } else {
      toast.error("Please select a valid PDF file");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === "create") {
      if (!file || !title) return toast.error("Please provide title and PDF file");

      try {
        const uploadData = await getPresignedUrl(file.name, file.type);
        if (!uploadData) return;

        const { presignedUrl, fileUrl } = uploadData;

        await axios.put(presignedUrl, file, {
          headers: { "Content-Type": file.type },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        });

        await createScore({
          title,
          artist,
          fileUrl,
          fileSize: file.size,
          tags: selectedTags.map(t => t.value)
        });

        handleClose();
      } catch (error) {
        toast.error("Failed to upload score");
      }
    } else {
      if (!title) return toast.error("Title is required");

      try {
        await updateScore(scoreToEdit.id, {
          title,
          artist,
          tags: selectedTags.map(t => t.value)
        });
        handleClose();
      } catch (error) {
        toast.error("Failed to update score");
      }
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setFile(null);
      setTitle("");
      setArtist("");
      setSelectedTags([]);
      setProgress(0);
    }, 300);
  };

  const tagOptions = availableTags.map(tag => ({ value: tag, label: tag }));

  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "var(--fallback-b1,oklch(var(--b1)))",
      borderColor: "var(--fallback-b3,oklch(var(--b3)))",
      color: "var(--fallback-bc,oklch(var(--bc)))",
      "&:hover": { borderColor: "var(--fallback-bc,oklch(var(--bc)/0.2))" },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "var(--fallback-b2,oklch(var(--b2)))",
      border: "1px solid var(--fallback-b3,oklch(var(--b3)))",
      zIndex: 1000
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "var(--fallback-p,oklch(var(--p)/0.1))" : "transparent",
      color: "var(--fallback-bc,oklch(var(--bc)))",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "var(--fallback-p,oklch(var(--p)/0.1))",
      borderRadius: "6px"
    }),
    multiValueLabel: (base) => ({ ...base, color: "var(--fallback-p,oklch(var(--p)))" }),
    multiValueRemove: (base) => ({
      ...base,
      color: "var(--fallback-p,oklch(var(--p)))",
      "&:hover": { backgroundColor: "var(--fallback-er,oklch(var(--er)/0.2))", color: "white" }
    }),
    input: (base) => ({ ...base, color: "var(--fallback-bc,oklch(var(--bc)))" }),
    singleValue: (base) => ({ ...base, color: "var(--fallback-bc,oklch(var(--bc)))" }),
    placeholder: (base) => ({ ...base, color: "var(--fallback-bc,oklch(var(--bc)/0.5))" }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 })
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all">
      <div className="bg-base-100 border border-base-300 w-full max-w-lg rounded-[2rem] shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${mode === "create" ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"}`}>
              {mode === "create" ? <FilePlus size={24} /> : <Pencil size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-base-content">
                {mode === "create" ? "Upload Sheet Music" : "Edit Score Details"}
              </h2>
              <p className="text-sm text-base-content/60">
                {mode === "create" ? "Add a new score to your collective library" : "Update the metadata for this masterpiece"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {mode === "create" && (
            <div className="relative">
              {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-base-300 rounded-2xl bg-base-200/50 hover:bg-base-200 hover:border-primary/50 cursor-pointer transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-base-content/30 mb-3" />
                    <p className="text-sm text-base-content/70">
                      <span className="font-semibold text-primary underline">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-base-content/50 mt-1">PDF only (max 50MB)</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <FileText size={32} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-base-content truncate">{file.name}</p>
                    <p className="text-xs text-base-content/60">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="btn btn-ghost btn-sm btn-square text-error">
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text text-xs font-bold uppercase tracking-widest text-base-content/50">Title</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input input-bordered w-full rounded-xl bg-base-200/50 focus:bg-base-100"
                placeholder={mode === "create" ? "Nocturne Op. 9 No. 2" : "Enter title"}
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text text-xs font-bold uppercase tracking-widest text-base-content/50">Artist / Composer</span>
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="input input-bordered w-full rounded-xl bg-base-200/50 focus:bg-base-100"
                placeholder={mode === "create" ? "Frédéric Chopin" : "Enter artist"}
              />
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-xs font-bold uppercase tracking-widest text-base-content/50">Tags</span>
            </label>
            <Select
              isMulti
              options={tagOptions}
              styles={selectStyles}
              value={selectedTags}
              onChange={setSelectedTags}
              placeholder="Select tags..."
              menuPortalTarget={document.body}
              menuPosition="fixed"
              maxMenuHeight={220}
              className="mt-1"
            />
          </div>

          <div className="pt-4 border-t border-base-300">
            {isUploading && progress > 0 && progress < 100 && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-base-content/60">Uploading PDF...</span>
                  <span className="text-primary font-bold">{progress}%</span>
                </div>
                <progress className="progress progress-primary w-full h-2" value={progress} max="100"></progress>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || (mode === "create" && !file) || !title}
              className={`btn btn-block rounded-xl font-bold h-auto py-3 ${mode === "create" ? "btn-primary" : "btn-secondary"
                } shadow-lg active:scale-95`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {mode === "create" ? <Upload size={20} /> : <Pencil size={20} />}
                  <span>{mode === "create" ? "Upload Score" : "Save Changes"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.getElementById("modal-root")
  );
};

export default ScoreFormModal;
