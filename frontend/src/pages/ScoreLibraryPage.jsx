import React, { useEffect, useState } from "react";
import { useScoreStore } from "../store/useScoreStore";
import { useAuthStore } from "../store/useAuthStore";
import { 
  Search, 
  Plus, 
  Filter, 
  Music2, 
  Loader2, 
  Library, 
  Heart, 
  LayoutGrid,
  SearchX
} from "lucide-react";
import Select from "react-select";
import ScoreCard from "../components/ScoreCard";
import UploadScoreModal from "../components/UploadScoreModal";

const ScoreLibraryPage = () => {
  const { scores, getScores, isLoading, availableTags } = useScoreStore();
  const { authUser } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Debounced fetch
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      getScores({
        search: searchQuery,
        tag: selectedTags.map(t => t.value).join(","),
        favoritesOnly: showFavoritesOnly
      });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedTags, showFavoritesOnly]);

  const tagOptions = availableTags.map(tag => ({ value: tag, label: tag }));

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "rgba(255, 255, 255, 0.03)",
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      padding: "2px",
      boxShadow: "none",
      "&:hover": { borderColor: "rgba(59, 130, 246, 0.3)" },
      backdropFilter: "blur(10px)",
      color: "white"
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#111",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "rgba(59, 130, 246, 0.1)" : "transparent",
      color: state.isFocused ? "#3B82F6" : "#9ca3af",
      "&:active": { backgroundColor: "rgba(59, 130, 246, 0.2)" },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "rgba(59, 130, 246, 0.15)",
      borderRadius: "6px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#60a5fa",
      fontWeight: "600",
      fontSize: "11px"
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#60a5fa",
      "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.2)", color: "white" },
    }),
    input: (base) => ({ ...base, color: "white" }),
    placeholder: (base) => ({ ...base, color: "#4b5563" })
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header with Visual Impact */}
      <div className="relative group p-8 md:p-12 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase">
              <Library size={14} /> Collective Knowledge
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white flex items-center gap-4">
              <Music2 className="size-12 md:size-16 text-blue-500 animate-[pulse_3s_infinite]" />
              Score Library
            </h1>
            <p className="text-gray-400 text-lg font-medium max-w-xl leading-relaxed">
              The platform's unified vault for sheet music. Off-loaded to the cloud, 
              shared by the community, optimized for the <span className="text-white font-bold">Studio Dark</span> experience.
            </p>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="group/btn relative inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95"
          >
            <Plus className="size-6 transition-transform group-hover/btn:rotate-90" />
            Upload Score
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="sticky top-4 z-40 flex flex-col lg:flex-row items-center gap-4 bg-black/40 p-4 rounded-2xl backdrop-blur-2xl border border-white/10 shadow-2xl">
        <div className="w-full lg:w-1/3 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by title or artist..."
            className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/5 focus:border-blue-500/40 focus:bg-white/[0.06] focus:outline-none transition-all rounded-xl text-white font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full lg:flex-1">
          <Select
            isMulti
            options={tagOptions}
            styles={customSelectStyles}
            placeholder="Filter by instrument, genre, or level..."
            value={selectedTags}
            onChange={setSelectedTags}
          />
        </div>

        <div className="w-full lg:w-auto flex items-center gap-2 border-l border-white/10 pl-2">
          <button 
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex-1 lg:flex-none btn btn-ghost gap-2 rounded-xl px-5 transition-all ${
              showFavoritesOnly ? "bg-red-500/10 text-red-500 border-red-500/30" : "text-gray-400 hover:bg-white/5"
            }`}
          >
            <Heart size={20} fill={showFavoritesOnly ? "currentColor" : "none"} />
            <span className="font-bold">Favorites</span>
          </button>
          <div className="hidden lg:block w-px h-8 bg-white/10 mx-2"></div>
          <div className="p-2 text-blue-500 bg-blue-500/10 rounded-xl">
            <LayoutGrid size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="size-12 text-blue-500 animate-spin" />
          <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">Curating your library...</p>
        </div>
      ) : scores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
          {scores.map((score) => (
            <ScoreCard key={score.id} score={score} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center bg-white/[0.01] rounded-[3rem] border border-dashed border-white/10">
          <div className="p-6 bg-white/[0.03] rounded-full">
            <SearchX size={64} className="text-gray-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">No scores found</h3>
            <p className="text-gray-500 max-w-sm">
              We couldn't find any sheet music matching your criteria. Try adjusting your filters or upload a new masterpiece.
            </p>
          </div>
          <button 
            onClick={() => { setSearchQuery(""); setSelectedTags([]); setShowFavoritesOnly(false); }}
            className="text-blue-400 font-bold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Modals */}
      <UploadScoreModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>
  );
};

export default ScoreLibraryPage;
