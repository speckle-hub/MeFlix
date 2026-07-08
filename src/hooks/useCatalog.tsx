import { useState, useEffect, useCallback } from "react";
import { fetchCatalog } from "@/lib/stremioService";
import { fetchProviderCatalog as fetchCloudStreamCatalog, type CloudStreamType, type CloudStreamItem } from "@/lib/cloudstreamService";
import { useAddonStore } from "@/store/addonStore";
import { useRepoStore, type RepoExtension } from "@/store/repoStore";
import { type Movie, TRENDING_CONTENT } from "@/lib/mockData";

/**
 * Hook to fetch and aggregate media from Stremio and CloudStream sources.
 * Phase 2 Hardened Version.
 */
export function useCatalog(type: string, categoryId: string, extra?: Record<string, string>) {
    // REQUIREMENT: Initialize with mock data immediately to prevent blank screen
    const [data, setData] = useState<Movie[]>(() => {
        const isNSFWContext = categoryId === 'nsfw';
        return TRENDING_CONTENT.filter((m: Movie) => isNSFWContext ? m.isNSFW : !m.isNSFW);
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const extraKey = JSON.stringify(extra || {});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const isNSFWContext = categoryId === 'nsfw';
        const { isDemoMode, addons: currentAddons } = useAddonStore.getState();
        const { extensions: currentRepoExtensions } = useRepoStore.getState();

        // 1. Filter relevant Stremio addons
        const filteredAddons = currentAddons.filter(a => {
            if (!a.isEnabled) return false;
            if (isNSFWContext) {
                return a.isNSFW === true || a.category === 'nsfw-adult' || a.category === 'nsfw-hentai';
            } else {
                return !a.isNSFW && a.category !== 'nsfw-adult' && a.category !== 'nsfw-hentai';
            }
        });

        // 2. Filter relevant CloudStream extensions
        const enabledExtensions = currentRepoExtensions.filter((ext: RepoExtension) => {
            if (!ext.isEnabled || ext.type !== 'cloudstream') return false;
            if (isNSFWContext) return ext.isNSFW;
            return !ext.isNSFW;
        });

        // 3. Define the fetch logic
        const fetchRealContent = async (): Promise<Movie[]> => {
            const seenIds = new Set<string>();
            const allMetas: Movie[] = [];

            // A. Fetch from Stremio (Phase 1 Baseline)
            const stremioPromises = filteredAddons.map(async (addon) => {
                try {
                    const res = await fetchCatalog(addon.url, type, categoryId, extra);
                    if (res && res.metas) {
                        return res.metas.map(meta => ({
                            id: meta.id,
                            title: meta.name || "Untitled",
                            description: meta.description || "",
                            poster: meta.poster || "",
                            backdrop: meta.background || "",
                            rating: meta.imdbRating || "N/A",
                            year: meta.year?.toString() || meta.releaseInfo || "",
                            quality: "HD",
                            type: meta.type as 'movie' | 'series' | 'anime' | 'manga',
                            isNSFW: (meta as { isNSFW?: boolean }).isNSFW || false,
                            sourceName: "Stremio"
                        } as Movie));
                    }
                    return [];
                } catch (e) {
                    console.warn(`[useCatalog] Stremio fetch failed for ${addon.name}:`, e);
                    return [];
                }
            });

            // B. Fetch from CloudStream (Phase 2 Add-on)
            const cloudStreamPromises = enabledExtensions.map(async (ext: RepoExtension) => {
                try {
                    // Normalize 'anime' and others to 'tv-show' if not 'movie'
                    const fetchType: CloudStreamType = type === 'movie' ? 'movie' : 'tv-show';
                    const items = await fetchCloudStreamCatalog(ext.id, fetchType);
                    
                    if (items && items.length > 0) {
                        return items.map((item: CloudStreamItem) => ({
                            id: item.id,
                            title: item.title,
                            description: item.description || "",
                            poster: item.poster,
                            backdrop: item.backdrop || "",
                            rating: item.rating || "N/A",
                            year: item.year || "",
                            quality: "HD",
                            type: (item.type === 'tv-show' ? (type === 'anime' ? 'anime' : 'series') : 
                                  (item.type === 'manga' ? 'manga' : 'movie')) as 'movie' | 'series' | 'anime' | 'manga',
                            isNSFW: ext.isNSFW,
                            sourceName: ext.name || "CloudStream"
                        } as Movie));
                    }
                    return [];
                } catch (e) {
                    console.warn(`[useCatalog] CloudStream fetch failed for ${ext.name}:`, e);
                    return [];
                }
            });

            // Execute all fetches
            const results = await Promise.allSettled([...stremioPromises, ...cloudStreamPromises]);
            
            // Collect and dedupe (Option 1: Conservative ID-only)
            results.forEach(res => {
                if (res.status === 'fulfilled' && res.value) {
                    res.value.forEach((item: Movie) => {
                        if (!seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            allMetas.push(item);
                        }
                    });
                }
            });

            return allMetas;
        };

        try {
            if (filteredAddons.length === 0 && enabledExtensions.length === 0) {
                setLoading(false);
                return;
            }

            const timeoutPromise = new Promise<Movie[]>((resolve) =>
                setTimeout(() => resolve([]), 3000)
            );

            const result = await Promise.race([
                fetchRealContent(),
                timeoutPromise
            ]);

            if (result && result.length > 0) {
                setData(result);
            } else if (isDemoMode) {
                const filteredTrending = TRENDING_CONTENT.filter((m: Movie) => isNSFWContext ? m.isNSFW : !m.isNSFW);
                setData(filteredTrending);
            }
        } catch (err) {
            console.error("[useCatalog] Fetching Error:", err);
            setError(err instanceof Error ? err.message : "Failed to load content");
        } finally {
            setLoading(false);
        }
    }, [type, categoryId, extraKey]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refresh: fetchData };
}
