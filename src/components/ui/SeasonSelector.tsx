"use client";

import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { StremioStream } from "@/types/stremio";

interface Episode {
    id: string;
    title: string;
    episode: number;
    season: number;
    thumbnail?: string;
    overview?: string;
}

interface SeasonSelectorProps {
    seasons: number[];
    currentSeason: number;
    currentEpisode: number;
    episodes: Episode[];
    onSeasonChange: (season: number) => void;
    onEpisodeChange: (episode: Episode) => void;
}

export function SeasonSelector({
    seasons,
    currentSeason,
    currentEpisode,
    episodes,
    onSeasonChange,
    onEpisodeChange
}: SeasonSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Group episodes by season if needed, but here we assume 'episodes' are for the *current* season
    // If the parent passes all episodes, we'd filter. 
    // Let's assume the parent passes relevant episodes for the selected season.

    return (
        <div className="absolute top-20 right-6 z-50 w-80 bg-black/90 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden flex flex-col max-h-[70vh]">
            {/* Season Select Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/10"
            >
                <span className="font-bold text-white">Season {currentSeason}</span>
                <ChevronDown className={cn("w-4 h-4 text-white transition-transform", isOpen && "rotate-180")} />
            </button>

            {/* Season List Dropdown */}
            {isOpen && (
                <div className="bg-zinc-900 border-b border-white/10 max-h-40 overflow-y-auto">
                    {seasons.map((season) => (
                        <button
                            key={season}
                            onClick={() => {
                                onSeasonChange(season);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors",
                                season === currentSeason ? "text-accent font-bold" : "text-zinc-400"
                            )}
                        >
                            Season {season}
                        </button>
                    ))}
                </div>
            )}

            {/* Episode List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {episodes.map((ep) => (
                    <button
                        key={ep.id || ep.episode}
                        onClick={() => onEpisodeChange(ep)}
                        className={cn(
                            "w-full flex items-start gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors group text-left",
                            ep.episode === currentEpisode ? "bg-white/10 ring-1 ring-accent/50" : ""
                        )}
                    >
                        <div className="relative w-16 aspect-video bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                            {ep.thumbnail ? (
                                <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Play className="w-4 h-4 text-white/20" />
                                </div>
                            )}
                            {ep.episode === currentEpisode && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={cn(
                                "text-sm font-medium truncate",
                                ep.episode === currentEpisode ? "text-accent" : "text-zinc-200 group-hover:text-white"
                            )}>
                                {ep.episode}. {ep.title || `Episode ${ep.episode}`}
                            </h4>
                            <p className="text-xs text-zinc-500 line-clamp-1">
                                {ep.overview || "No description available"}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
