"use client";

import { useEffect, useRef } from "react";
import { useAddonStore, DEFAULT_ADDONS, DEFAULT_LIVE_ADDONS, DEFAULT_NSFW_ADULT_ADDONS, DEFAULT_NSFW_HENTAI_ADDONS } from "@/store/addonStore";

const ADDON_INIT_VERSION = 7; // Version 7: Adding NSFW Adult + Hentai addon suite

export function AddonInitializer() {
    const { addons, installAddon } = useAddonStore();
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
                console.log("[ADDON INIT] Update required. Checking all default addons...");

                const allDefaults = [
                    ...DEFAULT_ADDONS.map(a => ({ ...a, category: 'regular' as const })),
                    ...DEFAULT_LIVE_ADDONS.map(a => ({ ...a, category: 'live' as const })),
                    ...DEFAULT_NSFW_ADULT_ADDONS.map(a => ({ ...a, category: 'nsfw-adult' as const })),
                    ...DEFAULT_NSFW_HENTAI_ADDONS.map(a => ({ ...a, category: 'nsfw-hentai' as const })),
                ];

                for (const def of allDefaults) {
                    const isInstalled = addons.some(a => a.url === def.url);
                    if (!isInstalled) {
                        console.log(`[ADDON INIT] Installing new default [${def.category}]: ${def.name || def.url}`);
                        try {
                            const success = await installAddon(def.url, false, def.category);
                            if (success) {
                                console.log(`[ADDON INIT] Successfully installed: ${def.name}`);
                            } else {
                                console.warn(`[ADDON INIT] Failed to install: ${def.url}`);
                            }
                        } catch (err) {
                            console.error(`[ADDON INIT] Error installing ${def.url}:`, err);
                        }
                        // Small stagger to avoid overwhelming proxies
                        await new Promise(resolve => setTimeout(resolve, 800));
                    } else {
                        // Ensure category is correct even if already installed
                        // (This handles users who installed from store but without the tag)
                        const addon = addons.find(a => a.url === def.url);
                        if (addon && addon.category !== def.category) {
                            console.log(`[ADDON INIT] Updating category for ${def.name} to ${def.category}`);
                            // Note: We don't have a direct 'updateAddon' but installAddon handles updates if manifest changes
                            // For now, it's safer to just re-install if version is bumped
                            await installAddon(def.url, false, def.category);
                        }
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
