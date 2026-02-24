import {
    StremioManifest,
    StremioCatalogResponse,
    StremioMetaResponse,
    StremioStreamResponse,
    StremioMeta
} from "@/types/stremio";

export interface LiveContentItem {
    id: string;
    name: string;
    poster?: string;
    logo?: string;
    description?: string;
    type: string;              // original type from addon (tv, events, etc.)
    category: string;          // normalized display category (Sports, News, PPV, Entertainment)
    addonName: string;         // which addon provided this
    addonBaseUrl: string;      // for stream fetching later
    isLive: true;
}

const CATEGORY_MAP: Record<string, string> = {
    'sports': 'Sports',
    'Sports': 'Sports',
    'sport': 'Sports',
    'football': 'Football',
    'soccer': 'Football',
    'premier league': 'Football',
    'serie a': 'Football',
    'serie b': 'Football',
    'serie c': 'Football',
    'liga': 'Football',
    'bundesliga': 'Football',
    'ligue 1': 'Football',
    'epl': 'Football',
    'news': 'News',
    'News': 'News',
    'ppv': 'PPV',
    'PPV': 'PPV',
    'f1': 'Motorsport',
    'motogp': 'Motorsport',
    'tennis': 'Tennis',
    'rugby': 'Rugby',
    'basketball': 'Basketball',
    'basket': 'Basketball',
    'nfl': 'American Football',
    'combat sports': 'Combat Sports',
    'wrestling': 'Wrestling',
    'boxing': 'Combat Sports',
    'mma': 'Combat Sports',
    'cricket': 'Cricket',
    'golf': 'Golf',
    'baseball': 'Baseball',
    'entertainment': 'Entertainment',
    'local': 'Local TV',
    '24/7': '24/7 Channels',
    'documentari': 'Documentaries',
    'discovery': 'Documentaries',
    'bambini': 'Kids',
    'kids': 'Kids',
    'sky': 'Entertainment',
    'rai': 'Entertainment',
    'mediaset': 'Entertainment'
};
import {
    TRENDING_CONTENT,
    MOCK_MOVIES,
    MOCK_SERIES,
    MOCK_ANIME,
    MOCK_NSFW
} from "./mockData";

export let DEMO_MODE = false; // Enable mock data for testing/demo

export function setServiceDemoMode(value: boolean) {
    DEMO_MODE = value;
    console.log(`[MeFlix] Demo Mode updated in stremioService: ${value}`);
}

const CORS_PROXIES = [
    '/api/proxy?url=', // 1. Internal Proxy (Priority)
    'https://corsproxy.io/?', // 2. Robust External Fallback
    'https://api.codetabs.com/v1/proxy?quest=', // 3. Backup Fallback
    '', // Last resort: Direct
];

/**
 * Simple delay helper
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Robust JSON parsing that won't throw on HTML responses
 */
async function safeJson<T>(response: Response): Promise<T | null> {
    try {
        const contentType = response.headers.get("content-type");
        if (contentType && !contentType.includes("application/json")) {
            console.warn(`[MeFlix] Expected JSON but got ${contentType}`);
            // If it's HTML, it's definitely not what we want
            if (contentType.includes("text/html")) return null;
        }

        const text = await response.text();
        if (!text || text.trim().startsWith('<')) {
            if (text.trim().startsWith('<')) {
                console.warn("[MeFlix] Response is HTML/XML, cannot parse as JSON.");
            }
            return null;
        }

        try {
            return JSON.parse(text) as T;
        } catch (e) {
            console.warn("[MeFlix] JSON parse failed:", e);
            return null;
        }
    } catch (err) {
        console.warn("[MeFlix] safeJson error:", err);
        return null;
    }
}

/**
 * Fetch with automatic CORS proxy cycling on failure
 */
async function fetchWithProxy(url: string, allowWait: boolean = true): Promise<Response> {
    if (allowWait) {
        // Enforce 1s delay as requested to avoid 429 errors
        await delay(1000);
    }

    const errors: string[] = [];
    let headers: Record<string, string> = {
        'Accept': 'application/json',
    };

    // Specialized handling for fly.dev apps which often check Origin/Referer
    if (url.includes('fly.dev')) {
        try {
            const urlObj = new URL(url);
            headers['Origin'] = urlObj.origin;
            headers['Referer'] = `${urlObj.origin}/`;
        } catch (e) {
            console.warn(`[PROXY] Failed to parse URL for fly.dev headers: ${url}`);
        }
    }

    for (const proxy of CORS_PROXIES) {
        const proxyName = proxy || 'direct';
        try {
            let proxyUrl = proxy;
            const isInternalProxy = proxy.startsWith('/');

            if (isInternalProxy) {
                const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                const cleanProxy = proxy.startsWith('/') ? proxy : `/${proxy}`;
                proxyUrl = `${origin}${cleanProxy}${encodeURIComponent(url)}`;
            } else if (proxy) {
                proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            } else {
                proxyUrl = url;
            }

            console.log(`[PROXY] Attempting fetch: ${url} via ${proxyName}`);

            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers,
                cache: 'no-store',
                // Keep timeout reasonable
                signal: AbortSignal.timeout(8000)
            });

            if (response.status === 404) {
                console.warn(`[PROXY] Target URL returned 404: ${url}. Skipping further retries.`);
                return response;
            }

            if (response.ok) {
                console.log(`[PROXY] Success: ${url} via ${proxyName}`);
                return response;
            }

            const errorMsg = `${proxyName}: ${response.status} ${response.statusText}`;
            console.warn(`[PROXY] Proxy failed: ${errorMsg}`);
            errors.push(errorMsg);
        } catch (err) {
            const errorMsg = `${proxyName}: ${err instanceof Error ? err.message : String(err)}`;
            // Use debug or warn instead of error for individual proxy failures to avoid triggering dev overlays too aggressively
            console.debug(`[PROXY] Proxy failure for ${url} via ${proxyName}:`, errorMsg);
            errors.push(errorMsg);
        }
    }

    // Final direct fetch attempt if not already tried and not internal
    if (!CORS_PROXIES.includes('') && !url.includes('localhost')) {
        try {
            console.log(`[PROXY] Final direct fetch fallback for: ${url}`);
            const response = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(5000) });
            if (response.ok) return response;
        } catch (e) {
            console.debug(`[PROXY] Direct fallback failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    console.warn(`[PROXY] All attempts failed for: ${url}`);
    throw new Error(`Failed to fetch ${url} | ${errors[0] || 'Unknown error'}`);
}

const manifestCache: Record<string, StremioManifest> = {};

export async function fetchAddonManifest(url: string): Promise<StremioManifest | null> {
    if (manifestCache[url]) return manifestCache[url];

    try {
        const response = await fetchWithProxy(url, false);

        if (!response.ok) {
            console.warn(`[MeFlix] Manifest server returned ${response.status} for ${url}`);
            return null;
        }

        const manifest = await safeJson<StremioManifest>(response);
        if (!manifest || !manifest.id || !manifest.name) {
            console.warn(`[MeFlix] Invalid manifest or non-JSON response from ${url}`);
            return null;
        }

        manifestCache[url] = manifest;
        return manifest;
    } catch (err) {
        console.warn(`[MeFlix] Manifest fetch failed for ${url}:`, err instanceof Error ? err.message : String(err));

        if (DEMO_MODE) {
            console.warn(`[MeFlix] Returning mock manifest for: ${url}`);
            return {
                id: url.includes('cinemeta') ? 'cinemeta' : 'addon',
                name: url.includes('cinemeta') ? 'Cinemeta' : 'Offline Addon',
                version: '1.0.0',
                description: 'Offline/Mock Addon',
                types: ['movie', 'series', 'anime'],
                catalogs: [],
                resources: []
            };
        }
        return null; // Return null instead of throwing
    }
}

export async function fetchCatalog(
    addonUrl: string,
    type: string,
    id: string,
    extra?: Record<string, string>,
    includeNSFWFallback: boolean = false
): Promise<StremioCatalogResponse> {
    const isNSFWContext = id === 'nsfw' || includeNSFWFallback;

    if (DEMO_MODE) {
        let sourceArr = TRENDING_CONTENT;
        if (isNSFWContext) sourceArr = MOCK_NSFW;
        else if (type === 'movie') sourceArr = MOCK_MOVIES;
        else if (type === 'series') sourceArr = MOCK_SERIES;
        else if (type === 'anime') sourceArr = MOCK_ANIME;

        // Apply strict NSFW filtering
        const filteredSource = isNSFWContext
            ? sourceArr.filter(m => m.isNSFW)
            : sourceArr.filter(m => !m.isNSFW);

        const metas: StremioMeta[] = filteredSource.map(m => ({
            id: m.id,
            name: m.title,
            type: m.type,
            poster: m.poster,
            background: m.backdrop,
            description: m.description,
            imdbRating: m.rating,
            year: parseInt(m.year),
            releaseInfo: m.year
        }));
        return { metas };
    }

    // REAL MODE: Verify if the catalog exists in the manifest before fetching
    let resolvedId = id;
    let manifest: StremioManifest;

    try {
        manifest = await fetchAddonManifest(addonUrl) as StremioManifest;
        if (!manifest) {
            console.warn(`[MeFlix] Could not load manifest for ${addonUrl}`);
            return { metas: [] };
        }

        // Dynamic resolution for NSFW or generic IDs
        if (id === 'nsfw') {
            const firstCatalog = manifest.catalogs?.find(c => c.type === type);
            if (firstCatalog) {
                console.log(`[MeFlix] Resolved 'nsfw' to catalog '${firstCatalog.id}' for ${manifest.name}`);
                resolvedId = firstCatalog.id;
            } else {
                console.warn(`[MeFlix] No catalog of type '${type}' found in manifest for ${manifest.name}`);
                return { metas: [] };
            }
        }

        const hasCatalog = manifest.catalogs?.some(c =>
            c.type === type && (c.id === resolvedId || c.id === `${type}_${resolvedId}`)
        );

        if (!hasCatalog && id !== 'search') {
            console.warn(`[MeFlix] Catalog ${type}/${resolvedId} not found in manifest for ${addonUrl}. Skipping fetch.`);
            return { metas: [] };
        }
    } catch (e) {
        console.warn(`[MeFlix] Manifest guard triggered for ${addonUrl}: Addon is likely offline. Skipping catalog fetch.`);
        return { metas: [] };
    }

    try {
        const baseUrl = addonUrl.replace("/manifest.json", "");
        let url = `${baseUrl}/catalog/${type}/${resolvedId}`;

        if (extra) {
            const query = new URLSearchParams(extra).toString();
            if (query) url += `/${query}`;
        }

        url += ".json";

        const response = await fetchWithProxy(url);
        if (!response.ok || response.status === 404) {
            return { metas: [] };
        }

        const data = await safeJson<StremioCatalogResponse>(response);
        if (!data || !data.metas) return { metas: [] };

        return data;
    } catch (err) {
        console.warn(`[MeFlix] Catalog fetch failed for ${addonUrl} [${type}/${resolvedId}]:`, err instanceof Error ? err.message : String(err));
        return { metas: [] };
    }
}

export async function fetchMetadata(
    addonUrl: string,
    type: string,
    id: string
): Promise<StremioMetaResponse> {
    if (DEMO_MODE) {
        const allData = [...MOCK_MOVIES, ...MOCK_SERIES, ...MOCK_ANIME, ...MOCK_NSFW];
        const movie = allData.find(m => m.id === id) || MOCK_MOVIES[0];

        return {
            meta: {
                id: movie.id,
                name: movie.title,
                type: movie.type,
                poster: movie.poster,
                background: movie.backdrop,
                description: movie.description,
                imdbRating: movie.rating,
                year: parseInt(movie.year),
                releaseInfo: movie.year,
                runtime: "120 min",
                genres: ["Action", "Sci-Fi"]
            }
        };
    }

    const baseUrl = addonUrl.replace("/manifest.json", "");
    const url = `${baseUrl}/meta/${type}/${id}.json`;

    const response = await fetchWithProxy(url);
    const data = await safeJson<StremioMetaResponse>(response);
    return data || { meta: null as any };
}

export async function fetchStreams(
    addonUrl: string,
    type: string,
    id: string
): Promise<StremioStreamResponse> {
    if (DEMO_MODE) {
        return {
            streams: [
                {
                    title: "1080p | Direct | Demo",
                    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
                }
            ]
        };
    }

    const baseUrl = addonUrl.replace("/manifest.json", "");
    const url = `${baseUrl}/stream/${type}/${id}.json`;

    const response = await fetchWithProxy(url);
    const data = await safeJson<StremioStreamResponse>(response);
    return data || { streams: [] };
}

export async function fetchSearch(
    addonUrl: string,
    type: string,
    query: string,
    includeNSFW: boolean = false
): Promise<StremioCatalogResponse> {
    if (DEMO_MODE) {
        console.log(`[SEARCH] Query: "${query}" | Include NSFW: ${includeNSFW}`);
        const searchTerm = query.toLowerCase();

        // Search across EVERYTHING in demo mode
        const allMockData = [
            ...MOCK_MOVIES,
            ...MOCK_SERIES,
            ...MOCK_ANIME,
            ...MOCK_NSFW
        ];

        console.log(`[SEARCH] Total items to search: ${allMockData.length}`);
        console.log(`[SEARCH] First 3 items: ${allMockData.slice(0, 3).map(i => i.title).join(', ')}`);

        // Filter by term AND NSFW policy
        const filtered = allMockData.filter(m => {
            const matchesSearch = m.title.toLowerCase().includes(searchTerm) ||
                (m.description && m.description.toLowerCase().includes(searchTerm));

            if (!matchesSearch) return false;

            // If on regular page, filter out isNSFW: true
            if (!includeNSFW && m.isNSFW) return false;

            return true;
        });

        console.log(`[SEARCH] Results found: ${filtered.length}`);
        console.log(`[SEARCH] Result titles: ${filtered.map(r => r.title).join(', ')}`);

        const metas: StremioMeta[] = filtered.map(m => ({
            id: m.id,
            name: m.title,
            type: m.type,
            poster: m.poster,
            background: m.backdrop,
            description: m.description,
            imdbRating: m.rating,
            year: parseInt(m.year),
            releaseInfo: m.year,
            isNSFW: m.isNSFW // Explicitly pass this through
        }));
        return { metas };
    }

    const baseUrl = addonUrl.replace("/manifest.json", "");
    const url = `${baseUrl}/catalog/${type}/search=${encodeURIComponent(query)}.json`;

    const response = await fetchWithProxy(url);
    const data = await safeJson<StremioCatalogResponse>(response);
    return data || { metas: [] };
}

/**
 * Fetch and aggregate live content from multiple addons.
 * Normalizes different catalog types and genres into a unified format.
 */
export async function fetchLiveContent(liveAddons: any[]): Promise<LiveContentItem[]> {
    const allItems: LiveContentItem[] = [];

    const fetchPromises = liveAddons.map(async (addon) => {
        try {
            // Get manifest (use cached if available)
            const manifest = addon.manifest || await fetchAddonManifest(addon.url);
            if (!manifest || !manifest.catalogs) return;

            const baseUrl = addon.url.replace("/manifest.json", "");

            // Iterate through each catalog defined in the manifest
            for (const catalog of manifest.catalogs) {
                // Only fetch TV, PPV, or Events catalogs for the live page
                const isLiveType = ['tv', 'PPV', 'events'].includes(catalog.type);
                if (!isLiveType) continue;

                try {
                    const url = `${baseUrl}/catalog/${catalog.type}/${catalog.id}.json`;
                    console.log(`[LIVE] Fetching catalog "${catalog.name || catalog.id}" (${catalog.type}) from ${manifest.name}`);

                    const res = await fetchWithProxy(url);
                    if (!res.ok) continue;

                    const data = await safeJson<StremioCatalogResponse>(res);
                    if (!data || !data.metas) continue;

                    const normalizedItems = data.metas.map((meta: StremioMeta) => {
                        // Extract category from meta genres or catalog name
                        let rawCategory = meta.genres?.[0] || catalog.name || 'Other';
                        const category = CATEGORY_MAP[rawCategory] || CATEGORY_MAP[rawCategory.toLowerCase()] || rawCategory;

                        return {
                            id: meta.id,
                            name: meta.name,
                            poster: meta.poster,
                            logo: meta.logo || meta.poster,
                            description: meta.description,
                            type: meta.type,
                            category,
                            addonName: manifest.name,
                            addonBaseUrl: baseUrl,
                            isLive: true
                        } as LiveContentItem;
                    });

                    allItems.push(...normalizedItems);
                } catch (catErr) {
                    console.warn(`[LIVE] Failed to fetch catalog ${catalog.id} from ${manifest.name}:`, catErr);
                }
            }
        } catch (addonErr) {
            console.warn(`[LIVE] Failed to process addon ${addon.url}:`, addonErr);
        }
    });

    // Wait for all addons to finish fetching
    await Promise.allSettled(fetchPromises);

    // Deduplicate by Name (Case-insensitive) across all addons
    const seenNames = new Set();
    return allItems.filter(item => {
        const normalizedName = item.name.toLowerCase().trim();
        if (seenNames.has(normalizedName)) return false;
        seenNames.add(normalizedName);
        return true;
    });
}

// ─── NSFW Content ────────────────────────────────────────────────────────────

export interface NSFWContentItem {
    id: string;
    name: string;
    poster?: string;
    description?: string;
    type: string;
    genres?: string[];
    addonName: string;
    addonId: string;
    addonBaseUrl: string;
}

export async function fetchNSFWContent(nsfwAddons: { url: string; name: string; id?: string; manifest?: StremioManifest; isEnabled?: boolean }[]): Promise<NSFWContentItem[]> {
    const allItems: NSFWContentItem[] = [];

    const fetchPromises = nsfwAddons.map(async (addon) => {
        if (addon.isEnabled === false) return;
        try {
            const manifest = addon.manifest || await fetchAddonManifest(addon.url);
            if (!manifest || !manifest.catalogs) return;

            const baseUrl = addon.url.replace('/manifest.json', '');

            // Pick the first default catalog per addon (avoid search-only catalogs)
            const defaultCatalogs = manifest.catalogs.filter(c =>
                !c.extra?.some((e: { name: string; isRequired?: boolean }) => e.name === 'search' && e.isRequired)
            );

            // Fetch the first 2 catalogs per addon
            const catalogsToFetch = defaultCatalogs.slice(0, 2);

            for (const catalog of catalogsToFetch) {
                try {
                    const url = `${baseUrl}/catalog/${catalog.type}/${catalog.id}.json`;
                    const res = await fetchWithProxy(url);
                    if (!res.ok) continue;

                    const data = await safeJson<StremioCatalogResponse>(res);
                    if (!data || !data.metas) continue;

                    const items = data.metas.map((meta: StremioMeta) => ({
                        id: meta.id,
                        name: meta.name,
                        poster: meta.poster || meta.logo,
                        description: meta.description,
                        type: meta.type || catalog.type,
                        genres: meta.genres,
                        addonName: manifest.name,
                        addonId: addon.id || manifest.id,
                        addonBaseUrl: baseUrl,
                    } as NSFWContentItem));

                    allItems.push(...items);
                } catch (catErr) {
                    console.warn(`[NSFW] Failed to fetch catalog ${catalog.id} from ${manifest.name}:`, catErr);
                }
            }
        } catch (addonErr) {
            console.warn(`[NSFW] Failed to process addon ${addon.url}:`, addonErr);
        }
    });

    await Promise.allSettled(fetchPromises);

    // Deduplicate by Name (Case-insensitive)
    const seenNames = new Set<string>();
    return allItems.filter(item => {
        const key = item.name.toLowerCase().trim();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
    });
}
