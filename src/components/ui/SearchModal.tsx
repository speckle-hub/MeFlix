"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Command, Clock, ArrowRight, Film, Tv, PlaySquare, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchSearch } from "@/lib/stremioService";
import { useAddonStore } from "@/store/addonStore";
import { type Movie } from "@/lib/mockData";
import { StremioCatalogResponse } from "@/types/stremio";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const [results, setResults] = useState<{ movies: Movie[], series: Movie[], anime: Movie[] }>({
        movies: [],
        series: [],
        anime: []
    });
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [skips, setSkips] = useState({ movie: 0, series: 0, anime: 0 });
    const [hasMore, setHasMore] = useState({ movie: true, series: true, anime: true });
    const [history, setHistory] = useState<string[]>([]);
    const { addons } = useAddonStore();
    const inputRef = useRef<HTMLInputElement>(null);
    const observerTarget = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const isNSFWPage = pathname?.startsWith("/nsfw");

    // Load history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("meflix-search-history");
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    // Keyboard shortcut (CMD/CTRL + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                onClose();
            }
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery("");
            setResults({ movies: [], series: [], anime: [] });
            setSkips({ movie: 0, series: 0, anime: 0 });
            setHasMore({ movie: true, series: true, anime: true });
        }
    }, [isOpen]);

    const performSearch = useCallback(async (q: string, isLoadMore = false) => {
        if (!q.trim()) {
            setResults({ movies: [], series: [], anime: [] });
            setHasMore({ movie: true, series: true, anime: true });
            return;
        }

        if (isLoadMore) setLoadingMore(true);
        else {
            setLoading(true);
            setResults({ movies: [], series: [], anime: [] });
            setSkips({ movie: 0, series: 0, anime: 0 });
            setHasMore({ movie: true, series: true, anime: true });
        }

        try {
            // Filter addons by BOTH enabled status AND NSFW safety matching current page
            const filteredAddons = addons.filter(a => a.isEnabled && a.isNSFW === isNSFWPage);
            const types = ["movie", "series", "anime"];
            const currentSkips = isLoadMore ? skips : { movie: 0, series: 0, anime: 0 };

            console.log(`[SEARCH] Query: "${q}" | isNSFWPage: ${isNSFWPage} | Addons matching context: ${filteredAddons.length}`);
            if (filteredAddons.length === 0) {
                console.warn("[SEARCH] No addons found matching the current safety context.");
            }

            const promises = filteredAddons.flatMap(addon =>
                types.map(type => {
                    const skipVal = (currentSkips as any)[type];
                    // Skip if we already know there's no more for this type/addon combo?
                    // For simplicity, we fetch for all enabled addons
                    return fetchSearch(addon.url, type, q, isNSFWPage, skipVal).catch((err) => {
                        console.error(`[SEARCH] Addon ${addon.name} failed for ${type}:`, err);
                        return { metas: [] };
                    });
                })
            );

            const responses = await Promise.all(promises);
            console.log(`[SEARCH] Received ${responses.length} total responses from addon engines`);

            const newMovies: Movie[] = [];
            const newSeries: Movie[] = [];
            const newAnime: Movie[] = [];
            const seenIds = new Set(isLoadMore ? [...results.movies, ...results.series, ...results.anime].map(m => m.id) : []);

            responses.forEach((res, index) => {
                const catalogRes = res as StremioCatalogResponse;
                if (!catalogRes.metas || catalogRes.metas.length === 0) return;

                console.log(`[SEARCH] Response ${index} returned ${catalogRes.metas.length} results`);

                catalogRes.metas.forEach((meta) => {
                    if (!seenIds.has(meta.id)) {
                        seenIds.add(meta.id);
                        const item: Movie = {
                            id: meta.id,
                            title: meta.name,
                            description: meta.description || "",
                            poster: meta.poster || "",
                            backdrop: meta.background || "",
                            rating: meta.imdbRating || "N/A",
                            year: meta.year?.toString() || meta.releaseInfo || "",
                            type: meta.type as any,
                            quality: "HD",
                            isNSFW: meta.id.includes('nsfw') || (meta as any).isNSFW || false
                        };

                        if (item.type === "movie") newMovies.push(item);
                        else if (item.type === "series") newSeries.push(item);
                        else if (item.type === "anime") newAnime.push(item);
                    }
                });
            });

            console.log(`[SEARCH] Total results aggregated: movies=${newMovies.length}, series=${newSeries.length}, anime=${newAnime.length}`);

            setResults(prev => ({
                movies: isLoadMore ? [...prev.movies, ...newMovies] : newMovies,
                series: isLoadMore ? [...prev.series, ...newSeries] : newSeries,
                anime: isLoadMore ? [...prev.anime, ...newAnime] : newAnime,
            }));

            // Update skips and check for more
            if (isLoadMore) {
                setSkips(prev => ({
                    movie: prev.movie + (newMovies.length > 0 ? 20 : 0),
                    series: prev.series + (newSeries.length > 0 ? 20 : 0),
                    anime: prev.anime + (newAnime.length > 0 ? 20 : 0),
                }));
            } else {
                setSkips({
                    movie: newMovies.length > 0 ? 20 : 0,
                    series: newSeries.length > 0 ? 20 : 0,
                    anime: newAnime.length > 0 ? 20 : 0,
                });
            }

            setHasMore({
                movie: newMovies.length > 0,
                series: newSeries.length > 0,
                anime: newAnime.length > 0
            });

            // Save to history (only on initial search)
            if (!isLoadMore && (newMovies.length + newSeries.length + newAnime.length > 0)) {
                setHistory(prev => {
                    const newHistory = [q, ...prev.filter(h => h !== q)].slice(0, 5);
                    localStorage.setItem("meflix-search-history", JSON.stringify(newHistory));
                    return newHistory;
                });
            }
        } catch (err) {
            console.error("[SEARCH] Search failed:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [addons, isNSFWPage, skips, results]);

    // Infinite Scroll Observer
    useEffect(() => {
        if (!isOpen || loading || loadingMore || (!hasMore.movie && !hasMore.series && !hasMore.anime)) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && query.trim()) {
                console.log("[SEARCH] Intersection detected, loading more...");
                performSearch(query, true);
            }
        }, { threshold: 0.1 });

        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [isOpen, loading, loadingMore, hasMore, query, performSearch]);

    useEffect(() => {
        performSearch(debouncedQuery);
    }, [debouncedQuery, performSearch]);

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem("meflix-search-history");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center backdrop-blur-3xl bg-background/95 lg:bg-black/60 lg:backdrop-blur-xl lg:pt-[10vh] lg:px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) onClose();
                        }}
                        className="w-full h-full lg:h-auto lg:max-w-2xl overflow-hidden lg:rounded-3xl border-white/10 bg-surface shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col pt-[env(safe-area-inset-top)]"
                    >
                        {/* Search Input */}
                        <div className="relative flex items-center border-b border-white/5 p-6 min-h-[5rem]">
                            <Search className="h-6 w-6 text-text-muted" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search movies, TV shows, or anime..."
                                className="flex-1 bg-transparent px-4 text-xl font-bold text-white placeholder:text-text-muted focus:outline-none"
                            />
                            <div className="hidden lg:flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider border border-white/5">
                                <Command className="h-3 w-3" /> K
                            </div>
                            <button
                                onClick={onClose}
                                className="ml-4 rounded-full p-2 text-text-muted hover:bg-white/5 hover:text-white transition-all bg-white/5 lg:bg-transparent"
                            >
                                <X className="h-6 w-6 lg:h-5 lg:w-5" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                            {loading && !results.movies.length && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                                    <p className="text-sm text-text-muted">Searching all addons...</p>
                                </div>
                            )}

                            {/* Recommendations / History */}
                            {!query && (
                                <div className="space-y-10">
                                    {/* Recent History */}
                                    {history.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
                                                    <Clock className="h-4 w-4" /> Recent
                                                </h3>
                                                <button onClick={clearHistory} className="text-[10px] font-bold text-accent uppercase tracking-wider hover:underline">
                                                    Clear All
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-sm">
                                                {history.map((h) => (
                                                    <button
                                                        key={h}
                                                        onClick={() => setQuery(h)}
                                                        className="rounded-2xl bg-white/5 px-5 py-3 text-white hover:bg-white/10 transition-all border border-white/5 font-medium"
                                                    >
                                                        {h}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Trending / Recommended */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2 px-1">
                                            Trending Now
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {["Deadpool & Wolverine", "Inside Out 2", "The Boys", "House of the Dragon"].map((item) => (
                                                <button
                                                    key={item}
                                                    onClick={() => setQuery(item)}
                                                    className="flex items-center justify-between rounded-2xl bg-white/5 p-4 text-white hover:bg-white/10 transition-all border border-white/5 group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                                                            <Search className="h-5 w-5" />
                                                        </div>
                                                        <span className="font-bold">{item}</span>
                                                    </div>
                                                    <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* No Results */}
                            {query && !loading && !results.movies.length && !results.series.length && !results.anime.length && (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                    <div className="h-20 w-20 rounded-3xl bg-surface-hover flex items-center justify-center text-text-muted">
                                        <Search className="h-10 w-10" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-white">No results found</h3>
                                        <p className="text-sm text-text-muted max-w-xs mx-auto">Try searching for something else or check your installed addons.</p>
                                    </div>
                                </div>
                            )}

                            {/* Categorized Results */}
                            <div className="space-y-8">
                                <ResultSection title="Movies" icon={Film} results={results.movies} onClose={onClose} />
                                <ResultSection title="TV Series" icon={Tv} results={results.series} onClose={onClose} />
                                <ResultSection title="Anime" icon={PlaySquare} results={results.anime} onClose={onClose} />
                            </div>

                            {/* Infinite Scroll Load Indicator / Target */}
                            {(hasMore.movie || hasMore.series || hasMore.anime) && query && (
                                <div ref={observerTarget} className="h-20 flex items-center justify-center mt-4">
                                    {loadingMore ? (
                                        <div className="flex items-center gap-2 text-text-muted">
                                            <Loader2 className="h-4 w-4 animate-spin text-accent" />
                                            <span className="text-xs font-medium uppercase tracking-widest">Loading more...</span>
                                        </div>
                                    ) : (
                                        <div className="h-1 w-full" /> // Target for observer
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer - Only on Desktop */}
                        <div className="hidden lg:block border-t border-white/5 bg-surface-hover/50 p-4 px-6">
                            <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                                <div className="flex gap-4">
                                    <span className="flex items-center gap-1"><kbd className="bg-white/5 px-1 rounded border border-white/10 italic">Enter</kbd> to select</span>
                                    <span className="flex items-center gap-1"><kbd className="bg-white/5 px-1 rounded border border-white/10 italic">Esc</kbd> to close</span>
                                </div>
                                <div className="flex items-center gap-2 text-accent uppercase tracking-widest font-black text-[9px]">
                                    Unified MeFlix Search
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function ResultSection({ title, icon: Icon, results, onClose }: { title: string, icon: any, results: Movie[], onClose: () => void }) {
    if (results.length === 0) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                <Icon className="h-3 w-3" /> {title}
            </h3>
            <div className="grid gap-2">
                {results.map((item) => (
                    <Link
                        key={item.id}
                        href={`/meta/${item.type}/${item.id}`}
                        onClick={onClose}
                        className="group flex items-center gap-4 rounded-2xl border border-transparent bg-white/0 p-2 transition-all hover:bg-white/5 hover:border-white/5"
                    >
                        <div className="relative h-14 w-10 overflow-hidden rounded-lg bg-surface">
                            {item.poster && (
                                <Image
                                    src={item.poster}
                                    alt={item.title}
                                    fill
                                    className="object-cover"
                                />
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-white group-hover:text-accent transition-colors">{item.title}</h4>
                            <p className="text-xs text-text-muted">{item.year} • {item.rating} Rating</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
