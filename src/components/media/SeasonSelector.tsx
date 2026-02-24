"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SeasonSelectorProps {
    meta: any; // The full metadata object from Stremio
    onEpisodeSelect: (season: number, episode: number, id: string) => void;
    onClose: () => void;
    onFallbackSearch?: () => void;
}

export function SeasonSelector({ meta, onEpisodeSelect, onClose, onFallbackSearch }: SeasonSelectorProps) {
    // Extract seasons from meta.videos
    // meta.videos is an array of { id, title, released, season, episode, ... }

    const episodes = useMemo(() => {
        if (!meta || !meta.videos) return [];
        return (meta.videos || []).sort((a: any, b: any) => {
            if (a.season !== b.season) return a.season - b.season;
            return a.episode - b.episode;
        });
    }, [meta]);

    const seasons = useMemo(() => {
        const s = new Set<number>();
        episodes.forEach((ep: any) => s.add(ep.season));
        return Array.from(s).sort((a, b) => a - b);
    }, [episodes]);

    const [selectedSeason, setSelectedSeason] = useState<number>(seasons[0] || 1);

    const currentEpisodes = episodes.filter((ep: any) => ep.season === selectedSeason);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-zinc-900 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white max-w-[80%] truncate">{meta.name}</h2>
                        <p className="text-zinc-400 text-sm">Select an Episode</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Season Sidebar */}
                    <div className="w-24 md:w-32 border-r border-white/10 overflow-y-auto bg-black/20 custom-scrollbar">
                        {seasons.map(s => (
                            <button
                                key={s}
                                onClick={() => setSelectedSeason(s)}
                                className={cn(
                                    "w-full py-4 text-center font-bold text-sm transition-colors relative",
                                    selectedSeason === s ? "text-accent bg-white/5" : "text-zinc-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                Season {s}
                                {selectedSeason === s && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                                )}
                            </button>
                        ))}
                        {seasons.length === 0 && (
                            <div className="py-4 text-center text-zinc-500 text-xs px-2">
                                No seasons found.
                            </div>
                        )}
                    </div>

                    {/* Episode Grid */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        {currentEpisodes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentEpisodes.map((ep: any) => (
                                    <button
                                        key={ep.id}
                                        onClick={() => onEpisodeSelect(ep.season, ep.episode, ep.id)}
                                        className="flex gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group text-left"
                                    >
                                        <div className="relative w-32 aspect-video bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                                            {ep.thumbnail ? (
                                                <img src={ep.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-xs bg-zinc-800">
                                                    <span>S{ep.season} E{ep.episode}</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                <Play className="w-8 h-8 text-white fill-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h4 className="font-bold text-sm text-white truncate pr-2">
                                                {ep.episode}. {ep.title || `Episode ${ep.episode}`}
                                            </h4>
                                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                                                {ep.overview || "No description available."}
                                            </p>
                                            <div className="mt-2 text-[10px] text-zinc-500 font-medium">
                                                {ep.released ? new Date(ep.released).toLocaleDateString() : ""}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                                <p>No episodes details available.</p>
                                {onFallbackSearch && (
                                    <button
                                        onClick={onFallbackSearch}
                                        className="px-6 py-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl text-sm font-bold transition-colors"
                                    >
                                        Search Streams Directly
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
