import React, { useState, useEffect, useRef, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { useScoreStore } from "../store/useScoreStore";
import { useModalStore } from "../store/useModalStore";
import { getScores } from "../lib/api";
import ScoreCard from "../components/ScoreCard";
import Select from "react-select";
import {
  Search,
  Plus,
  Filter,
  Music,
  Heart,
  X,
  Loader2,
  Library,
  Zap
} from "lucide-react";

const ScoreLibraryPage = () => {
  const { availableTags } = useScoreStore();
  const { openScoreFormModal } = useModalStore();

  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [filterTags, setFilterTags] = useState([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    const s = searchParams.get("search");
    if (s !== null) {
      setSearch(s);
      setDebouncedSearch(s);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  const tagOptions = useMemo(() =>
    availableTags.map(tag => ({ value: tag, label: tag })),
    [availableTags]
  );

  const filterTagString = useMemo(() =>
    filterTags.map(t => t.value).join(","),
    [filterTags]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ["scores", { search: debouncedSearch, tag: filterTagString, favoritesOnly }],
    queryFn: ({ pageParam }) => getScores({
      pageParam,
      search: debouncedSearch,
      tag: filterTagString,
      favoritesOnly
    }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const observerRef = useRef();
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleEdit = (score) => {
    openScoreFormModal(score);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterTags([]);
    setFavoritesOnly(false);
  };

  const allScores = useMemo(() => {
    const scores = data?.pages.flatMap((page) => page.scores) || [];
    if (!debouncedSearch && !filterTagString && !favoritesOnly && data?.pages.length === 1) {
      return [...scores].sort(() => Math.random() - 0.5);
    }
    return scores;
  }, [data, debouncedSearch, filterTagString, favoritesOnly]);

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "4rem",
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderColor: state.isFocused ? "rgba(255, 255, 255, 0.1)" : "transparent",
      borderRadius: "1rem",
      padding: "0 0.5rem",
      boxShadow: "none",
      "&:hover": {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      cursor: "pointer",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#1d232a",
      borderRadius: "1rem",
      marginTop: "8px",
      border: "1px solid rgba(255,255,255,0.05)",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      overflow: "hidden"
    }),
    menuList: (base) => ({
      ...base,
      padding: "8px",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "rgba(255,255,255,0.05)" : "transparent",
      color: state.isFocused ? "#fff" : "rgba(255,255,255,0.6)",
      borderRadius: "0.5rem",
      cursor: "pointer",
      padding: "10px 12px",
      fontWeight: "600",
      fontSize: "14px",
      "&:active": {
        backgroundColor: "rgba(255,255,255,0.1)",
      }
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: "6px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#fff",
      fontWeight: "700",
      fontSize: "12px",
      padding: "4px 8px",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "rgba(255,255,255,0.5)",
      "&:hover": {
        backgroundColor: "rgba(255,0,0,0.2)",
        color: "#ff0000",
      },
    }),
    input: (base) => ({
      ...base,
      color: "#fff",
    }),
    placeholder: (base) => ({
      ...base,
      color: "rgba(255,255,255,0.3)",
      fontWeight: "600",
      fontSize: "14px",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "rgba(255,255,255,0.3)",
      "&:hover": {
        color: "rgba(255,255,255,0.7)",
      }
    })
  };

  return (
    <div className="min-h-screen bg-base-100 p-4 lg:p-8">
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Library className="text-primary" size={32} />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-base-content">
                Score <span className="text-primary font-outline-2">Library</span>
              </h1>
            </div>
            <p className="text-base-content/50 font-bold uppercase tracking-widest text-[10px] pl-1">
              {data?.pages[0]?.totalCount || 0} Professional Arrangements Found
            </p>
          </div>

          <button
            onClick={() => openScoreFormModal()}
            className="group btn btn-primary rounded-[1.5rem] px-8 h-16 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 border-none"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-black uppercase tracking-wider text-xs">Add New Score</span>
          </button>
        </header>

        {/* Filter Bar */}
        <div className="bg-base-200/50 backdrop-blur-xl border border-base-300 rounded-[2.5rem] p-4 lg:p-6 shadow-2xl flex flex-col lg:flex-row gap-4 items-center relative z-[20]">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search by title or artist..."
              className="w-full bg-base-100/50 border-2 border-base-300 focus:border-primary rounded-[2rem] pl-16 pr-6 h-14 font-medium transition-all outline-none text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="w-full lg:w-auto min-w-[300px]">
              <Select
                isMulti
                options={tagOptions}
                styles={customSelectStyles}
                placeholder="Filter by instrument, genre, or level..."
                value={filterTags}
                onChange={setFilterTags}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>

            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`btn h-14 rounded-[2rem] px-6 gap-3 transition-all border-none ${favoritesOnly ? "bg-error text-error-content shadow-lg shadow-error/20" : "bg-base-100 border-2 border-base-300 hover:border-error hover:text-error"
                }`}
            >
              <Heart size={18} fill={favoritesOnly ? "currentColor" : "none"} />
              <span className="text-xs font-black uppercase tracking-wider">Favorites</span>
            </button>

            {(search || filterTags.length > 0 || favoritesOnly) && (
              <button
                onClick={clearFilters}
                className="btn btn-ghost h-14 rounded-[2rem] px-6 text-xs font-black uppercase tracking-wider gap-2"
              >
                <X size={18} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        {status === "pending" ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 size={48} className="animate-spin text-primary opacity-20" />
            <p className="font-black text-xs uppercase tracking-[0.2em] opacity-30">Synchronizing Library...</p>
          </div>
        ) : status === "error" ? (
          <div className="bg-error/10 border-2 border-error/20 rounded-[2.5rem] p-12 text-center max-w-2xl mx-auto">
            <Music size={48} className="mx-auto mb-6 text-error opacity-50" />
            <h2 className="text-2xl font-black mb-4">Connection Failed</h2>
            <p className="text-base-content/60 font-medium mb-8">
              We couldn't reach the Harmonix servers. Please check your connection.
            </p>
            <button onClick={() => refetch()} className="btn btn-error px-12 rounded-2xl">Retry</button>
          </div>
        ) : allScores.length === 0 ? (
          <div className="bg-base-200/50 rounded-[3rem] p-24 text-center border-4 border-dashed border-base-300 flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-base-300 rounded-full flex items-center justify-center">
              <Plus size={40} className="text-base-content/20" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black">No matching scores found</h2>
              <p className="text-base-content/40 font-bold text-xs uppercase tracking-widest">Try adjusting your filters or add a new piece</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {allScores.map((score) => (
                <ScoreCard key={score.id} score={score} onEdit={handleEdit} />
              ))}
            </div>

            {/* Pagination / Loading State */}
            <div ref={observerRef} className="py-16 text-center">
              {isFetchingNextPage ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                  </div>
                  <p className="font-black text-[10px] uppercase tracking-widest text-primary/40">Loading more highlights</p>
                </div>
              ) : hasNextPage ? (
                <p className="font-black text-[10px] uppercase tracking-widest text-base-content/20">Scroll to reveal more</p>
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-20">
                  <Zap size={24} />
                  <p className="font-black text-[10px] uppercase tracking-widest">End of the collection</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default ScoreLibraryPage;
