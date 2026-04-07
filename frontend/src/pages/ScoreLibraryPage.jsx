import React, { useEffect, useState } from "react";
import { useScoreStore } from "../store/useScoreStore";
import useAuthUser from "../hooks/useAuthUser";
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
import ScoreFormModal from "../components/ScoreFormModal";

const ScoreLibraryPage = () => {
  const { scores, getScores, isLoading, availableTags } = useScoreStore();
  const { authUser } = useAuthUser();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScore, setEditingScore] = useState(null);

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
      backgroundColor: "var(--fallback-b1,oklch(var(--b1)/0.1))",
      borderColor: "var(--fallback-b3,oklch(var(--b3)/0.5))",
      borderRadius: "16px",
      padding: "4px",
      boxShadow: "none",
      "&:hover": { borderColor: "var(--fallback-p,oklch(var(--p)/0.3))" },
      backdropFilter: "blur(10px)",
      color: "var(--fallback-bc,oklch(var(--bc)))"
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "var(--fallback-b1,oklch(var(--b1)))",
      border: "1px solid var(--fallback-b3,oklch(var(--b3)))",
      borderRadius: "16px",
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "var(--fallback-p,oklch(var(--p)/0.1))" : "transparent",
      color: state.isFocused ? "var(--fallback-p,oklch(var(--p)))" : "var(--fallback-bc,oklch(var(--bc)))",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "var(--fallback-p,oklch(var(--p)/0.1))",
      borderRadius: "8px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "var(--fallback-p,oklch(var(--p)))",
      fontWeight: "800",
      fontSize: "11px"
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "var(--fallback-p,oklch(var(--p)))",
      "&:hover": { backgroundColor: "var(--fallback-er,oklch(var(--er)/0.1))" },
    }),
    input: (base) => ({ ...base, color: "var(--fallback-bc,oklch(var(--bc)))" }),
    placeholder: (base) => ({ ...base, color: "var(--fallback-bc,oklch(var(--bc)/0.4))" })
  };

  const handleEdit = (score) => {
    setEditingScore(score);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingScore(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000 bg-base-100">
      {/* Header with Visual Impact */}
      <div className="relative group p-10 md:p-16 rounded-[3rem] overflow-hidden border border-base-300 shadow-2xl bg-gradient-to-br from-primary/10 via-base-100 to-secondary/5">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-widest uppercase">
              <Library size={14} /> Collective Knowledge
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-base-content flex items-center gap-6">
              <Music2 className="size-14 md:size-20 text-primary animate-[pulse_4s_infinite]" />
              Score Library
            </h1>
            <p className="text-base-content/60 text-xl font-medium max-w-xl leading-relaxed">
              The platform's unified vault for sheet music. Off-loaded to the cloud, 
              shared by the community, optimized for the <span className="text-base-content font-black">Studio Experience</span>.
            </p>
          </div>
          <button 
            onClick={handleCreate}
            className="btn btn-primary btn-lg rounded-[2rem] px-10 font-black shadow-xl shadow-primary/20 group/btn transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="size-6 transition-transform group-hover/btn:rotate-90" />
            Upload Score
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="sticky top-6 z-40 flex flex-col lg:flex-row items-center gap-6 bg-base-100/60 p-5 rounded-[2.5rem] backdrop-blur-3xl border border-base-300 shadow-2xl">
        <div className="w-full lg:w-1/3 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-6 text-base-content/30 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by title or artist..."
            className="input input-lg input-bordered w-full pl-14 pr-6 bg-base-200/50 border-base-300 focus:border-primary/40 focus:bg-base-100 transition-all rounded-2xl text-base-content font-bold placeholder:text-base-content/30"
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

        <div className="w-full lg:w-auto flex items-center gap-3 border-l border-base-300 pl-4">
          <button 
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`btn btn-ghost btn-lg gap-3 rounded-2xl px-6 transition-all ${
              showFavoritesOnly ? "bg-error/10 text-error border-error/20" : "text-base-content/50 hover:bg-base-200"
            }`}
          >
            <Heart size={22} fill={showFavoritesOnly ? "currentColor" : "none"} />
            <span className="font-black uppercase tracking-widest text-xs">Favorites</span>
          </button>
          <div className="hidden lg:block w-px h-10 bg-base-300 mx-2"></div>
          <div className="p-3 text-primary bg-primary/10 rounded-2xl shadow-inner">
            <LayoutGrid size={28} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-20">
          {scores.map((score) => (
            <ScoreCard key={score.id} score={score} onEdit={handleEdit} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 space-y-8 text-center bg-base-200/50 rounded-[4rem] border border-dashed border-base-300 mx-4">
          <div className="p-8 bg-base-100 rounded-full shadow-inner ring-1 ring-base-300">
            <SearchX size={80} className="text-base-content/20" />
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-base-content">No scores found</h3>
            <p className="text-base-content/50 max-w-sm font-medium">
              We couldn't find any sheet music matching your criteria. Try adjusting your filters or upload a new masterpiece.
            </p>
          </div>
          <button 
            onClick={() => { setSearchQuery(""); setSelectedTags([]); setShowFavoritesOnly(false); }}
            className="btn btn-link no-underline text-primary font-black uppercase tracking-widest text-xs hover:text-primary-focus transition-all"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Modals */}
      <ScoreFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        scoreToEdit={editingScore}
      />
    </div>
  );
};

export default ScoreLibraryPage;
