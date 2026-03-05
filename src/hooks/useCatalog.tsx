import { useState, useEffect, useCallback } from "react";
import { fetchCatalog } from "@/lib/stremioService";
import { useAddonStore } from "@/store/addonStore";
import { type Movie, TRENDING_CONTENT } from "@/lib/mockData";

export function useCatalog(type: string, id: string, extra?: Record<string, string>) {
    const addons = useAddonStore(state => state.addons);
    const [data, setData] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const extraKey = JSON.stringify(extra || {});

    const fetchData = useCallback(async () => {
        // Prevent multiple simultaneous fetches for the same category
        setLoading(true);
        setError(null);
        setData([]); // Clear existing data only when starting a fresh fetch

        try {
            const isNSFWContext = id === 'nsfw';
            const { isDemoMode, addons: currentAddons } = useAddonStore.getState();

            const filteredAddons = currentAddons.filter(a => {
                if (!a.isEnabled) return false;
                if (isNSFWContext) {
                    return a.isNSFW === true || a.category === 'nsfw-adult' || a.category === 'nsfw-hentai';
                } else {
                    return !a.isNSFW && a.category !== 'nsfw-adult' && a.category !== 'nsfw-hentai';
                }
            });

            if (filteredAddons.length === 0) {
                if (isDemoMode) {
                    setData(TRENDING_CONTENT.filter(m => isNSFWContext ? m.isNSFW : !m.isNSFW));
                }
                setLoading(false);
                return;
            }

            const seenIds = new Set<string>();
            let allMetas: Movie[] = [];

            // 1. Fetch from Stremio Addons
            const stremioPromises = filteredAddons.map(async (addon) => {
                try {
                    const res = await fetchCatalog(addon.url, type, id, extra);
                    if (res && res.metas) {
                        const newMetas = res.metas
                            .filter(m => m && m.id && !seenIds.has(m.id))
                            .map(meta => {
                                seenIds.add(meta.id);
                                return {
                                    id: meta.id,
                                    title: meta.name || "Unknown Title",
                                    description: meta.description || "",
                                    poster: meta.poster || "",
                                    backdrop: meta.background || "",
                                    rating: meta.imdbRating || "N/A",
                                    year: meta.year?.toString() || meta.releaseInfo || "",
                                    quality: "HD",
                                    type: meta.type as any,
                                    isNSFW: (meta as any).isNSFW || false,
                                    sourceType: 'stremio'
                                };
                            });

                        // Collect results instead of updating state immediately
                        allMetas = [...allMetas, ...newMetas];
                    }
                } catch (e) {
                    console.error(`[MeFlix] Stremio fetch failed for ${addon.name}:`, e);
                }
            });

            await Promise.allSettled(stremioPromises);

            // Final state update with all collected data
            if (allMetas.length > 0) {
                setData(allMetas);
            }

            if (allMetas.length === 0 || isDemoMode) {
                // In demo mode or if no results found, add trending content
                const filteredTrending = TRENDING_CONTENT.filter(m => isNSFWContext ? m.isNSFW : !m.isNSFW);
                setData(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const toAdd = filteredTrending.filter(m => !existingIds.has(m.id));
                    return [...prev, ...toAdd];
                });
            }
        } catch (err) {
            console.error("[MeFlix] useCatalog fatal error:", err);
            setError(err instanceof Error ? err.message : "Failed to load content");
            setData(TRENDING_CONTENT.filter(m => id === 'nsfw' ? m.isNSFW : !m.isNSFW));
        } finally {
            setLoading(false);
        }
    }, [type, id, extraKey]);

    useEffect(() => {
        let isMounted = true;
        if (isMounted) fetchData();
        return () => { isMounted = false; };
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
