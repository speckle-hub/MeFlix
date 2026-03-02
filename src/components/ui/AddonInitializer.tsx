"use client";

import { useEffect, useRef } from "react";
import { useAddonStore, DEFAULT_ADDONS, DEFAULT_LIVE_ADDONS, DEFAULT_NSFW_ADULT_ADDONS, DEFAULT_NSFW_HENTAI_ADDONS } from "@/store/addonStore";

const ADDON_INIT_VERSION = 8; // Version 8: Synchronizing new 8 default addons & pruning Torrentio

export function AddonInitializer() {
    const { addons, installAddon, removeAddon } = useAddonStore();
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const init = async () => {
            console.log("[ADDON INIT] Starting versioned initialization...");

            // Temporary migration for legacy users
            if (localStorage.getItem('addons_initialized') && !localStorage.getItem('addon_init_version')) {
                console.log("[ADDON INIT] Migrating legacy user to versioned system...");
                localStorage.removeItem('addons_initialized');
                localStorage.setItem('addon_init_version', '0');
            }

            const currentVersion = parseInt(localStorage.getItem('addon_init_version') || '0');
            console.log(`[ADDON INIT] Current version: ${currentVersion} | Target: ${ADDON_INIT_VERSION}`);

            if (currentVersion < ADDON_INIT_VERSION) {
                console.log("[ADDON INIT] Update required. Cleaning up legacy addons...");

                // EXPLICIT PRUNING: Remove Torrentio and other legacy/offline addons
                const forbiddenUrls = [
                    "https://torrentio.strem.fun/manifest.json",
                    "https://torrentio.strem.io/manifest.json",
                    "https://stremio-jackett.onrender.com/manifest.json",
                    "https://1337x-stremio.vercel.app/manifest.json",
                    "https://stremio-yts.onrender.com/manifest.json",
                ];

                for (const url of forbiddenUrls) {
                    if (addons.some(a => a.url === url)) {
                        console.log(`[ADDON INIT] Pruning forbidden/legacy addon: ${url}`);
                        removeAddon(url);
                    }
                }

                const allDefaults = [
                    ...DEFAULT_ADDONS.map(a => ({ ...a, category: 'regular' as const })),
                    ...DEFAULT_LIVE_ADDONS.map(a => ({ ...a, category: 'live' as const })),
                    ...DEFAULT_NSFW_ADULT_ADDONS.map(a => ({ ...a, category: 'nsfw-adult' as const })),
                    ...DEFAULT_NSFW_HENTAI_ADDONS.map(a => ({ ...a, category: 'nsfw-hentai' as const })),
                ];

                for (const def of allDefaults) {
                    const isInstalled = addons.some(a => a.url === def.url);
                    // Force re-installation for version 8 to ensure metadata and categories are correct
                    if (!isInstalled || currentVersion < 8) {
                        console.log(`[ADDON INIT] Installing/Updating default [${def.category}]: ${def.name || def.url}`);
                        try {
                            const success = await installAddon(def.url, false, def.category);
                            if (success) {
                                console.log(`[ADDON INIT] Successfully updated: ${def.name}`);
                            } else {
                                console.warn(`[ADDON INIT] Failed to update: ${def.url}`);
                            }
                        } catch (err) {
                            console.error(`[ADDON INIT] Error updating ${def.url}:`, err);
                        }
                        // Small stagger to avoid overwhelming proxies
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }
                }

                localStorage.setItem('addon_init_version', String(ADDON_INIT_VERSION));
                console.log(`[ADDON INIT] Initialized to version ${ADDON_INIT_VERSION}`);
            } else {
                console.log("[ADDON INIT] Already at latest version.");
            }

            // Final debug logging
            const currentAddons = useAddonStore.getState().addons;
            console.log('[ADDON INIT] Final addon state:', currentAddons.map(a => ({
                name: a.name,
                url: a.url,
                category: a.category,
                enabled: a.isEnabled
            })));

            console.log('[ADDON INIT] Live addons available:', currentAddons.filter(a => a.category === 'live').length);
        };

        if (addons) {
            init();
        }
    }, [addons, installAddon]);

    return null;
}
