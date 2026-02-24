"use client";

import { use, useState, useEffect, useRef } from "react";
import { fetchMangaDexPages } from "@/lib/mangaService";
import { useMangaStore } from "@/store/mangaStore";
import {
    ChevronLeft,
    ChevronRight,
    X,
    Settings,
    ArrowUpCircle,
    ArrowRightCircle,
    Maximize2,
    Minimize2,
    Loader2,
    BookOpen
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface MangaReaderProps {
    params: Promise<{ source: string; id: string }>;
}

type ReadingMode = 'vertical' | 'horizontal';

export default function MangaReaderPage({ params }: MangaReaderProps) {
    const { source, id } = use(params);
    const router = useRouter();
    const { saveReadingProgress } = useMangaStore();

    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [readingMode, setReadingMode] = useState<ReadingMode>('vertical');
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const verticalRef = useRef<HTMLDivElement>(null);

    // Fetch Pages
    useEffect(() => {
        const loadPages = async () => {
            setIsLoading(true);
            try {
                // For now, always use MangaDex logic
                const imgUrls = await fetchMangaDexPages(id);
                setPages(imgUrls);
            } catch (err) {
                console.error("Reader failed to load pages");
            } finally {
                setIsLoading(false);
            }
        };
        loadPages();
    }, [id]);

    // Handle Progress
    useEffect(() => {
        if (pages.length > 0 && currentPage >= 0) {
            saveReadingProgress({
                mangaId: id,
                sourceId: source,
                chapterId: id, // Mapping chapterId to id for now
                chapterTitle: "Current", // Placeholder
                page: currentPage,
                lastRead: Date.now(),
                title: "Chapter " + (currentPage + 1), // Optional: better title logic
                poster: pages[0] || "" // Use first page as poster
            });
        }
    }, [currentPage, pages.length]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'Escape') router.back();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, pages.length]);

    const next = () => {
        if (currentPage < pages.length - 1) setCurrentPage(p => p + 1);
    };

    const prev = () => {
        if (currentPage > 0) setCurrentPage(p => p - 1);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <div className="h-24 w-24 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                    <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-accent" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Loading Chapter</h2>
                    <p className="text-text-muted font-medium animate-pulse">Summoning pages from the void...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] bg-black overflow-hidden select-none">
            {/* Immersive Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <Image src={pages[0]} alt="background" fill className="object-cover blur-[100px]" />
            </div>

            {/* Reader Canvas */}
            <div
                className={cn(
                    "h-full w-full custom-scrollbar",
                    readingMode === 'vertical' ? "overflow-y-auto" : "flex items-center justify-center"
                )}
                onClick={() => setShowControls(!showControls)}
                ref={verticalRef}
            >
                {readingMode === 'vertical' ? (
                    <div className="max-w-3xl mx-auto space-y-0 relative">
                        {pages.map((url, idx) => (
                            <div key={url} className="relative w-full min-h-[50vh]">
                                <img
                                    src={url}
                                    alt={`Page ${idx + 1}`}
                                    className="w-full h-auto pointer-events-none"
                                    loading={idx < 3 ? "eager" : "lazy"}
                                />
                                {/* Invisible Intersection Trigger for Progress (Optional) */}
                            </div>
                        ))}
                        <div className="h-[50vh] flex flex-col items-center justify-center space-y-6 bg-surface/20 rounded-t-[40px] mt-12 backdrop-blur-md">
                            <div className="p-6 rounded-full bg-accent/20 text-accent">
                                <CheckCircle2 className="h-12 w-12" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">End of Chapter</h2>
                            <button
                                onClick={() => router.back()}
                                className="px-10 py-4 bg-accent text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all"
                            >
                                Back to Details
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative h-full w-full flex items-center justify-center group">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentPage}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                transition={{ duration: 0.3 }}
                                className="relative max-h-screen w-auto max-w-full"
                            >
                                <img
                                    src={pages[currentPage]}
                                    alt={`Page ${currentPage + 1}`}
                                    className="max-h-screen w-auto object-contain cursor-pointer"
                                />
                            </motion.div>
                        </AnimatePresence>

                        {/* Pagination Area Navigation */}
                        <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={(e) => { e.stopPropagation(); prev(); }} />
                        <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer" onClick={(e) => { e.stopPropagation(); next(); }} />
                    </div>
                )}
            </div>

            {/* Floating Top Controls */}
            <AnimatePresence>
                {showControls && (
                    <motion.header
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-8 inset-x-8 z-[70] flex items-center justify-between"
                    >
                        <button
                            onClick={() => router.back()}
                            className="p-4 rounded-2xl glass text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        <div className="flex items-center gap-2 p-1.5 rounded-2xl glass border border-white/5">
                            <button
                                onClick={() => setReadingMode('vertical')}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all",
                                    readingMode === 'vertical' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-white"
                                )}
                            >
                                <ArrowUpCircle className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setReadingMode('horizontal')}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all",
                                    readingMode === 'horizontal' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-white"
                                )}
                            >
                                <ArrowRightCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <button
                            onClick={toggleFullscreen}
                            className="p-4 rounded-2xl glass text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90"
                        >
                            {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
                        </button>
                    </motion.header>
                )}
            </AnimatePresence>

            {/* Floating Bottom Info & Progress */}
            <AnimatePresence>
                {showControls && (
                    <motion.footer
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 inset-x-8 z-[70] flex flex-col items-center gap-6"
                    >
                        <div className="px-6 py-3 rounded-2xl glass border border-white/10 text-xs font-black text-white uppercase tracking-[0.2em] shadow-2xl">
                            Page {currentPage + 1} <span className="text-text-muted mx-2">/</span> {pages.length}
                        </div>

                        <div className="w-full max-w-lg h-2 rounded-full bg-white/5 border border-white/5 overflow-hidden shadow-2xl">
                            <motion.div
                                className="h-full bg-accent"
                                initial={false}
                                animate={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
                            />
                        </div>
                    </motion.footer>
                )}
            </AnimatePresence>
        </div>
    );
}

// Utility icon for End of Chapter
function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
