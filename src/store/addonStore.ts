import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StremioManifest } from "@/types/stremio";
import { clearCatalogCache } from '@/lib/stremioService';

export type AddonCategory = 'live' | 'regular' | 'nsfw-adult' | 'nsfw-hentai';

interface Addon {
    id?: string;
    url: string;
    name: string;
    icon?: string;
    isEnabled: boolean;
    isNSFW: boolean;
    category?: AddonCategory;
    manifest?: StremioManifest;
}

interface AddonState {
    addons: Addon[];
    isDemoMode: boolean;
    installAddon: (url: string, isNSFW?: boolean, category?: AddonCategory) => Promise<boolean>;
    addAddon: (url: string, name: string, isNSFW?: boolean) => void;
    removeAddon: (url: string) => void;
    toggleAddon: (url: string) => void;
    setDemoMode: (value: boolean) => void;
}
// Default addons list
export const DEFAULT_ADDONS = [
    {
        url: "https://v3-cinemeta.strem.io/manifest.json",
        name: "Cinemeta"
    },
    {
        url: "https://anime-kitsu.strem.fun/manifest.json",
        name: "Anime Kitsu"
    },
    {
        url: "https://addon-osvh.onrender.com/manifest.json",
        name: "OSVH Addon"
    },
    {
        url: "https://stremio-jackett.onrender.com/manifest.json",
        name: "Jackett"
    },
    {
        url: "https://1337x-stremio.vercel.app/manifest.json",
        name: "1337x"
    },
    {
        url: "https://stremio-yts.onrender.com/manifest.json",
        name: "YTS"
    },
    {
        url: "https://stremio-solidtorrents.onrender.com/manifest.json",
        name: "SolidTorrents"
    },
    {
        url: "https://stremio-nyaa.onrender.com/manifest.json",
        name: "Nyaa"
    },
    {
        url: "https://stremio-piratebay.onrender.com/manifest.json",
        name: "The Pirate Bay"
    },
    {
        url: "https://stremio-rarbg.onrender.com/manifest.json",
        name: "RARBG"
    }
];

export const DEFAULT_LIVE_ADDONS = [
    {
        url: "https://mediafusion.elfhosted.com/manifest.json",
        name: "MediaFusion"
    },
    {
        url: "https://848b3516657c-usatv.baby-beamup.club/manifest.json",
        name: "USA TV"
    },
    {
        url: "https://addon3.gstream.stream/manifest.json",
        name: "GStream"
    },
    {
        url: "https://ppvio.hayd.uk/manifest.json",
        name: "PPVio"
    },
    {
        url: "https://ro-sport-addon-production.up.railway.app/manifest.json",
        name: "RO Sport (404 as of 2026-02-22)"
    },
    {
        url: "https://streamvix.hayd.uk/%7B%22tmdbApiKey%22%3A%22%22%2C%22mediaFlowProxyUrl%22%3A%22%22%2C%22mediaFlowProxyPassword%22%3A%22%22%2C%22animeunityEnabled%22%3A%22on%22%2C%22animesaturnEnabled%22%3A%22on%22%2C%22animeworldEnabled%22%3A%22on%22%7D/manifest.json",
        name: "StreamViX"
    },
    {
        url: "https://ryann-devv.github.io/Stremio-IPTV/manifest.json",
        name: "Stremio IPTV"
    },
    {
        url: "https://kangaroostreams.hayd.uk/Brisbane/radio/ausports/nz/nzradio/nzsports/uktv/uksports/ustv/ussports/catv/casports/eusports/worldsports/epl/extras/exgrp-ca-dazn/exgrp-int-netflix-events/exgrp-int-dirtvision/exgrp-uk-epl/exgrp-uk-dazn/exgrp-au-kayo-sports/exgrp-uk-tnt-sports/exgrp-uk-sky-sports/exgrp-nz-sky-sport/exgrp-int-f1-tv/exgrp-uk-spfl/exgrp-int-rugby-events/exgrp-au-stan-sports-events/exgrp-ppv-events/manifest.json",
        name: "AU IPTV (Kangaroo)"
    }
];

// Adult content addons — category: 'nsfw-adult'
export const DEFAULT_NSFW_ADULT_ADDONS = [
    {
        url: "https://dirty-pink.ers.pw/manifest.json",
        name: "Porn Tube"
    },
    {
        url: "https://07b88951aaab-jaxxx-v2.baby-beamup.club/manifest.json",
        name: "OnlyPorn"
    },
    {
        url: "https://xclub-stremio.vercel.app/manifest.json",
        name: "xxxClub"
    },
    {
        // NOTE: offline as of 2026-02-22 (DNS not resolving)
        url: "https://xxxclub-stremio.nondikass.com/manifest.json",
        name: "XXXClub (alt)"
    },
];

// Hentai content addons — category: 'nsfw-hentai'
export const DEFAULT_NSFW_HENTAI_ADDONS = [
    {
        url: "https://streamio-hianime.onrender.com/manifest.json",
        name: "HiAnime Streams"
    },
    {
        url: "https://hentaistream-addon.keypop3750.workers.dev/manifest.json",
        name: "HentaiStream"
    },
    {
        // NOTE: EOF / offline as of 2026-02-22
        url: "https://hanime-stremio.fly.dev/manifest.json",
        name: "Hanime (offline)"
    },
];

export const useAddonStore = create<AddonState>()(
    persist(
        (set, get) => ({
            addons: [], // Start empty for active installation
            isDemoMode: false,
            setDemoMode: (isDemoMode) => set({ isDemoMode }),
            installAddon: async (url, isNSFW = false, category?: AddonCategory) => {
                // If no URL provided, install defaults
                if (!url) {
                    // Logic moved to AddonInitializer for better control
                    return true;
                }
                try {
                    const { fetchAddonManifest } = await import("@/lib/stremioService");
                    const manifest = await fetchAddonManifest(url);
                    if (!manifest || !manifest.name) {
                        console.warn(`[MeFlix] Manifest load failed for ${url}. Skipping installation.`);
                        return false;
                    }

                    const existing = get().addons.find(a => a.url === url);
                    if (existing) {
                        // If it exists but has the wrong category, update it
                        if (category && existing.category !== category) {
                            set((state) => ({
                                addons: state.addons.map(a =>
                                    a.url === url ? { ...a, category } : a
                                )
                            }));
                        }
                        return true;
                    }

                    const isLiveAddon = DEFAULT_LIVE_ADDONS.some(a => a.url === url);
                    const isNsfwAdult = DEFAULT_NSFW_ADULT_ADDONS.some(a => a.url === url);
                    const isNsfwHentai = DEFAULT_NSFW_HENTAI_ADDONS.some(a => a.url === url);

                    const resolvedCategory: AddonCategory = category ||
                        (isLiveAddon ? 'live' :
                            isNsfwAdult ? 'nsfw-adult' :
                                isNsfwHentai ? 'nsfw-hentai' : 'regular');

                    set((state) => ({
                        addons: [...state.addons, {
                            url,
                            name: manifest.name,
                            isEnabled: true,
                            isNSFW: isNsfwAdult || isNsfwHentai || isNSFW,
                            icon: manifest.logo,
                            category: resolvedCategory,
                            manifest: manifest
                        }],
                    }));
                    clearCatalogCache();
                    return true;
                } catch (err) {
                    console.error(`[MeFlix] Failed to install addon: ${url}`, err);
                    return false;
                }
            },
            addAddon: (url, name, isNSFW = false) => {
                set((state) => ({
                    addons: [...state.addons, { url, name, isEnabled: true, isNSFW }],
                }));
                clearCatalogCache();
            },
            removeAddon: (url) => {
                set((state) => ({
                    addons: state.addons.filter((a) => a.url !== url),
                }));
                clearCatalogCache();
            },
            toggleAddon: (url) => {
                set((state) => ({
                    addons: state.addons.map((a) =>
                        a.url === url ? { ...a, isEnabled: !a.isEnabled } : a
                    ),
                }));
                clearCatalogCache();
            },
        }),
        {
            name: "meflix-addons",
        }
    )
);
