"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface EpisodeAccordionProps {
    meta: any;
    onEpisodeSelect: (season: number, episode: number, id: string) => void;
}

export function EpisodeAccordion({ meta, onEpisodeSelect }: EpisodeAccordionProps) {
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

    const [expandedSeason, setExpandedSeason] = useState<number | null>(seasons[0] || null);

    if (seasons.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-black text-white px-1">Seasons & Episodes</h2>
            <div className="space-y-3">
                {seasons.map((season) => (
                    <div key={season} className="overflow-hidden rounded-2xl border border-white/5 bg-surface/30">
                        <button
                            onClick={() => setExpandedSeason(expandedSeason === season ? null : season)}
                            className="flex w-full items-center justify-between p-5 transition-colors hover:bg-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-black text-white">Season {season}</span>
                                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    {episodes.filter((ep: any) => ep.season === season).length} Episodes
                                </span>
                            </div>
                            {expandedSeason === season ? (
                                <ChevronDown className="h-5 w-5 text-accent" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-text-muted" />
                            )}
                        </button>

                        <AnimatePresence>
                            {expandedSeason === season && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                >
                                    <div className="divide-y divide-white/5 bg-black/20">
                                        {episodes
                                            .filter((ep: any) => ep.season === season)
                                            .map((ep: any) => (
                                                <button
                                                    key={ep.id}
                                                    onClick={() => onEpisodeSelect(ep.season, ep.episode, ep.id)}
                                                    className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-white/5 active:bg-white/10 group active:scale-[0.98]"
                                                >
                                                    <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-surface">
                                                        {ep.thumbnail ? (
                                                            <img
                                                                src={ep.thumbnail}
                                                                alt=""
                                                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">
                                                                S{ep.season} E{ep.episode}
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                            <Play className="h-6 w-6 fill-white text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="flex min-w-0 flex-col py-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">
                                                            Episode {ep.episode}
                                                        </span>
                                                        <h4 className="line-clamp-1 text-sm font-black text-white">
                                                            {ep.title || `Episode ${ep.episode}`}
                                                        </h4>
                                                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">
                                                            {ep.overview || "Watch this episode of " + meta.name}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
}
