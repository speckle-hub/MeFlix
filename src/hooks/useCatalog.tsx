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
            // Filter addons by enabled status AND safety context
            const filteredAddons = addons.filter(a => a.isEnabled && a.isNSFW === isNSFWContext);
            const allResults: Movie[] = [];
            const seenIds = new Set<string>();

            console.log(`[useCatalog] Context: ${isNSFWContext ? 'NSFW' : 'Regular'}, Filtered Addons:`, filteredAddons.map(a => a.name));

            if (filteredAddons.length === 0) {
                console.warn(`[MeFlix] No addons enabled for context: ${isNSFWContext ? 'NSFW' : 'Regular'}`);
            }

            // Fetch from each matching addon and aggregate
            const promises = filteredAddons.map(addon => {
                console.log(`[useCatalog] Fetching from ${addon.name} (${addon.url})...`);
                return fetchCatalog(addon.url, type, id, extra)
                    .then(res => {
                        console.log(`[useCatalog] Response from ${addon.name}:`, res);
                        return res;
                    })
                    .catch(e => {
                        console.error(`[MeFlix] Failed to fetch from ${addon.name}:`, e);
                        // Notify user once per failure
                        toast.error(`Addon "${addon.name}" is unreachable`, {
                            description: "Try enabling a VPN or checking your network.",
                            icon: <WifiOff className="h-4 w-4" />,
                            duration: 3000
                        });
                        return { metas: [] };
                    })
            });

            const responses = await Promise.all(promises);

            responses.forEach(res => {
                if (res && res.metas) {
                    res.metas.forEach(meta => {
                        if (!seenIds.has(meta.id)) {
                            seenIds.add(meta.id);
                            allResults.push({
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
                            });
                        }
                    });
                }
            });

            if (filteredAddons.length === 0 || allResults.length === 0) {
                // Determine if we should show mock data based on store's demo mode
                const { isDemoMode } = useAddonStore.getState();
                if (isDemoMode) {
                    setData(TRENDING_CONTENT.filter(m => id === 'nsfw' ? m.isNSFW : !m.isNSFW));
                } else {
                    setData([]); // Return empty if no real addons enabled and not in demo mode
                    console.info(`[MeFlix] No active addons for context: ${isNSFWContext ? 'NSFW' : 'Regular'}`);
                }
            } else {
                setData(allResults);
            }
        } catch (err) {
            console.error("[MeFlix] useCatalog fatal error:", err);
            setError(err instanceof Error ? err.message : "Failed to load content");

            // Fallback to empty if not demo
            const { isDemoMode } = useAddonStore.getState();
            if (isDemoMode) {
                setData(TRENDING_CONTENT.filter(m => id === 'nsfw' ? m.isNSFW : !m.isNSFW));
            } else {
                setData([]);
            }
        } finally {
            setLoading(false);
        }
    }, [addons, type, id, extra]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
