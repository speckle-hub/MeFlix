"use client";

import Image from "next/image";
import { Play, Star, Plus, Check, MoreVertical, X } from "lucide-react";
import { motion } from "framer-motion";
import { Movie } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useWatchlistStore } from "@/store/watchlistStore";
import { useProgressStore } from "@/store/progressStore";
import { useHaptics } from "@/hooks/useHaptics";
import { toast } from "sonner";
import Link from "next/link";

interface MediaCardProps {
    movie: Movie;
    index: number;
}

export default function MediaCard({ movie, index }: MediaCardProps) {
    const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlistStore();
    const { getProgress, removeFromContinueWatching } = useProgressStore();
    const { light, success: hapticSuccess } = useHaptics();

    const isAdded = isInWatchlist(movie.id);
    const progressItem = getProgress(movie.id);

    // Diagnostic log for images
    if (index === 0) {
        console.log(`[MeFlix] Poster URL for ${movie.title}:`, movie.poster);
    }

    const progressPercent = progressItem
        ? (progressItem.timestamp / progressItem.duration) * 100
        : 0;

    const handleWatchlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        light();

        if (isAdded) {
            removeFromWatchlist(movie.id);
            toast.error("Removed from Library", {
                description: movie.title,
                icon: <Plus className="h-4 w-4 rotate-45" />,
            });
        } else {
            addToWatchlist(movie);
            hapticSuccess();
            toast.success("Added to Library", {
                description: movie.title,
                icon: <Check className="h-4 w-4" />,
            });
        }
    };

    const handleRemoveProgress = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        light();
        removeFromContinueWatching(movie.id);
        toast.info("Removed from Continue Watching", {
            description: movie.title
        });
    };

    // For series, the ID in the route should be the base IMDB/TMDB ID (e.g., tt0903747)
    // even if the saved progress item has a full episode ID (e.g., tt0903747:1:1).
    const isSeries = movie.type === 'series';
    const isManga = movie.type === 'manga';
    const baseId = isSeries && movie.id.includes(':') ? movie.id.split(':')[0] : movie.id;

    // Manga specific routing: /manga/[source]/[id]
    // For continue watching, we might need the sourceId
    const sourceId = (movie as any).sourceId || 'mangadex';
    const metaRoute = isManga ? `/manga/${sourceId}/${baseId}` : `/meta/${movie.type}/${baseId}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="group relative"
        >
            {/* Remove Action Button - Positioned outside the Link to fix HTML nesting */}
            {progressItem && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.2, backgroundColor: "rgba(239, 68, 68, 0.8)" }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleRemoveProgress}
                    className="absolute -right-1 -top-1 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl backdrop-blur-md border border-white/20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
                    title="Remove from history"
                >
                    <X className="h-6 w-6" />
                </motion.button>
            )}

            <Link
                href={metaRoute}
                className="block cursor-pointer"
                onClick={() => {
                    if (isManga) return; // Manga doesn't use stremio context yet

                    // Pass context to meta page for directed fetching and immediate display
                    const context = {
                        id: baseId,
                        name: movie.title,
                        poster: movie.poster,
                        type: movie.type,
                        addonBaseUrl: progressItem?.addonBaseUrl,
                        addonId: progressItem?.addonId
                    };
                    sessionStorage.setItem('content_context', JSON.stringify(context));
                }}
            >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-surface transition-all duration-300 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(var(--app-accent-rgb),0.2)]">
                    <Image
                        src={movie.poster}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                        <div className="flex items-center justify-between mb-2">
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="h-14 w-14 rounded-full bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/40"
                            >
                                <Play className="h-7 w-7 fill-current ml-1" />
                            </motion.div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleWatchlist}
                                    className={cn(
                                        "h-12 w-12 rounded-full flex items-center justify-center transition-all border",
                                        isAdded ? "bg-white text-black border-white" : "bg-black/40 text-white border-white/20 hover:bg-black/60"
                                    )}
                                >
                                    {isAdded ? <Check className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h3 className="font-bold text-white text-sm line-clamp-1">{movie.title}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                                    {movie.quality}
                                </span>
                                <span className="text-xs text-text-muted">{movie.year}</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar Overlay */}
                    {progressPercent > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                            <div
                                className="h-full bg-accent transition-all duration-300"
                                style={{ width: `${Math.max(progressPercent, 5)}%` }}
                            />
                        </div>
                    )}

                    {/* Quality indicator (static) */}
                    <div className="absolute right-3 top-3 rounded-md glass px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest group-hover:opacity-0 transition-opacity">
                        {movie.quality}
                    </div>
                </div>

                <div className="mt-4 space-y-1.5 px-1 group-hover:opacity-0 transition-opacity">
                    <h3 className="line-clamp-1 text-sm font-bold text-white transition-colors group-hover:text-accent">
                        {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-text-muted">
                        <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-accent text-accent" />
                            {movie.rating}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-text-muted/30" />
                        <span>{movie.year}</span>
                        <span className="h-1 w-1 rounded-full bg-text-muted/30" />
                        <span className="capitalize">{movie.type}</span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
