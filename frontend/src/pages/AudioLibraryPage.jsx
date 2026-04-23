import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { Search, Plus, Music, Loader2, Radio, Headphones, SearchX, LayoutGrid } from "lucide-react";
import { useSearchParams } from "react-router";
import { getTracks, deleteTrack, getPlaylists, removeTrackFromPlaylist, deletePlaylist, toggleLikedTrack } from "../lib/api";
import { useAudioStore } from "../store/useAudioStore";
import TrackCard from "../components/TrackCard";
import ContextMenu from "../components/ContextMenu";
import { useContextMenu } from "../hooks/useContextMenu";
import { toast } from "react-hot-toast";
import { useModalStore } from "../store/useModalStore";
import { ListMusic, PlusCircle, Layers, ChevronRight, Music2, MinusCircle, Trash2 } from "lucide-react";

const AudioLibraryPage = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activePlaylistId, setActivePlaylistId] = useState("all");

  useEffect(() => {
    const s = searchParams.get("search");
    if (s !== null) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  const openUploadTrackModal = useModalStore(s => s.openUploadTrackModal);
  const openEditTrackModal = useModalStore(s => s.openEditTrackModal);
  const openCreatePlaylistModal = useModalStore(s => s.openCreatePlaylistModal);
  const openAddToPlaylistModal = useModalStore(s => s.openAddToPlaylistModal);

  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const playContext = useAudioStore((state) => state.playContext);

  const {
    data: tracksData,
    isLoading: isLoadingTracks,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["tracks", searchQuery],
    queryFn: ({ pageParam }) => getTracks({ pageParam, search: searchQuery }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const globalTracks = useMemo(() => {
    const all = tracksData?.pages.flatMap(page => page.tracks) || [];
    if (!searchQuery && tracksData?.pages.length === 1) {
      return [...all].sort(() => Math.random() - 0.5);
    }
    return all;
  }, [tracksData, searchQuery]);

  const totalCountInDb = tracksData?.pages[0]?.totalCount || 0;

  const { data: playlists = [], isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ["playlists"],
    queryFn: getPlaylists,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Track removed from library");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete track");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (trackId) => removeTrackFromPlaylist(activePlaylistId, trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Track removed from playlist");
      closeContextMenu();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to remove track");
    }
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: deletePlaylist,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist deleted");
      if (activePlaylistId === deletedId) {
        setActivePlaylistId("all");
      }
    },
    onError: () => toast.error("Failed to delete playlist"),
  });

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);
  const likedPlaylist = playlists.find(p => p.title === "Liked Songs");

  const isGlobal = activePlaylistId === "all";

  const toggleLikeMutation = useMutation({
    mutationFn: toggleLikedTrack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists"] })
  });

  const filteredTracks = isGlobal
    ? globalTracks
    : (activePlaylist?.tracks || []).filter(track =>
      track?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track?.artist?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && isGlobal) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isGlobal]);

  const isLoading = isLoadingTracks || isLoadingPlaylists;

  const handlePlayAll = () => {
    if (filteredTracks.length > 0) {
      playContext(filteredTracks, 0, "all_tracks");
    }
  };

  const handlePlayTrack = (index) => {
    playContext(filteredTracks, index, "library_context");
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Dynamic Header */}
      <div className="relative p-10 md:p-16 rounded-[3.5rem] overflow-hidden border border-base-300 shadow-2xl bg-gradient-to-br from-secondary/10 via-base-100 to-primary/5">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-black tracking-widest uppercase">
              <Radio size={14} className="animate-pulse" /> Cloud Streaming Engine
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-base-content flex items-center gap-6">
              <Headphones className="size-14 md:size-20 text-secondary" />
              Audio Library
            </h1>
            <p className="text-base-content/60 text-xl font-medium max-w-xl leading-relaxed">
              Manage your personal high-fidelity music collection. Upload <span className="text-base-content font-black">Lossless Tracks</span>,
              curate metadata, and stream anywhere in the Harmonix ecosystem.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handlePlayAll}
              disabled={filteredTracks.length === 0}
              className="btn btn-secondary btn-lg rounded-[2rem] px-10 font-black shadow-xl shadow-secondary/20 transition-all hover:scale-105 active:scale-95"
            >
              Play All
            </button>
            <button
              onClick={openUploadTrackModal}
              className="btn btn-primary btn-lg rounded-[2rem] px-10 font-black shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="size-6 mr-1" /> Upload Track
            </button>
          </div>
        </div>
      </div>

      {/* Persistence Bar */}
      <div className="sticky top-6 z-40 flex flex-col md:flex-row items-center gap-6 bg-base-100/60 p-5 rounded-[2.5rem] backdrop-blur-3xl border border-base-300 shadow-xl">
        <div className="w-full md:flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-6 text-base-content/30 group-focus-within:text-secondary transition-colors" />
          <input
            type="text"
            placeholder="Search tracks, artists, or genres..."
            className="input input-lg input-bordered w-full pl-16 pr-6 bg-transparent border-base-content/20 focus:border-secondary transition-all rounded-3xl text-base-content font-bold placeholder:text-base-content/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 px-6 border-l border-base-300">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 leading-none">Total Library</p>
            <p className="text-xl font-black text-secondary">{totalCountInDb} Items</p>
          </div>
          <div className="p-3 text-secondary bg-secondary/10 rounded-2xl">
            <LayoutGrid size={24} />
          </div>
        </div>
      </div>

      {/* Main Framework */}
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left Sidebar: Playlist Navigation */}
        <aside className="w-full lg:w-72 space-y-8">
          <div className="bg-base-100 p-6 rounded-[2.5rem] border border-base-300 shadow-xl space-y-6 sticky top-36 max-h-[calc(100vh-10rem)] flex flex-col">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-base-content/40 flex items-center gap-2">
                <Layers size={16} /> Library Context
              </h3>
              <button
                onClick={openCreatePlaylistModal}
                className="btn btn-ghost btn-sm btn-circle text-secondary hover:bg-secondary/10"
              >
                <PlusCircle size={20} />
              </button>
            </div>

            <nav className="space-y-2 flex-1 overflow-y-auto pr-2 -mr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <button
                onClick={() => setActivePlaylistId("all")}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${activePlaylistId === "all"
                    ? "bg-primary/10 text-primary shadow-inner ring-1 ring-primary/20"
                    : "hover:bg-base-200 text-base-content/60"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Radio size={18} className={activePlaylistId === "all" ? "animate-pulse" : ""} />
                  <span className="font-bold text-sm">All Library Tracks</span>
                </div>
                <span className="text-[10px] font-black opacity-30">{totalCountInDb}</span>
              </button>

              <div className="h-px bg-base-300 mx-4 my-4 opacity-50" />

              <p className="px-4 text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-2">User Collections</p>

              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => setActivePlaylistId(playlist.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${activePlaylistId === playlist.id
                      ? "bg-secondary/10 text-secondary shadow-inner ring-1 ring-secondary/20"
                      : "hover:bg-base-200 text-base-content/60"
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ListMusic size={18} />
                    <span className="font-bold text-sm truncate">{playlist.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlaylistMutation.mutate(playlist.id);
                      }}
                      className="p-1.5 text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/20 rounded-md"
                    >
                      <Trash2 size={14} />
                    </div>
                    <ChevronRight size={14} className={`transition-transform ${activePlaylistId === playlist.id ? "rotate-90" : "opacity-0 group-hover:opacity-100"}`} />
                  </div>
                </button>
              ))}

              {playlists.length === 0 && (
                <div className="p-8 text-center space-y-3 opacity-30">
                  <Music size={32} className="mx-auto" />
                  <p className="text-[10px] font-bold uppercase leading-tight">No playlists yet.<br />Create one to organize.</p>
                </div>
              )}
            </nav>
          </div>
        </aside>

        {/* Right Content: Track Grid */}
        <main className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="relative">
                <Loader2 className="size-16 text-secondary animate-spin" />
                <Music className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-6 text-secondary" />
              </div>
              <p className="text-base-content/40 font-black tracking-widest uppercase text-xs">Synchronizing Audio Stream...</p>
            </div>
          ) : filteredTracks.length > 0 ? (
            <div className="pb-32">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredTracks.map((track, index) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    onPlay={() => handlePlayTrack(index)}
                    onDelete={(id) => activePlaylistId === "all" ? deleteMutation.mutate(id) : removeMutation.mutate(id)}
                    onContextMenu={handleContextMenu}
                    isLiked={likedPlaylist?.tracks?.some(t => t.id === track.id)}
                    onToggleLike={() => toggleLikeMutation.mutate(track.id)}
                    onEdit={openEditTrackModal}
                  />
                ))}
              </div>
              {isGlobal && hasNextPage && (
                <div ref={observerTarget} className="flex justify-center py-8">
                  <Loader2 className="size-8 text-secondary animate-spin" />
                </div>
              )}
            </div>
          ) : activePlaylistId !== "all" && (activePlaylist?.tracks || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-8 text-center bg-base-200/30 rounded-[4rem] border border-dashed border-base-300 mx-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="p-10 bg-base-100 rounded-full shadow-2xl ring-1 ring-secondary/20 relative">
                <ListMusic size={64} className="text-secondary opacity-20" />
                <PlusCircle size={24} className="absolute bottom-6 right-6 text-secondary" />
              </div>
              <div className="space-y-3 px-6">
                <h3 className="text-3xl font-black text-base-content tracking-tighter">Playlist is Empty</h3>
                <p className="text-base-content/50 max-w-sm font-medium mx-auto">
                  This collection hasn't found its rhythm yet. Go to <button onClick={() => setActivePlaylistId("all")} className="text-primary font-bold hover:underline">All Library Tracks</button> to start adding music to <span className="font-black text-secondary break-all">"{activePlaylist?.title}"</span>.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 space-y-8 text-center bg-base-200/30 rounded-[4rem] border border-dashed border-base-300 mx-4">
              <div className="p-10 bg-base-100 rounded-full shadow-2xl ring-1 ring-base-300">
                <SearchX size={64} className="text-base-content/10" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-base-content">Quiet on the front</h3>
                <p className="text-base-content/50 max-w-sm font-medium">
                  We couldn't find any tracks matching "{searchQuery}". Try a different frequency or upload something new.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Context Actions Overlay */}
      {contextMenu && (
        <ContextMenu {...contextMenu} onClose={closeContextMenu}>
          <li>
            <button
              onClick={() => {
                openAddToPlaylistModal(contextMenu.data);
                closeContextMenu();
              }}
              className="flex items-center gap-3 font-bold text-sm py-3"
            >
              <PlusCircle size={18} className="text-primary" />
              Add to Playlist
            </button>
          </li>
          {activePlaylistId !== "all" && (
            <li>
              <button
                onClick={() => removeMutation.mutate(contextMenu.data.id)}
                className="flex items-center gap-3 font-bold text-sm py-3 text-error hover:bg-error/10"
              >
                <MinusCircle size={18} />
                Remove from Playlist
              </button>
            </li>
          )}
        </ContextMenu>
      )}
    </div>
  );
};

export default AudioLibraryPage;
