"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import { useMetadata } from "@/hooks/useMetadata";
import { Play, Plus, Star, Clock, Calendar, Globe, Info, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { ContentGridSkeleton } from "@/components/ui/Skeleton";
import ContentGrid from "@/components/ui/ContentGrid";
import { SeasonSelector } from "@/components/media/SeasonSelector";
import { StreamSelector } from "@/components/media/StreamSelector";
import VideoPlayer from "@/components/ui/VideoPlayer";
import { StremioStream } from "@/types/stremio";
import { EpisodeAccordion } from "@/components/media/EpisodeAccordion";

/** Context stored in sessionStorage by various pages to provide metadata and source tracking */
interface ContentContext {
    id: string;
    name: string;
    poster: string;
    background: string;
    type: string;
    description: string;
    genres: string[];
    addonBaseUrl: string;
    addonId?: string;
    isNSFW?: boolean;
}

interface MetaPageProps {
    params: Promise<{ type: string; id: string }>;
}

export default function MetaPage({ params }: MetaPageProps) {
    const { type, id: rawId } = use(params);
    // For series, extract base ID (e.g. tt0903747) from full ID (e.g. tt0903747:1:1)
    const id = type === 'series' && rawId.includes(':') ? rawId.split(':')[0] : rawId;

    const [activeStream, setActiveStream] = useState<StremioStream | null>(null);
    const [showSelector, setShowSelector] = useState(false);
    const [showSeasonSelector, setShowSeasonSelector] = useState(false);
    const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
    const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
    const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);

    // 1. Read content context (metadata + source addon info) early if available
    const [nsfwFallback, setNsfwFallback] = useState<ContentContext | null>(null);
    const [sourceAddonBaseUrl, setSourceAddonBaseUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        try {
            const raw = typeof window !== 'undefined'
                ? (sessionStorage.getItem('content_context') || sessionStorage.getItem('nsfw_meta_fallback'))
                : null;

            if (raw) {
                const parsed: ContentContext = JSON.parse(raw);
                const pageId = decodeURIComponent(id);
                const storedId = decodeURIComponent(parsed.id);

                console.log('[META] Found content context:', { storedId, pageId, addonId: parsed.addonId, addonBaseUrl: parsed.addonBaseUrl });

                if (storedId === pageId || parsed.id === id || parsed.id === pageId) {
                    setNsfwFallback(parsed);
                    setSourceAddonBaseUrl(parsed.addonBaseUrl);
                    console.info('[META] Applied directed fetch context for:', parsed.name);
                }
            }
        } catch (err) {
            console.error('[META] Content context error:', err);
        }
    }, [id]);

    const { data: meta, loading, error } = useMetadata(type, id, sourceAddonBaseUrl);

    // Cleanup context when leaving the page to avoid stale data impacting other routes
    useEffect(() => {
        return () => {
            console.log('[META] Cleaning up content context');
            sessionStorage.removeItem('content_context');
            sessionStorage.removeItem('nsfw_meta_fallback');
        };
    }, []);

    const handleWatchNow = () => {
        // Bypass season selector if we are in fallback mode (no episode data)
        const hasVideos = (meta?.videos?.length ?? 0) > 0;
        if (type === "series" && !nsfwFallback && hasVideos) {
            // On mobile, we might want to scroll to the accordion instead of opening the modal
            if (window.innerWidth < 768) {
                const element = document.getElementById('episodes-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                    return;
                }
            }
            setShowSeasonSelector(true);
        } else {
            console.log('[META] Skipping season selector for NSFW/Fallback content');
            setShowSelector(true);
        }
    };

    const handleEpisodeSelect = (season: number, episode: number, epId: string) => {
        setSelectedEpisodeId(epId);
        setSelectedSeason(season);
        setSelectedEpisode(episode);
        setShowSeasonSelector(false);
        setShowSelector(true);
    };

    const handleStreamSelect = (stream: StremioStream) => {
        setShowSelector(false);
        setActiveStream(stream);
    };

    // Graceful fallback cascade:
    // 1. Real metadata from addons (best)
    // 2. Catalog snapshot from NSFW page (stored in sessionStorage before navigation)
    // 3. Generic placeholder (last resort)

    // Explicitly check for valid meta name
    const hasValidMeta = !!(
        meta &&
        meta.name &&
        meta.name !== "Content Details Unavailable" &&
        meta.name !== "Untitled" &&
        meta.name !== "null" &&
        meta.name.trim().length > 0
    );

    // Choose the best meta info available
    const activeMeta = hasValidMeta ? meta : (nsfwFallback ? {
        id: nsfwFallback.id,
        type: nsfwFallback.type,
        name: nsfwFallback.name,
        poster: nsfwFallback.poster,
        background: nsfwFallback.background || nsfwFallback.poster,
        description: nsfwFallback.description || 'No description available.',
        genres: nsfwFallback.genres,
        isNSFW: true,
    } : {
        id,
        type,
        name: "Content Details Unavailable",
        poster: "",
        background: "",
        description: "Metadata could not be found for this content. You can still try to find streams below.",
    });

    // DEBUG LOG: See what we chose and why
    useEffect(() => {
        if (!loading) {
            console.log('[META] Current Display State:', {
                usingRealMeta: hasValidMeta,
                hasNsfwFallback: !!nsfwFallback,
                chosenName: activeMeta.name,
                metaAvailable: !!meta
            });
        }
    }, [hasValidMeta, nsfwFallback, activeMeta.name, loading, meta]);

    const isFallback = !hasValidMeta;
    const canShowContent = hasValidMeta || !!nsfwFallback;

    if (loading && !canShowContent) {
        return (
            <div className="space-y-12 py-10">
                <div className="aspect-video w-full animate-pulse rounded-3xl bg-surface" />
                <ContentGridSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
                <h1 className="text-2xl font-bold">Error loading content</h1>
                <p className="text-text-muted">{error}</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-accent rounded-xl font-bold">Retry</button>
            </div>
        );
    }


    return (
        <div className="relative -mt-4 space-y-12 lg:-mt-8">
            {/* Back Button (Mobile) */}
            <Link
                href="/"
                className="fixed top-[calc(env(safe-area-inset-top)+1rem)] left-4 z-[60] p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all active:scale-90 md:hidden"
            >
                <ArrowLeft className="h-6 w-6" />
            </Link>

            {/* Season Selector Modal */}
            {showSeasonSelector && activeMeta && (
                <SeasonSelector
                    meta={activeMeta as any}
                    onEpisodeSelect={handleEpisodeSelect}
                    onClose={() => setShowSeasonSelector(false)}
                    onFallbackSearch={() => {
                        setShowSeasonSelector(false);
                        setShowSelector(true);
                    }}
                />
            )}

            {/* Stream Selector Modal */}
            {showSelector && activeMeta && (
                <StreamSelector
                    type={activeMeta.type as "movie" | "series"}
                    id={selectedEpisodeId || activeMeta.id || id}
                    title={activeMeta.name}
                    onSelect={handleStreamSelect}
                    onClose={() => setShowSelector(false)}
                />
            )}

            {/* Video Player Modal/Overlay */}
            <AnimatePresence>
                {activeStream && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-0 lg:p-12"
                    >
                        <div className="w-full h-full lg:h-auto lg:max-w-6xl shadow-2xl shadow-accent/20">
                            <VideoPlayer
                                url={activeStream.url || ""}
                                title={activeMeta.name || "Untitled"}
                                id={selectedEpisodeId || activeMeta.id || ""}
                                type={activeMeta.type || "movie"}
                                poster={activeMeta.poster || ""}
                                season={selectedSeason || undefined}
                                episode={selectedEpisode || undefined}
                                episodeTitle={activeMeta.videos?.find((v: any) => v.id === selectedEpisodeId)?.title}
                                isNSFW={!!activeMeta.isNSFW}
                                addonBaseUrl={activeStream.addonBaseUrl}
                                addonId={activeStream.addonId}
                                onClose={() => setActiveStream(null)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Cinematic Hero Backdrop */}
            {/* Cinematic Hero Backdrop */}
            <section className="relative -mx-4 h-[55vh] overflow-hidden lg:-mx-8 lg:h-[80vh]">
                {/* Backdrop Image */}
                <div className="absolute inset-0">
                    <Image
                        src={activeMeta.background || activeMeta.poster || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=2070&auto=format&fit=crop"}
                        alt={activeMeta.name || "Media Preview"}
                        fill
                        className="object-cover opacity-60 blur-[1px] lg:opacity-40"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent hidden lg:block" />
                </div>

                {/* Info Overlay */}
                <div className="relative flex h-full flex-col justify-end p-6 pb-12 lg:p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-3xl space-y-6"
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                                {activeMeta.type}
                            </span>
                            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                                <Star className="h-4 w-4 fill-current" />
                                {activeMeta.imdbRating || "N/A"}
                            </div>
                            <span className="h-1 w-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
                                <Calendar className="h-4 w-4" />
                                {activeMeta.year || activeMeta.releaseInfo}
                            </div>
                            {activeMeta.runtime && (
                                <>
                                    <span className="h-1 w-1 rounded-full bg-white/20" />
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
                                        <Clock className="h-4 w-4" />
                                        {activeMeta.runtime}
                                    </div>
                                </>
                            )}
                        </div>

                        <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl lg:text-7xl">
                            {activeMeta.name}
                        </h1>

                        <p className="hidden md:block line-clamp-3 text-base leading-relaxed text-text-muted md:text-xl lg:line-clamp-none lg:text-lg">
                            {activeMeta.description}
                        </p>

                        <div className="flex flex-col gap-3 py-4 md:flex-row md:gap-4 md:pt-4">
                            <div className="flex gap-3 w-full md:w-auto">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleWatchNow}
                                    className="flex grow items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-black text-black transition-all shadow-xl shadow-white/5 disabled:opacity-50 md:grow-0 md:py-4 md:text-sm min-h-[56px] min-w-[200px]"
                                >
                                    <Play className="h-5 w-5 fill-current" />
                                    {type === "series" ? "Episodes" : "Watch Now"}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex h-[56px] w-[56px] items-center justify-center rounded-2xl glass transition-all border border-white/5 md:hidden"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: activeMeta.name,
                                                text: `Check out ${activeMeta.name} on MeFlix!`,
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
                                        toast.success("Added to Watchlist");
                                    }}
                                >
                                    <Plus className="h-5 w-5" />
                                    <span className="md:inline">Watchlist</span>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                                    whileTap={{ scale: 0.98 }}
                                    className="hidden md:flex items-center justify-center gap-3 rounded-2xl glass px-8 py-4 text-sm font-black text-white transition-all border border-white/5 hover:bg-white/10"
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        toast.success("Link copied to clipboard");
                                    }}
                                >
                                    <Globe className="h-5 w-5" />
                                    Share
                                </motion.button>
                            </div>
                        </div>

                        {/* Mobile Description (After Actions) */}
                        <p className="block md:hidden text-sm leading-relaxed text-text-muted/90 line-clamp-4">
                            {activeMeta.description}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Details Sections */}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_300px]">
                <div className="space-y-12">
                    {/* Cast */}
                    {activeMeta.cast && activeMeta.cast.length > 0 && (
                        <section className="space-y-4">
                            <h2 className="text-xl font-black text-white px-1 lg:px-0">Top Cast</h2>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 lg:-mx-0 lg:px-0">
                                {activeMeta.cast.map((person) => (
                                    <div key={person} className="flex flex-col items-center gap-2 min-w-[80px]">
                                        <div className="h-16 w-16 rounded-full bg-surface-hover flex items-center justify-center text-accent ring-1 ring-white/5">
                                            <Globe className="h-8 w-8" />
                                        </div>
                                        <span className="text-center text-[10px] font-bold text-text-muted truncate w-20">{person}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Mobile Season/Episode Accordion */}
                    <div id="episodes-section" className="block lg:hidden">
                        {type === "series" && activeMeta && !isFallback && (
                            <EpisodeAccordion
                                meta={activeMeta}
                                onEpisodeSelect={handleEpisodeSelect}
                            />
                        )}
                    </div>

                    {/* More Details info boxes */}
                    <section className="grid gap-6 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/5 bg-surface/50 p-6 space-y-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Genres</h4>
                            <div className="flex flex-wrap gap-2">
                                {activeMeta.genres?.map(g => (
                                    <span key={g} className="text-sm font-medium text-white">{g}</span>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-surface/50 p-6 space-y-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Director</h4>
                            <p className="text-sm font-medium text-white">{activeMeta.director?.join(", ") || "Unknown"}</p>
                        </div>
                    </section>
                </div>

                {/* Sidebar Info (Optional Recommendations Placeholder) */}
                <aside className="space-y-8">
                    <div className="rounded-2xl border border-white/5 bg-surface p-6 space-y-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Info className="h-4 w-4 text-accent" />
                            Information
                        </h3>
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-text-muted">Status</span>
                                <span className="text-white font-medium">Released</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">Network</span>
                                <span className="text-white font-medium">Global</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">Country</span>
                                <span className="text-white font-medium">USA</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
