"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";
import { useAddonStore } from "@/store/addonStore";
import { fetchNSFWContent, NSFWContentItem } from "@/lib/stremioService";
import type { StremioManifest } from "@/types/stremio";
import { ShieldAlert, Lock, Search, X, AlertTriangle, Play } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="animate-pulse rounded-xl overflow-hidden bg-white/5">
            <div className="aspect-[2/3] bg-white/10" />
            <div className="p-3 space-y-2">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-2.5 bg-white/5 rounded w-1/2" />
            </div>
        </div>
    );
}

// ─── Content Card ─────────────────────────────────────────────────────────────
function NSFWCard({ item, index, onClick }: { item: NSFWContentItem; index: number; onClick: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
            onClick={onClick}
            className="group cursor-pointer rounded-xl overflow-hidden bg-black/40 border border-white/5 hover:border-rose-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]"
        >
            <div className="relative aspect-[2/3] overflow-hidden">
                {item.poster ? (
                    <img
                        src={item.poster}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='150' viewBox='0 0 100 150'%3E%3Crect width='100' height='150' fill='%23111'/%3E%3Ctext x='50' y='80' text-anchor='middle' fill='%23444' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <ShieldAlert className="w-8 h-8 text-white/20" />
                    </div>
                )}
                {/* Hover overlay with play button */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-rose-500/80 backdrop-blur-sm flex items-center justify-center translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                </div>
            </div>
            <div className="p-3">
                <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{item.name}</p>
                {item.genres && item.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/20">
                            {item.genres[0]}
                        </span>
                    </div>
                )}
                <p className="text-[10px] text-white/30 mt-1.5 uppercase tracking-wide">{item.addonName}</p>
            </div>
        </motion.div>
    );
}

// ─── Age Gate ─────────────────────────────────────────────────────────────────
function AgeVerificationGate({ onConfirm }: { onConfirm: () => void }) {
    const router = useRouter();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative max-w-md w-full mx-4 rounded-2xl bg-[#111] border border-rose-500/30 p-8 text-center shadow-[0_0_60px_rgba(244,63,94,0.2)]"
            >
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-8 h-8 text-rose-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Adult Content</h2>
                <p className="text-white/60 mb-2">You are about to enter the adult content section.</p>
                <p className="text-white/80 font-semibold mb-8">You must be 18+ to view this content.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                    >
                        I am 18+ — Enter
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold transition-all duration-200 border border-white/10"
                    >
                        Go Back
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Locked Screen ────────────────────────────────────────────────────────────
function NSFWLockedScreen() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-sm w-full text-center space-y-6"
            >
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <Lock className="w-10 h-10 text-white/30" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">🔞 Adult Content</h2>
                    <p className="text-white/50">
                        This section is hidden. Enable NSFW content in your Profile settings to access.
                    </p>
                </div>
                <Link
                    href="/profile"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all duration-200 border border-white/10"
                >
                    Go to Profile Settings
                </Link>
            </motion.div>
        </div>
    );
}

// ─── Content Tab ─────────────────────────────────────────────────────────────
function ContentTab({
    addons,
    emptyMessage,
}: {
    addons: { url: string; name: string; manifest?: StremioManifest; isEnabled?: boolean }[];
    emptyMessage: string;
}) {
    const router = useRouter();
    const [items, setItems] = useState<NSFWContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAddonUrl, setSelectedAddonUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (addons.length === 0) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(false);
        try {
            const results = await fetchNSFWContent(addons);
            // Diagnostic logging — helps confirm IDs and types from each addon
            results.forEach(item => {
                console.log('[NSFW] Card item:', {
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    addonBaseUrl: item.addonBaseUrl,
                });
            });
            setItems(results);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [addons]);

    useEffect(() => {
        load();
    }, [load]);

    const handleCardClick = (item: NSFWContentItem) => {
        if (!item.id || !item.type) {
            console.warn('[NSFW] Cannot navigate — item is missing id or type:', item);
            return;
        }

        // Check if the source addon declares meta support in its manifest
        const sourceAddon = addons.find(a => item.addonBaseUrl.startsWith(a.url.replace('/manifest.json', '')));
        const supportsMeta = sourceAddon?.manifest?.resources?.some(
            (r: any) => typeof r === 'string' ? r === 'meta' : r.name === 'meta'
        );

        const targetId = encodeURIComponent(item.id);
        const targetRoute = `/meta/${item.type}/${targetId}`;

        console.log('[NSFW] Navigating:', {
            originalId: item.id,
            encodedId: targetId,
            route: targetRoute
        });

        // Persist catalog data as context for the Meta page and Stream Selector
        try {
            const contextData = {
                id: item.id,
                name: item.name,
                poster: item.poster || '',
                background: item.poster || '', // NSFW addons usually don't have separate backgrounds
                type: item.type,
                description: item.description || '',
                genres: item.genres || [],
                addonBaseUrl: item.addonBaseUrl,
                addonId: item.addonId,
                isNSFW: true
            };

            console.log('[NSFW] Storing content context:', contextData);
            sessionStorage.setItem('content_context', JSON.stringify(contextData));

            // Still keep the old key for one version to avoid breaking if middle of navigation
            sessionStorage.setItem('nsfw_meta_fallback', JSON.stringify(contextData));

            // Verification check
            if (!sessionStorage.getItem('content_context')) {
                console.error('[NSFW] FAILED TO WRITE TO SESSIONSTORAGE');
            }
        } catch (err) {
            console.error('[NSFW] sessionStorage error:', err);
        }

        router.push(targetRoute);
    };

    // Extract unique addons for filtering
    const availableAddonUrls = useMemo(() => {
        const urls = new Set<string>();
        items.forEach(item => {
            if (item.addonBaseUrl) urls.add(item.addonBaseUrl);
        });
        return Array.from(urls);
    }, [items]);

    const handleAddonFilter = (url: string | null) => {
        setSelectedAddonUrl(url);
    };

    let filtered = searchQuery.trim()
        ? items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : items;

    if (selectedAddonUrl) {
        filtered = filtered.filter(item => item.addonBaseUrl === selectedAddonUrl);
    }

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-rose-500/50 transition-colors text-sm"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Addon Filters */}
            {!loading && !error && (addons.length > 1) && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                    <button
                        onClick={() => handleAddonFilter(null)}
                        className={cn(
                            "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                            selectedAddonUrl === null
                                ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                                : "glass border-white/5 text-white/60 hover:text-white hover:border-white/20"
                        )}
                    >
                        All Sources
                    </button>
                    {addons.map(addon => {
                        const baseUrl = addon.url.replace('/manifest.json', '');
                        const hasContent = availableAddonUrls.includes(baseUrl);
                        const isSelected = selectedAddonUrl === baseUrl;

                        return (
                            <button
                                key={addon.url}
                                onClick={() => hasContent && handleAddonFilter(baseUrl)}
                                disabled={!hasContent}
                                className={cn(
                                    "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                    isSelected
                                        ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                                        : hasContent
                                            ? "glass border-white/5 text-white/60 hover:text-white hover:border-white/20"
                                            : "opacity-40 grayscale cursor-not-allowed border-white/5 text-white/30"
                                )}
                            >
                                {addon.name} {!hasContent && "(Offline)"}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* States */}
            {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            )}

            {!loading && error && (
                <div className="text-center py-16 text-white/50 space-y-3">
                    <AlertTriangle className="w-10 h-10 text-white/20 mx-auto" />
                    <p>No content available. Sources may be temporarily offline.</p>
                    <button onClick={load} className="text-rose-400 hover:text-rose-300 text-sm underline underline-offset-2">
                        Try again
                    </button>
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-16 text-white/50 space-y-2">
                    <ShieldAlert className="w-10 h-10 text-white/20 mx-auto" />
                    <p>{searchQuery ? `No results for "${searchQuery}"` : emptyMessage}</p>
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filtered.map((item, index) => (
                        <NSFWCard
                            key={`${item.id}-${index}`}
                            item={item}
                            index={index}
                            onClick={() => handleCardClick(item)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────

export default function NSFWPage() {
    const { preferences } = useProfileStore();
    const { addons } = useAddonStore();
    const [ageConfirmed, setAgeConfirmed] = useState<boolean | null>(null);
    const [activeTab, setActiveTab] = useState<"adult" | "hentai">("adult");

    // Check localStorage for prior age confirmation (client-side only)
    useEffect(() => {
        const confirmed = localStorage.getItem("meflix-nsfw-age-confirmed") === "true";
        setAgeConfirmed(confirmed);
    }, []);

    const handleAgeConfirm = () => {
        localStorage.setItem("meflix-nsfw-age-confirmed", "true");
        setAgeConfirmed(true);
    };

    // Filter addons by NSFW category
    const adultAddons = addons.filter(a => a.category === "nsfw-adult" && a.isEnabled);
    const hentaiAddons = addons.filter(a => a.category === "nsfw-hentai" && a.isEnabled);

    const tabs = [
        { id: "adult" as const, label: "🔥 Adult", count: adultAddons.length },
        { id: "hentai" as const, label: "🎌 Hentai", count: hentaiAddons.length },
    ];

    // Block access if NSFW is disabled in preferences
    if (!preferences.showNSFW) {
        return <NSFWLockedScreen />;
    }

    // Show age gate if not yet confirmed (null = loading, false = not confirmed)
    if (ageConfirmed === false) {
        return <AgeVerificationGate onConfirm={handleAgeConfirm} />;
    }

    // Still hydrating from localStorage
    if (ageConfirmed === null) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
            >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Adult Content</h1>
                    <p className="text-white/40 text-sm mt-0.5">Browse premium adult content from your installed addons</p>
                </div>
            </motion.div>

            {/* Tab Bar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex gap-1 p-1 bg-white/5 rounded-2xl w-fit border border-white/10"
            >
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                            activeTab === tab.id
                                ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={cn(
                                "ml-2 text-xs px-1.5 py-0.5 rounded-full",
                                activeTab === tab.id
                                    ? "bg-white/20 text-white"
                                    : "bg-white/10 text-white/40"
                            )}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </motion.div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === "adult" ? (
                        <ContentTab
                            addons={adultAddons.map(a => ({ url: a.url, name: a.name, manifest: a.manifest, isEnabled: a.isEnabled }))}
                            emptyMessage="No adult content addons installed or enabled."
                        />
                    ) : (
                        <ContentTab
                            addons={hentaiAddons.map(a => ({ url: a.url, name: a.name, manifest: a.manifest, isEnabled: a.isEnabled }))}
                            emptyMessage="No hentai content addons installed or enabled."
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
