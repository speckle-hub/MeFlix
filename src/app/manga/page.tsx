"use client";

import { useState, useEffect, useMemo } from "react";
import { useMangaStore } from "@/store/mangaStore";
import { searchMangaDex, fetchMangaDexLatest, MangaSearchResult } from "@/lib/mangaService";
import { BookOpen, Search, Loader2, ShieldAlert, Filter, ChevronRight, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ContentGridSkeleton } from "@/components/ui/Skeleton";

export default function MangaPage() {
    const { installedSources } = useMangaStore();
    const [activeTab, setActiveTab] = useState<'manga' | 'adult'>('manga');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSourceId, setSelectedSourceId] = useState<string>("mangadex"); // Default to MangaDex logic if no sources
    const [manga, setManga] = useState<MangaSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter installed sources based on tab
    const filteredSources = useMemo(() => {
        const enabled = installedSources.filter(s => s.isEnabled);
        const tabSources = enabled.filter(s =>
            activeTab === 'adult' ? s.nsfw === 1 : s.nsfw === 0
        );
        // Always include a virtual "MangaDex" or "Global" if it's the regular tab
        if (activeTab === 'manga' && !tabSources.some(s => s.id === 'mangadex')) {
            return [{ id: 'mangadex', name: 'MangaDex', nsfw: 0, pkg: 'mangadex' }, ...tabSources];
        }
        return tabSources;
    }, [installedSources, activeTab]);

    // Initial fetch
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                if (searchQuery) {
                    const results = await searchMangaDex(searchQuery);
                    setManga(results.filter(m => activeTab === 'adult' ? m.isAdult : !m.isAdult));
                } else {
                    const results = await fetchMangaDexLatest(24, activeTab === 'adult');
                    setManga(results);
                }
            } catch (err) {
                console.error("[MangaPage] Fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchData, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [searchQuery, activeTab, selectedSourceId]);

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* SEO Head (Virtual) */}
            <title>Browse Manga - MeFlix</title>
            <meta name="description" content="Explore a vast library of manga and comics from various sources." />

            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-[40px] bg-surface/30 p-8 border border-white/5 lg:p-12">
                <div className="absolute top-0 right-0 -m-20 h-96 w-96 rounded-full bg-accent/20 blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 left-0 -m-20 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-accent">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                            >
                                <BookOpen className="h-6 w-6" />
                            </motion.div>
                            <span className="text-sm font-black uppercase tracking-[0.2em]">Manga Library</span>
                        </div>
                        <h1 className="text-5xl font-black text-white lg:text-7xl tracking-tighter">
                            Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">Stories</span>
                        </h1>
                        <p className="max-w-xl text-lg text-text-muted font-medium leading-relaxed">
                            Dive into high-quality manga from global sources. Whether you prefer vertical webtoons or classic horizontal layouts, we've got you covered.
                        </p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex p-1.5 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-xl">
                        <button
                            onClick={() => setActiveTab('manga')}
                            className={cn(
                                "flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all",
                                activeTab === 'manga' ? "bg-accent text-white shadow-xl shadow-accent/20" : "text-text-muted hover:text-white"
                            )}
                        >
                            Manga
                        </button>
                        <button
                            onClick={() => setActiveTab('adult')}
                            className={cn(
                                "flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all",
                                activeTab === 'adult' ? "bg-red-500 text-white shadow-xl shadow-red-500/20" : "text-text-muted hover:text-white"
                            )}
                        >
                            Adult Manga
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="sticky top-4 z-40 space-y-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1 group">
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-accent/20 to-purple-500/20 blur opacity-75 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative flex items-center bg-surface/80 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-4 shadow-2xl">
                        <Search className="h-5 w-5 text-text-muted group-focus-within:text-accent transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search thousands of titles..."
                            className="bg-transparent border-none focus:ring-0 text-white placeholder-text-muted w-full px-4 font-medium"
                        />
                        {isLoading && <Loader2 className="h-5 w-5 text-accent animate-spin" />}
                    </div>
                </div>

                {/* Source Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth px-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-text-muted">
                        <Filter className="h-3.5 w-3.5" />
                        Sources:
                    </div>
                    {filteredSources.map(source => (
                        <button
                            key={source.id}
                            onClick={() => setSelectedSourceId(source.id)}
                            className={cn(
                                "whitespace-nowrap px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all",
                                selectedSourceId === source.id
                                    ? "bg-accent/20 border-accent/40 text-accent shadow-lg shadow-accent/5"
                                    : "bg-surface/50 border-white/5 text-text-muted hover:border-white/20"
                            )}
                        >
                            {source.name}
                        </button>
                    ))}
                    {filteredSources.length === 0 && (
                        <Link href="/settings/addons" className="text-xs text-accent hover:underline font-bold flex items-center gap-1 shrink-0">
                            Add Sources <ChevronRight className="h-3 w-3" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            {searchQuery ? `Results for "${searchQuery}"` : "Trending Read"}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-text-muted" />
                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{manga.length} Titles</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-[2/3] w-full animate-pulse rounded-3xl bg-surface/50" />
                                <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface/50" />
                                <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface/30" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {manga.length > 0 ? (
                            <motion.div
                                layout
                                className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                            >
                                {manga.map((item, idx) => (
                                    <MangaCard key={item.id} manga={item} index={idx} sourceId={selectedSourceId} />
                                ))}
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                <div className="p-6 rounded-full bg-surface/50 border border-white/5">
                                    <BookOpen className="h-12 w-12 text-text-muted opacity-20" />
                                </div>
                                <p className="text-text-muted font-medium text-lg italic">No stories found here. Try another shelf.</p>
                            </div>
                        )}
                    </AnimatePresence>
                )}
            </section>
        </div>
    );
}

function MangaCard({ manga, index, sourceId }: { manga: MangaSearchResult, index: number, sourceId: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.6 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative"
        >
            <Link href={`/manga/${sourceId}/${manga.id}`}>
                <div className="relative aspect-[2/3] overflow-hidden rounded-[2rem] bg-surface transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(var(--app-accent-rgb),0.2)]">
                    <Image
                        src={manga.coverUrl || "https://images.unsplash.com/photo-1578632738980-230555099dad?q=80&w=600&auto=format&fit=crop"}
                        alt={manga.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5">
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">{manga.title}</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {manga.tags.slice(0, 2).map(tag => (
                                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-black uppercase">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tags / Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {manga.status === "ongoing" && (
                            <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border border-emerald-400/20 shadow-lg shadow-emerald-500/20">
                                Updating
                            </span>
                        )}
                        {manga.isAdult && (
                            <span className="bg-red-500/20 text-red-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-red-500/20 backdrop-blur-md">
                                18+
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-4 px-2 space-y-1 group-hover:opacity-0 transition-all">
                    <h3 className="text-sm font-bold text-white line-clamp-1 truncate group-hover:text-accent transition-colors">{manga.title}</h3>
                    <p className="text-xs text-text-muted font-medium">{manga.author}</p>
                </div>
            </Link>
        </motion.div>
    );
}
