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
import { ChapterAccordion } from "@/components/media/ChapterAccordion";

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
                const latest = await fetchMangaDexLatest(100);
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
                <h1 className="text-2xl font-bold text-white">Error loading manga</h1>
                <p className="text-text-muted">{error || "Manga not found."}</p>
                <Link href="/manga" className="px-6 py-2 bg-accent rounded-xl font-bold text-white">Back to Browse</Link>
            </div>
        );
    }

    return (
        <div className="relative -mt-4 space-y-12 lg:-mt-8 pb-32 overflow-x-hidden">
            {/* Back Button */}
            <Link
                href="/manga"
                className="fixed top-[calc(env(safe-area-inset-top)+1rem)] left-4 md:top-8 md:left-8 z-[60] p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all active:scale-90"
            >
                <ArrowLeft className="h-6 w-6" />
            </Link>

            {/* Cinematic Hero Backdrop */}
            <section className="relative -mx-4 h-[50vh] overflow-hidden lg:-mx-8 lg:h-[70vh]">
                <div className="absolute inset-0">
                    <Image
                        src={manga.coverUrl}
                        alt={manga.title}
                        fill
                        className="object-cover opacity-50 blur-[2px] scale-105"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent hidden lg:block" />
                </div>

                <div className="relative flex h-full flex-col justify-end p-6 pb-12 lg:p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl space-y-6"
                    >
                        {/* Mobile Poster Card (Native Feel) */}
                        <div className="flex md:hidden justify-start mb-4">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative aspect-[2/3] w-32 overflow-hidden rounded-xl border border-white/10 shadow-2xl"
                            >
                                <Image
                                    src={manga.coverUrl}
                                    alt={manga.title}
                                    fill
                                    className="object-cover"
                                />
                            </motion.div>
                        </div>
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
                                <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <p className="hidden md:block line-clamp-3 text-base leading-relaxed text-text-muted md:text-xl max-w-2xl lg:text-lg">
                            {manga.description}
                        </p>

                        <div className="flex flex-col gap-3 py-4 md:flex-row md:gap-4 md:pt-4">
                            <div className="flex gap-3 w-full md:w-auto">
                                <Link
                                    href={`/manga/read/${source}/${chapters[0]?.id || 'start'}`}
                                    className="flex grow items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-black text-black transition-all shadow-xl shadow-white/5 md:grow-0 md:py-4 md:text-sm min-h-[56px] min-w-[200px]"
                                >
                                    <BookOpen className="h-5 w-5 fill-current" />
                                    {progress ? "Continue Reading" : "Start Reading"}
                                </Link>

                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex h-[56px] w-[56px] items-center justify-center rounded-2xl glass transition-all border border-white/5 md:hidden"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: manga.title,
                                                text: `Read ${manga.title} on MeFlix!`,
                                                url: window.location.href,
                                            }).catch(() => { });
                                        } else {
                                            navigator.clipboard.writeText(window.location.href);
                                            toast.success("Link copied to clipboard");
                                        }
                                    }}
                                >
                                    <Globe className="h-6 w-6" />
                                </motion.button>
                            </div>

                            <div className="flex gap-3 w-full md:w-auto">
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex grow items-center justify-center gap-3 rounded-2xl glass px-8 py-4 text-base font-black text-white transition-all border border-white/5 md:grow-0 md:py-4 md:text-sm min-h-[56px]"
                                    onClick={() => {
                                        toast.success("Added to Library");
                                    }}
                                >
                                    <Plus className="h-5 w-5" />
                                    Library
                                </motion.button>
                            </div>
                        </div>

                        {/* Mobile Description (After Actions) */}
                        <p className="block md:hidden text-sm leading-relaxed text-text-muted/90 line-clamp-4">
                            {manga.description}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Content Section */}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_350px]">
                <section className="space-y-8">
                    <div className="flex items-center justify-between px-1 lg:px-0">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1.5 rounded-full bg-accent" />
                            <h2 className="text-2xl font-black text-white tracking-tight">Chapters</h2>
                        </div>
                        {chapters.length > 0 && (
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{chapters.length} total</span>
                        )}
                    </div>

                    <div className="px-1 lg:px-0">
                        {chaptersLoading ? (
                            <div className="grid gap-3">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-surface/50 border border-white/5" />
                                ))}
                            </div>
                        ) : (
                            <ChapterAccordion chapters={chapters} progress={progress} source={source} />
                        )}
                    </div>
                </section>

                {/* Sidebar Info */}
                <aside className="space-y-8 px-1 lg:px-0">
                    <div className="rounded-[32px] border border-white/5 bg-surface p-8 space-y-6 shadow-2xl">
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
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
