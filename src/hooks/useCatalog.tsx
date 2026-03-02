"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchCatalog } from "@/lib/stremioService";
import { useAddonStore } from "@/store/addonStore";
import { type Movie, TRENDING_CONTENT } from "@/lib/mockData";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";

export function useCatalog(type: string, id: string, extra?: Record<string, string>) {
    const { addons } = useAddonStore();
    const [data, setData] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const isNSFWContext = id === 'nsfw';
            const filteredAddons = addons.filter(a => a.isEnabled && a.isNSFW === isNSFWContext);

            if (filteredAddons.length === 0) {
                const { isDemoMode } = useAddonStore.getState();
                if (isDemoMode) {
                    setData(TRENDING_CONTENT.filter(m => id === 'nsfw' ? m.isNSFW : !m.isNSFW));
                } else {
                    setData([]);
                }
                setLoading(false);
                return;
            }

            const seenIds = new Set<string>();
            let aggregatedResults: Movie[] = [];

            // Fetch from each matching addon incrementally
            const fetchPromises = filteredAddons.map(async (addon) => {
                try {
                    const res = await fetchCatalog(addon.url, type, id, extra);
                    if (res && res.metas) {
                        const newMetas = res.metas
                            .filter(m => !seenIds.has(m.id))
                            .map(meta => {
                                seenIds.add(meta.id);
                                return {
                                    id: meta.id,
                                    title: meta.name,
                                    description: meta.description || "",
                                    poster: meta.poster || "",
                                    backdrop: meta.background || "",
                                    rating: meta.imdbRating || "N/A",
                                    year: meta.year?.toString() || meta.releaseInfo || "",
                                    quality: "HD",
                                    type: meta.type as any,
                                    isNSFW: meta.id.includes('nsfw') || (meta as any).isNSFW || false
                                };
                            });

                        if (newMetas.length > 0) {
                            aggregatedResults = [...aggregatedResults, ...newMetas];
                            setData([...aggregatedResults]); // Show partial results
                        }
                    }
                } catch (e) {
                    console.error(`[MeFlix] Failed to fetch from ${addon.name}:`, e);
                }
            });

            await Promise.allSettled(fetchPromises);

            if (aggregatedResults.length === 0) {
                const { isDemoMode } = useAddonStore.getState();
                if (isDemoMode) {
                    setData(TRENDING_CONTENT.filter(m => id === 'nsfw' ? m.isNSFW : !m.isNSFW));
                }
            }
        } catch (err) {
            console.error("[MeFlix] useCatalog fatal error:", err);
            setError(err instanceof Error ? err.message : "Failed to load content");
        } finally {
            setLoading(false);
        }
    }, [addons, type, id, extra]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
