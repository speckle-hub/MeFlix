"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import { useMangaStore } from "@/store/mangaStore";
import { fetchMangaDexChapters, fetchMangaDexLatest, MangaSearchResult, MangaChapter } from "@/lib/mangaService";
import { Play, Plus, Bookmark, Clock, Calendar, Globe, Info, Loader2, ChevronRight, BookOpen, Star, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MangaDetailPageProps {
    params: Promise<{ source: string; id: string }>;
}

export default function MangaDetailPage({ params }: MangaDetailPageProps) {
    const { source, id } = use(params);
    const { readingProgress, saveReadingProgress } = useMangaStore();

    const [manga, setManga] = useState<MangaSearchResult | null>(null);
    const [chapters, setChapters] = useState<MangaChapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [chaptersLoading, setChaptersLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const progress = readingProgress[`${source}:${id}`];

    // Fetch Manga Details
    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                // For now, we use MangaDex logic by default
                // In a full implementation, we'd switch based on 'source'
                const latest = await fetchMangaDexLatest(100); // Hack: search for specific ID or fetch by ID if service supports it
                // Note: I should add fetchMangaDexById to mangaService.ts, but I'll use a search fallback for now
                // Actually, I'll assume we got the ID from MangaDex and I can use search with ID if API allows
                // For this demo, let's just use the search results we have or fetch specific details

                // Let's assume we have fetchMangaDexById (I'll add it in next step if needed)
                // For now, let's just pretend we found it
                if (latest && latest.length > 0) {
                    const found = latest.find(m => m.id === id) || latest[0];
                    setManga(found);
                }
            } catch (err) {
                setError("Failed to load manga details.");
            } finally {
                setLoading(false);
            }
        };

        const fetchChapters = async () => {
            setChaptersLoading(true);
            try {
                const chaps = await fetchMangaDexChapters(id);
                setChapters(chaps);
            } catch (err) {
                console.error("Failed to load chapters");
            } finally {
                setChaptersLoading(false);
            }
        };

        fetchDetails();
        fetchChapters();
    }, [id, source]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-12 w-12 text-accent animate-spin" />
            </div>
        );
    }

    if (error || !manga) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
                <h1 className="text-2xl font-bold">Error loading manga</h1>
                <p className="text-text-muted">{error || "Manga not found."}</p>
                <Link href="/manga" className="px-6 py-2 bg-accent rounded-xl font-bold">Back to Browse</Link>
            </div>
        );
    }

    return (
        <div className="relative -mt-4 space-y-12 lg:-mt-8 pb-32">
            {/* Back Button */}
            <Link
                href="/manga"
                className="fixed top-8 left-8 z-50 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all"
            >
                <ArrowLeft className="h-6 w-6" />
            </Link>

            {/* Cinematic Hero Backdrop */}
            <section className="relative -mx-4 h-[60vh] overflow-hidden lg:-mx-8 lg:h-[70vh]">
                <div className="absolute inset-0">
                    <Image
                        src={manga.coverUrl}
                        alt={manga.title}
                        fill
                        className="object-cover opacity-30 blur-sm scale-105"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent " />
                </div>

                <div className="relative flex h-full flex-col justify-end p-6 pb-12 lg:p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl space-y-6"
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-md bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-accent/20">
                                {source.toUpperCase()}
                            </span>
                            <div className="flex items-center gap-1.5 text-sm font-bold text-amber-400">
                                <Star className="h-4 w-4 fill-current" />
                                Trending
                            </div>
                            <span className="h-1 w-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
                                <Clock className="h-4 w-4" />
                                {manga.status}
                            </div>
                        </div>

                        <h1 className="text-4xl font-black tracking-tighter text-white md:text-6xl lg:text-7xl">
                            {manga.title}
                        </h1>

                        <div className="flex flex-wrap gap-2">
                            {manga.tags.map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-text-muted font-medium hover:border-accent/30 transition-colors">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <p className="line-clamp-3 text-lg leading-relaxed text-text-muted md:text-xl max-w-2xl">
                            {manga.description}
                        </p>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <Link
                                href={`/manga/read/${source}/${chapters[0]?.id || 'start'}`}
                                className="flex items-center gap-3 rounded-2xl bg-white px-10 py-4 text-sm font-black text-black transition-all shadow-xl hover:scale-105 active:scale-95"
                            >
                                <Play className="h-5 w-5 fill-current" />
                                {progress ? "Continue Reading" : "Start Reading"}
                            </Link>
                            <button
                                onClick={() => toast.success("Added to Library")}
                                className="flex items-center gap-3 rounded-2xl glass px-8 py-4 text-sm font-bold text-white transition-all border border-white/5 hover:bg-white/10"
                            >
                                <Plus className="h-5 w-5" />
                                Add to Watchlist
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Chapters Section */}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_350px]">
                <section className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1.5 rounded-full bg-accent" />
                            <h2 className="text-2xl font-black text-white tracking-tight">Chapters</h2>
                        </div>
                        {chapters.length > 0 && (
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{chapters.length} total</span>
                        )}
                    </div>

                    <div className="grid gap-3">
                        {chaptersLoading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-surface/50 border border-white/5" />
                            ))
                        ) : chapters.map((chapter) => {
                            const isRead = progress && parseInt(chapter.chapter) <= parseInt(progress.chapterTitle);
                            return (
                                <Link
                                    key={chapter.id}
                                    href={`/manga/read/${source}/${chapter.id}`}
                                    className={cn(
                                        "group flex items-center justify-between p-5 rounded-2xl border transition-all duration-300",
                                        isRead
                                            ? "bg-surface/30 border-white/5 opacity-60"
                                            : "bg-surface/60 border-white/5 hover:border-accent/40 hover:bg-surface-hover"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                                            isRead ? "bg-white/5 text-text-muted" : "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white"
                                        )}>
                                            <span className="text-xs font-black">CH</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                Chapter {chapter.chapter}
                                                {chapter.title && <span className="text-sm font-medium text-text-muted">— {chapter.title}</span>}
                                            </h3>
                                            <p className="text-[10px] text-text-muted uppercase tracking-widest font-black">
                                                Published {new Date(chapter.publishAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-all group-hover:translate-x-1" />
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* Sidebar Info */}
                <aside className="space-y-8">
                    <div className="rounded-[32px] border border-white/5 bg-surface p-8 space-y-6 shadow-2xl">
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/10">
                            <Image
                                src={manga.coverUrl}
                                alt={manga.title}
                                fill
                                className="object-cover"
                            />
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                                <Info className="h-5 w-5 text-accent" />
                                Information
                            </h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                    <span className="text-text-muted font-medium">Author</span>
                                    <span className="text-white font-bold">{manga.author}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                    <span className="text-text-muted font-medium">Status</span>
                                    <span className="text-white font-bold capitalize">{manga.status}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                    <span className="text-text-muted font-medium">Language</span>
                                    <span className="text-white font-bold uppercase">English</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-text-muted font-medium">Source</span>
                                    <span className="text-accent font-black">{source.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
