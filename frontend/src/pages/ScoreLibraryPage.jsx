import { useState } from "react";
import { Search, Plus, Filter, Music2, FileText, Download, Eye } from "lucide-react";
import Select from "react-select";

const ScoreLibraryPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  // Mock tags for initial UI - will be fetched from DB in Step 3
  const tagOptions = [
    { value: "piano", label: "Piano", color: "#3B82F6" },
    { value: "jazz", label: "Jazz", color: "#8B5CF6" },
    { value: "classical", label: "Classical", color: "#10B981" },
    { value: "advanced", label: "Advanced", color: "#EF4444" },
    { value: "theory", label: "Theory", color: "#F59E0B" },
    { value: "vocals", label: "Vocals", color: "#EC4899" },
    { value: "intermediate", label: "Intermediate", color: "#6366F1" },
    { value: "beginner", label: "Beginner", color: "#14B8A6" },
  ];

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "rgba(31, 41, 55, 0.5)",
      borderColor: "rgba(75, 85, 99, 0.3)",
      borderRadius: "0.5rem",
      padding: "2px",
      boxShadow: "none",
      "&:hover": {
        borderColor: "rgba(59, 130, 246, 0.5)",
      },
      backdropFilter: "blur(8px)",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#1f2937",
      borderRadius: "0.5rem",
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "rgba(59, 130, 246, 0.1)" : "transparent",
      color: state.isFocused ? "#3B82F6" : "#e5e7eb",
      "&:active": {
        backgroundColor: "rgba(59, 130, 246, 0.2)",
      },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      borderRadius: "4px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#3B82F6",
      fontWeight: "500",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#3B82F6",
      "&:hover": {
        backgroundColor: "rgba(59, 130, 246, 0.3)",
        color: "#2563EB",
      },
    }),
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-base-200/40 p-8 rounded-3xl backdrop-blur-xl border border-white/5 shadow-2xl">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <Music2 className="size-10 text-primary animate-pulse" />
            Score Library
          </h1>
          <p className="text-base-content/60 font-medium max-w-md">
            Your personal digital music stand. Store, preview, and organize your sheet music collections in the cloud.
          </p>
        </div>
        <button className="btn btn-primary gap-2 rounded-2xl px-8 h-14 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95">
          <Plus className="size-6" />
          Share Score
        </button>
      </div>

      {/* Filter Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-base-200/40 p-4 rounded-2xl backdrop-blur-lg border border-white/5 shadow-xl">
        <div className="lg:col-span-4 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-base-content/40 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search titles, composers..."
            className="input input-bordered w-full pl-12 bg-base-300/50 border-white/5 focus:border-primary/50 focus:outline-none transition-all rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="lg:col-span-7">
          <Select
            isMulti
            options={tagOptions}
            styles={customSelectStyles}
            placeholder="Filter by tags..."
            className="react-select-container"
            classNamePrefix="react-select"
            value={selectedTags}
            onChange={setSelectedTags}
          />
        </div>
        <div className="lg:col-span-1 flex justify-center">
          <button className="btn btn-ghost btn-square rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
            <Filter className="size-6" />
          </button>
        </div>
      </div>

      {/* Scores Grid (Empty State for now) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Mock Card for Design Verification */}
        <div className="group relative bg-base-200/50 rounded-3xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5">
          {/* Skeleton/Preview Area */}
          <div className="aspect-[3/4] bg-base-300/50 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-base-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
            <FileText className="size-20 text-base-content/10 group-hover:scale-110 transition-transform duration-700" />
            
            {/* Hover Actions */}
            <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 z-20">
              <button className="btn btn-primary rounded-xl px-6 gap-2 font-bold shadow-xl">
                <Eye className="size-5" />
                View
              </button>
              <button className="btn btn-secondary rounded-xl btn-square shadow-xl">
                <Download className="size-5" />
              </button>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6 space-y-4 relative z-10 backdrop-blur-md bg-white/[0.02]">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white truncate">Chopin - Nocturne Op. 9 No. 2</h3>
              <p className="text-sm text-base-content/50 font-medium">Frédéric Chopin</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-sm border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold px-3 py-2.5 rounded-lg">Piano</span>
              <span className="badge badge-sm border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold px-3 py-2.5 rounded-lg">Classical</span>
              <span className="badge badge-sm border-orange-500/30 bg-orange-500/10 text-orange-400 font-bold px-3 py-2.5 rounded-lg">Advanced</span>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-black">HB</div>
                <span className="text-xs font-semibold text-base-content/40 leading-none">Shared by <br/><span className="text-base-content/80">Hans Bill</span></span>
              </div>
              <span className="text-xs font-mono text-base-content/30 italic">12 pages • 4.2 MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreLibraryPage;
