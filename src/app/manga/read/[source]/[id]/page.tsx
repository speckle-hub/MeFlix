"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { fetchMangaDexPages } from "@/lib/mangaService";
import { useMangaStore } from "@/store/mangaStore";
import {
    ChevronLeft, ChevronRight, X, ArrowUpCircle,
    ArrowRightCircle, Maximize2, Minimize2, Loader2, BookOpen, List
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Drawer } from "vaul";

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
    const [showChapterSheet, setShowChapterSheet] = useState(false);

    const verticalRef = useRef<HTMLDivElement>(null);
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Screen Wake Lock ─────────────────────────────────────────────────────
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const acquireWakeLock = useCallback(async () => {
        if (!("wakeLock" in navigator)) return;
        try {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch {
            // Silently ignore — wake lock is best-effort
        }
    }, []);

    const releaseWakeLock = useCallback(() => {
        wakeLockRef.current?.release().catch(() => { });
        wakeLockRef.current = null;
    }, []);

    useEffect(() => {
        acquireWakeLock();
        const handleVisibility = () => {
            if (document.visibilityState === "visible") acquireWakeLock();
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            releaseWakeLock();
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [acquireWakeLock, releaseWakeLock]);

    // ── Fetch Pages ──────────────────────────────────────────────────────────
    useEffect(() => {
        const loadPages = async () => {
            setIsLoading(true);
            try {
                const imgUrls = await fetchMangaDexPages(id);
                setPages(imgUrls);
            } catch {
                console.error("Reader failed to load pages");
            } finally {
                setIsLoading(false);
            }
        };
        loadPages();
    }, [id]);

    // ── Progress Tracking ────────────────────────────────────────────────────
    useEffect(() => {
        if (pages.length > 0 && currentPage >= 0) {
            saveReadingProgress({
                mangaId: id,
                sourceId: source,
                chapterId: id,
                chapterTitle: "Current",
                page: currentPage,
                lastRead: Date.now(),
                title: "Chapter " + (currentPage + 1),
                poster: pages[0] || ""
            });
        }
    }, [currentPage, pages.length]);

    // ── Keyboard Navigation ──────────────────────────────────────────────────
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
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    // ── Controls visibility with auto-hide ───────────────────────────────────
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => setShowControls(false), 3500);
    }, []);

    // ── Tap Zone handler ─────────────────────────────────────────────────────
    // Zones: 30% left → prev  |  40% center → toggle controls  |  30% right → next
    const handleTapZone = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const xRatio = (e.clientX - rect.left) / rect.width;

        if (xRatio < 0.30) {
            prev();
            showControlsTemporarily();
        } else if (xRatio > 0.70) {
            next();
            showControlsTemporarily();
        } else {
            // Center: toggle controls
            setShowControls(prev => !prev);
            if (!showControls) showControlsTemporarily();
        }
    };

    const progressPercent = pages.length > 0
        ? ((currentPage + 1) / pages.length) * 100
        : 0;

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
        <>
            {/* ── Fixed Thin Top Progress Bar (always visible) ─────────────── */}
            <div
                className="fixed top-0 left-0 right-0 z-[80] h-1 bg-white/10"
                style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
                <motion.div
                    className="h-full bg-accent"
                    initial={false}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                />
            </div>

            <div className="fixed inset-0 z-[60] bg-black overflow-hidden select-none">
                {/* Immersive background blur */}
                {pages[0] && (
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <img src={pages[0]} alt="" className="w-full h-full object-cover blur-[100px]" aria-hidden />
                    </div>
                )}

                {/* ── Reader Canvas ─────────────────────────────────────────── */}
                <div
                    className={cn(
                        "h-full w-full custom-scrollbar",
                        readingMode === 'vertical' ? "overflow-y-auto" : "flex items-center justify-center"
                    )}
                    ref={verticalRef}
                >
                    {readingMode === 'vertical' ? (
                        /* ── Vertical / Webtoon mode — no tap zones, scroll naturally ── */
                        <div
                            className="max-w-3xl mx-auto space-y-0 relative"
                            onClick={showControlsTemporarily}
                        >
                            {pages.map((url, idx) => (
                                <div key={url} className="relative w-full">
                                    <img
                                        src={url}
                                        alt={`Page ${idx + 1}`}
                                        className="w-full h-auto pointer-events-none"
                                        loading={idx < 3 ? "eager" : "lazy"}
                                    />
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
                        /* ── Horizontal / Paged mode — 30/40/30 tap zones ────── */
                        <div
                            className="relative h-full w-full flex items-center justify-center"
                            onClick={handleTapZone}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentPage}
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.03 }}
                                    transition={{ duration: 0.25 }}
                                    className="relative max-h-screen w-auto max-w-full pointer-events-none"
                                >
                                    <img
                                        src={pages[currentPage]}
                                        alt={`Page ${currentPage + 1}`}
                                        className="max-h-screen w-auto object-contain"
                                    />
                                </motion.div>
                            </AnimatePresence>

                            {/* Visible tap-zone hint arrows (shown briefly when controls are visible) */}
                            <AnimatePresence>
                                {showControls && currentPage > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 0.3, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                                    >
                                        <ChevronLeft className="w-10 h-10 text-white" />
                                    </motion.div>
                                )}
                                {showControls && currentPage < pages.length - 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 0.3, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                                    >
                                        <ChevronRight className="w-10 h-10 text-white" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* ── Floating Top Controls ──────────────────────────────────── */}
                <AnimatePresence>
                    {showControls && (
                        <motion.header
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="fixed inset-x-0 top-0 z-[70] flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-gradient-to-b from-black/70 to-transparent pointer-events-auto"
                        >
                            <button
                                onClick={() => router.back()}
                                className="p-3.5 rounded-2xl glass text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="flex items-center gap-2 p-1.5 rounded-2xl glass border border-white/5">
                                <button
                                    onClick={() => setReadingMode('vertical')}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all",
                                        readingMode === 'vertical' ? "bg-accent text-white" : "text-text-muted hover:text-white"
                                    )}
                                >
                                    <ArrowUpCircle className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setReadingMode('horizontal')}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all",
                                        readingMode === 'horizontal' ? "bg-accent text-white" : "text-text-muted hover:text-white"
                                    )}
                                >
                                    <ArrowRightCircle className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Chapter list sheet trigger */}
                                <button
                                    onClick={() => setShowChapterSheet(true)}
                                    className="p-3.5 rounded-2xl glass text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90"
                                >
                                    <List className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={toggleFullscreen}
                                    className="p-3.5 rounded-2xl glass text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90"
                                >
                                    {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                                </button>
                            </div>
                        </motion.header>
                    )}
                </AnimatePresence>

                {/* ── Floating Bottom Page Counter ───────────────────────────── */}
                <AnimatePresence>
                    {showControls && (
                        <motion.footer
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed bottom-0 inset-x-0 z-[70] flex flex-col items-center gap-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"
                        >
                            <div className="px-5 py-2 rounded-2xl glass border border-white/10 text-xs font-black text-white uppercase tracking-widest shadow-2xl">
                                Page {currentPage + 1} <span className="text-text-muted mx-1">/</span> {pages.length}
                            </div>
                        </motion.footer>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Chapter / Page Selection Bottom Sheet ─────────────────────── */}
            <Drawer.Root open={showChapterSheet} onOpenChange={(open) => !open && setShowChapterSheet(false)} shouldScaleBackground={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[100] flex max-h-[70vh] flex-col rounded-t-[28px] bg-zinc-900 border-t border-white/10 outline-none">
                        <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-white/10" />
                        <div className="p-5 pb-2 flex items-center justify-between shrink-0">
                            <h2 className="text-base font-bold text-white">Jump to Page</h2>
                            <button
                                onClick={() => setShowChapterSheet(false)}
                                className="p-2 rounded-full bg-white/5 text-zinc-400 active:scale-90"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-2 custom-scrollbar">
                            <div className="grid grid-cols-5 gap-2 py-2">
                                {pages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setCurrentPage(idx);
                                            setShowChapterSheet(false);
                                        }}
                                        className={cn(
                                            "rounded-xl py-2.5 text-sm font-bold transition-all",
                                            currentPage === idx
                                                ? "bg-accent text-white shadow-lg shadow-accent/20"
                                                : "bg-white/5 hover:bg-white/10 text-zinc-300"
                                        )}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Safe area + BottomNav spacer */}
                        <div className="h-[calc(80px+env(safe-area-inset-bottom))] shrink-0" />
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </>
    );
}

// ── Inline CheckCircle icon ───────────────────────────────────────────────────
function CheckCircle2({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24"
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
    );
}
