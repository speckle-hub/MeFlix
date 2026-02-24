"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchMetadata } from "@/lib/stremioService";
import { useAddonStore } from "@/store/addonStore";
import { StremioMeta } from "@/types/stremio";

export function useMetadata(type: string, id: string, addonBaseUrl?: string) {
    const { addons } = useAddonStore();
    const [data, setData] = useState<StremioMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const enabledAddons = addons.filter(a => a.isEnabled);

            console.group(`[useMetadata] Fetching ${type}:${id}`);
            if (addonBaseUrl) console.info('[useMetadata] Directed fetch targeting source:', addonBaseUrl);
            console.debug('[useMetadata] Total enabled addons:', enabledAddons.length);

            // 1. Prioritize directed fetch if addonBaseUrl is provided
            if (addonBaseUrl) {
                const targetAddon = enabledAddons.find(a =>
                    a.url.toLowerCase().includes(addonBaseUrl.toLowerCase().replace('/manifest.json', ''))
                );

                if (targetAddon) {
                    console.debug(`[useMetadata] Found matching source addon: ${targetAddon.name}`);
                    try {
                        const res = await fetchMetadata(targetAddon.url, type, id);
                        if (res && res.meta) {
                            console.info(`[useMetadata] SUCCESS: Metadata resolved via source addon ${targetAddon.name}`);
                            setData(res.meta);
                            setLoading(false);
                            console.groupEnd();
                            return;
                        }
                    } catch (e) {
                        console.warn(`[useMetadata] Directed fetch failed for ${targetAddon.name}, falling back to discovery:`, e);
                    }
                } else {
                    console.warn(`[useMetadata] addonBaseUrl provided (${addonBaseUrl}) but no matching enabled addon found.`);
                }
            }

            // 2. Discovery phase (Global match)
            // Filter addons that actually support this request
            const validAddons = enabledAddons.filter((addon) => {
                const manifest = addon.manifest;
                if (!manifest) return false;

                // 1. Check Resources
                const supportsMeta = manifest.resources?.some((r: any) =>
                    typeof r === 'string' ? r === 'meta' : r.name === 'meta'
                );

                // 2. Check Types
                const supportsType = manifest.types?.includes(type);

                // 3. Check ID Prefixes
                const matchesPrefix = (() => {
                    const prefixes = manifest.idPrefixes;
                    if (!prefixes || (prefixes as any).length === 0) return true;
                    return (prefixes as string[]).some((prefix: string) => id.startsWith(prefix));
                })();

                return !!supportsMeta && !!supportsType && matchesPrefix;
            });

            console.debug(`[useMetadata] Discovery phase: ${validAddons.length} addons pass filtering.`);

            // Try fetching from each valid addon
            for (const addon of validAddons) {
                // If we already tried this addon in the directed phase, skip it
                if (addonBaseUrl && addon.url.toLowerCase().includes(addonBaseUrl.toLowerCase().replace('/manifest.json', ''))) {
                    continue;
                }

                console.debug(`[useMetadata] Trying discovery via ${addon.name}...`);
                try {
                    const res = await fetchMetadata(addon.url, type, id);
                    if (res && res.meta) {
                        console.info(`[useMetadata] SUCCESS: Metadata resolved via discovery addon ${addon.name}`);
                        setData(res.meta);
                        setLoading(false);
                        console.groupEnd();
                        return;
                    }
                } catch (e) {
                    console.debug(`[useMetadata] Discovery failed for ${addon.name}`);
                }
            }

            console.warn('[useMetadata] FAILED: No addon could resolve metadata for this item.');
            console.groupEnd();
            // Instead of throwing, we'll just set data to null
        } catch (err) {
            console.error("[useMetadata] Unexpected hook error:", err);
            setError("Failed to fetch item details.");
        } finally {
            setLoading(false);
        }
    }, [addons, type, id, addonBaseUrl]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
