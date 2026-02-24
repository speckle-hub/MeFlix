"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, Filter, LayoutGrid, ListFilter, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import BottomSheet from "./BottomSheet";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const GENRES = ["All", "Action", "Comedy", "Drama", "Sci-Fi", "Horror", "Anime", "Thriller", "Adventure"];
const TYPES = ["All", "Movie", "Series"];
const SORT_OPTIONS = [
    { label: "Trending", value: "trending" },
    { label: "Popularity", value: "popularity" },
    { label: "Release Date", value: "year" },
    { label: "Rating", value: "rating" },
];

export default function FilterBar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const isMobile = useMediaQuery("(max-width: 768px)");

    const [isOptionsOpen, setIsOptionsOpen] = useState(false);

    const currentGenre = searchParams.get("genre") || "All";
    const currentType = searchParams.get("type") || "All";
    const currentSort = searchParams.get("sort") || "trending";

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "All" || !value) {
            params.delete(key);
        } else {
            params.set(key, value.toLowerCase());
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        router.push(pathname);
    };

    const hasFilters = searchParams.toString().length > 0;

    return (
        <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-8 bg-background/80 px-4 py-4 backdrop-blur-xl border-b border-white/5 lg:-mx-8 lg:-mt-8 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Genre Fast Nav */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
                    <div className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-text-muted">
                        <Filter className="h-4 w-4" />
                    </div>
                    {GENRES.map((genre) => (
                        <button
                            key={genre}
                            onClick={() => updateFilters("genre", genre)}
                            className={cn(
                                "whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all",
                                currentGenre.toLowerCase() === genre.toLowerCase()
                                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                                    : "bg-surface text-text-muted hover:bg-surface-hover hover:text-white"
                            )}
                        >
                            {genre}
                        </button>
                    ))}
                </div>

                {/* More Options Trigger */}
                <div className="flex items-center gap-2">
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-text-muted hover:bg-white/10 hover:text-white transition-all mr-2"
                        >
                            <X className="h-3 w-3" /> <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                        className={cn(
                            "flex items-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-surface-hover border border-white/5",
                            isOptionsOpen && "bg-surface-hover border-accent/20"
                        )}
                    >
                        {isMobile ? <SlidersHorizontal className="h-4 w-4" /> : <ListFilter className="h-4 w-4" />}
                        <span className="hidden sm:inline">Options</span>
                        {!isMobile && <ChevronDown className={cn("h-4 w-4 transition-transform", isOptionsOpen && "rotate-180")} />}
                    </button>
                </div>
            </div>

            {/* Expanded Options (Desktop Only) */}
            <AnimatePresence>
                {!isMobile && isOptionsOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 grid grid-cols-1 gap-6 rounded-2xl bg-surface/50 p-6 border border-white/5 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Type Filter */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Content Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {TYPES.map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => updateFilters("type", type)}
                                            className={cn(
                                                "rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all border",
                                                currentType.toLowerCase() === type.toLowerCase()
                                                    ? "bg-white text-black border-white"
                                                    : "bg-white/5 text-text-muted border-white/5 hover:bg-white/10 hover:text-white"
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sort Filter */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Sort By</label>
                                <div className="flex flex-wrap gap-2">
                                    {SORT_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateFilters("sort", opt.value)}
                                            className={cn(
                                                "rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all border",
                                                currentSort.toLowerCase() === opt.value.toLowerCase()
                                                    ? "bg-white text-black border-white"
                                                    : "bg-white/5 text-text-muted border-white/5 hover:bg-white/10 hover:text-white"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Layout Indicator */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Grid Style</label>
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-2 rounded-xl bg-white text-black px-3 py-1.5 text-[11px] font-bold border border-white">
                                        <LayoutGrid className="h-3 w-3" /> Standard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Bottom Sheet Options */}
            {isMobile && (
                <BottomSheet
                    isOpen={isOptionsOpen}
                    onOpenChange={setIsOptionsOpen}
                    title="Filter & Sort"
                    description="Refine your content discovery"
                >
                    <div className="space-y-8 pb-8">
                        {/* Type Filter */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Content Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {TYPES.map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => { updateFilters("type", type); setIsOptionsOpen(false); }}
                                        className={cn(
                                            "rounded-2xl py-4 text-xs font-bold transition-all border",
                                            currentType.toLowerCase() === type.toLowerCase()
                                                ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                                                : "bg-white/5 text-text-muted border-white/5"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort Filter */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Sort By</label>
                            <div className="grid grid-cols-2 gap-2">
                                {SORT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { updateFilters("sort", opt.value); setIsOptionsOpen(false); }}
                                        className={cn(
                                            "rounded-2xl py-4 text-xs font-bold transition-all border",
                                            currentSort.toLowerCase() === opt.value.toLowerCase()
                                                ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                                                : "bg-white/5 text-text-muted border-white/5"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsOptionsOpen(false)}
                            className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm shadow-xl"
                        >
                            Apply Filters
                        </button>
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
