"use client";

import { useEffect, useRef } from "react";
import { useAddonStore, DEFAULT_ADDONS, DEFAULT_LIVE_ADDONS, DEFAULT_NSFW_ADULT_ADDONS, DEFAULT_NSFW_HENTAI_ADDONS } from "@/store/addonStore";

const ADDON_INIT_VERSION = 10; // Version 10: Hydration-aware & strict Torrentio ban

export function AddonInitializer() {
    const installAddon = useAddonStore(state => state.installAddon);
    const removeAddon = useAddonStore(state => state.removeAddon);
    const isHydrated = useAddonStore(state => state.isHydrated);
    const initialized = useRef(false);

    useEffect(() => {
        // Wait for store to hydrate and ensure we only run once
        if (!isHydrated || initialized.current) return;
        initialized.current = true;

        const init = async () => {
            console.log("[ADDON INIT] Starting hydration-aware versioned initialization...");

            // Use getState() for the most current values without subscribing to changes
            const { addons } = useAddonStore.getState();

            const currentVersion = parseInt(localStorage.getItem('addon_init_version') || '0');
            console.log(`[ADDON INIT] Current version: ${currentVersion} | Target: ${ADDON_INIT_VERSION}`);

            // ALWAYS check for any Torrentio URLs regardless of version
            const hasTorrentio = addons.some(a => a.url.toLowerCase().includes('torrentio'));
            if (hasTorrentio) {
                console.log("[ADDON INIT] Detected forbidden Torrentio addon. Purging...");
                addons.forEach(a => {
                    if (a.url.toLowerCase().includes('torrentio')) {
                        removeAddon(a.url);
                    }
                });
            }

            if (currentVersion < ADDON_INIT_VERSION) {
                console.log("[ADDON INIT] Update required. Ensuring default addons are present...");

                const allDefaults = [
                    ...DEFAULT_ADDONS.map(a => ({ ...a, category: 'regular' as const })),
                    ...DEFAULT_LIVE_ADDONS.map(a => ({ ...a, category: 'live' as const })),
                    ...DEFAULT_NSFW_ADULT_ADDONS.map(a => ({ ...a, category: 'nsfw-adult' as const })),
                    ...DEFAULT_NSFW_HENTAI_ADDONS.map(a => ({ ...a, category: 'nsfw-hentai' as const })),
                ];

                for (const def of allDefaults) {
                    const currentAddons = useAddonStore.getState().addons;
                    const isInstalled = currentAddons.some(a => a.url === def.url);

                    // Re-install if missing or if version is low (to force update name/category)
                    if (!isInstalled || currentVersion < 10) {
                        try {
                            await installAddon(def.url, false, def.category);
                        } catch (err) {
                            console.error(`[ADDON INIT] Error updating ${def.url}:`, err);
                        }
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }

                localStorage.setItem('addon_init_version', String(ADDON_INIT_VERSION));
                console.log(`[ADDON INIT] Initialized to version ${ADDON_INIT_VERSION}`);
            }
        };

        init();
    }, [isHydrated, installAddon, removeAddon]);

    return null;
}
