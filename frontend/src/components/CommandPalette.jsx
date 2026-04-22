import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Search, Loader2, Users, Music, Radio } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { globalSearch, getRecentChats } from "../lib/api";
import { useProfileStore } from "../store/useProfileStore";
import { useModalStore } from "../store/useModalStore";

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState({ users: [], groups: [], scores: [], tracks: [] });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const openProfile = useProfileStore((state) => state.openProfile);
  const closeAllModals = useModalStore((state) => state.closeAllModals);

  const { data: recentChats = [] } = useQuery({
    queryKey: ["recent-chats"],
    queryFn: getRecentChats
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults({ users: [], groups: [], scores: [], tracks: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.trim().length < 2) {
        setResults({ users: [], groups: [], scores: [], tracks: [] });
        return;
      }
      setIsLoading(true);
      try {
        const data = await globalSearch(debouncedQuery);
        setResults(data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, [debouncedQuery]);

  const closePalette = () => setIsOpen(false);

  if (!isOpen) return null;

  const hasResults = results.users.length > 0 || results.groups.length > 0 || results.scores.length > 0 || (results.tracks && results.tracks.length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={closePalette}
    >
      <div
        className="bg-base-200 w-full max-w-2xl rounded-2xl shadow-2xl border border-base-300 overflow-hidden animate-in fade-in zoom-in-95 duration-200 mx-4 flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Header */}
        <div className="flex items-center px-4 py-4 border-b border-base-300 shrink-0">
          <Search className="size-5 text-base-content/50 mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Search users, groups, or scores..."
            className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-base-content/30"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && <Loader2 className="size-5 text-primary animate-spin mr-3" />}
          <kbd className="kbd kbd-sm ml-2">ESC</kbd>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-2 custom-scrollbar">
          {!query ? (
            <div className="p-8 text-center text-base-content/40 text-sm">
              Start typing to search across Harmonix...
            </div>
          ) : isLoading && !hasResults ? (
            <div className="p-8 text-center text-base-content/40 text-sm">
              Searching databases...
            </div>
          ) : !hasResults ? (
            <div className="p-8 text-center text-base-content/40 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-4 p-2">
              {/* Users Section */}
              {results.users.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/50 mb-2 px-2">Users</p>
                  {results.users.map(user => (
                    <button
                      key={user.id}
                      className="w-full flex items-center gap-3 p-2 hover:bg-base-300 rounded-xl transition-colors text-left"
                      onClick={() => {
                        closePalette();
                        const existingChat = recentChats.find(chat => !chat.isGroup && chat.otherMember?.id === user.id);
                        if (existingChat) {
                          navigate(`/collaborators?chatId=${existingChat.id}`);
                        } else {
                          openProfile(user);
                        }
                      }}
                    >
                      <div className="avatar">
                        <div className="w-8 rounded-full bg-base-100 ring-1 ring-base-300">
                          <img src={user.profilePic || "/avatar.png"} alt={user.fullName} />
                        </div>
                      </div>
                      <span className="font-medium text-sm">{user.fullName}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Groups Section */}
              {results.groups.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/50 mb-2 px-2 mt-2">Groups</p>
                  {results.groups.map(group => (
                    <button
                      key={group.id}
                      className="w-full flex items-center gap-3 p-2 hover:bg-base-300 rounded-xl transition-colors text-left"
                      onClick={() => {
                        closePalette();
                        navigate(`/collaborators?chatId=${group.id}`);
                      }}
                    >
                      <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Users size={16} />
                      </div>
                      <span className="font-medium text-sm">{group.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Scores Section */}
              {results.scores.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/50 mb-2 px-2 mt-2">Scores</p>
                  {results.scores.map(score => (
                    <button
                      key={score.id}
                      className="w-full flex items-center gap-3 p-2 hover:bg-base-300 rounded-xl transition-colors text-left"
                      onClick={() => {
                        closePalette();
                        navigate(`/scores?search=${encodeURIComponent(score.title)}`);
                      }}
                    >
                      <div className="size-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
                        <Music size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm leading-tight">{score.title}</span>
                        <span className="text-[10px] text-base-content/50 uppercase">{score.artist || "Unknown"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Tracks Section */}
              {results.tracks && results.tracks.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/50 mb-2 px-2 mt-2">Audio Tracks</p>
                  {results.tracks.map(track => (
                    <button
                      key={track.id}
                      className="w-full flex items-center gap-3 p-2 hover:bg-base-300 rounded-xl transition-colors text-left"
                      onClick={() => {
                        closePalette();
                        navigate(`/audio-library?search=${encodeURIComponent(track.title)}`);
                      }}
                    >
                      <div className="size-8 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0">
                        <Radio size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm leading-tight">{track.title}</span>
                        <span className="text-[10px] text-base-content/50 uppercase">{track.artist || "Unknown"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommandPalette;
