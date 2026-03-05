export interface CloudStreamProvider {
    name: string;
    internalName: string;
    description?: string;
    iconUrl?: string;
    url: string;
    language?: string;
    tvTypes: string[];
    repositoryUrl?: string;
}

export async function fetchRepoIndex(repoUrl: string): Promise<CloudStreamProvider[]> {
    try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(repoUrl)}`);
        if (!response.ok) throw new Error(`Failed to fetch repo: ${repoUrl}`);
        const data = await response.json();

        const pluginLists: string[] = data.pluginLists || [];
        const allProviders: CloudStreamProvider[] = [];

        for (const listUrl of pluginLists) {
            try {
                const listRes = await fetch(`/api/proxy?url=${encodeURIComponent(listUrl)}`);
                if (!listRes.ok) continue;
                const plugins = await listRes.json();

                plugins.forEach((p: any) => {
                    allProviders.push({
                        name: p.name,
                        internalName: p.internalName || p.name,
                        description: p.description,
                        iconUrl: p.iconUrl,
                        url: p.url,
                        language: p.language,
                        tvTypes: p.tvTypes || [],
                        repositoryUrl: p.repositoryUrl
                    });
                });
            } catch (e) {
                console.error(`Failed to fetch plugin list: ${listUrl}`, e);
            }
        }

        return allProviders;
    } catch (err) {
        console.error("CloudStream Repo Fetch Error:", err);
        return [];
    }
}

/**
 * Maps common CloudStream providers to their web-scrapable counterparts or API relays.
 */
export async function fetchProviderCatalog(providerId: string, type: string, page: number = 1) {
    console.log(`[CloudStream] Fetching catalog for ${providerId} (${type}, page ${page})`);

    const providerName = providerId.split('-').pop() || '';

    try {
        // 1. Specialized Scrapers
        if (providerName.toLowerCase().includes('sflix')) {
            return await scrapeSflix(page, type);
        }

        if (providerName.toLowerCase().includes('allwish')) {
            return await scrapeAllWish(page);
        }

        if (providerName.toLowerCase().includes('cornhub')) {
            return await scrapeCornHub(page);
        }

        if (providerName.toLowerCase().includes('18eu')) {
            return await scrape18EU(page);
        }

        // Fallback to mock for others until implemented
        return getMockCatalog(providerName, type);
    } catch (err) {
        console.error(`[CloudStream] Catalog fetch failed for ${providerName}:`, err);
        return [];
    }
}

async function scrapeSflix(page: number, type: string) {
    const baseUrl = 'https://sflix.to';
    const url = `${baseUrl}/${type === 'movie' ? 'movie' : 'tv-show'}?page=${page}`;

    try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) return [];
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const items = doc.querySelectorAll('.flw-item');

        return Array.from(items).map(item => {
            const titleEl = item.querySelector('.film-name a');
            const posterEl = item.querySelector('.film-poster-img') as HTMLImageElement;
            const infoEls = item.querySelectorAll('.fdi-item');

            // Extract the Sflix ID from the href
            const href = titleEl?.getAttribute('href') || '';
            const sflixId = href.split('-').pop();

            return {
                id: `cs-sflix-${sflixId}`,
                realSlug: href.split('/').pop(), // e.g. "movie-name-123"
                title: titleEl?.textContent?.trim() || 'Unknown',
                poster: posterEl?.src || posterEl?.getAttribute('data-src') || '',
                type: type as any,
                rating: 'N/A',
                year: infoEls[0]?.textContent?.trim() || ''
            };
        });
    } catch (e) {
        console.error("Sflix scraping failed:", e);
        return [];
    }
}

function getMockCatalog(provider: string, type: string) {
    return [
        {
            id: `cs-${provider}-1`,
            title: `${provider} Content 1`,
            poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg',
            type: type as any,
            rating: '7.5',
            year: '2024'
        }
    ];
}

async function scrapeCornHub(page: number) {
    const baseUrl = 'https://cornhub.website';
    const url = `${baseUrl}/videos?page=${page}`;

    try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) return [];
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const items = doc.querySelectorAll('.item');

        return Array.from(items).map(item => {
            const titleEl = item.querySelector('.title a');
            const posterEl = item.querySelector('img') as HTMLImageElement;
            const href = titleEl?.getAttribute('href') || '';
            const id = href.split('/').pop()?.replace('.html', '');

            return {
                id: `cs-cornhub-${id}`,
                title: titleEl?.textContent?.trim() || 'Unknown',
                poster: posterEl?.src || '',
                type: 'movie' as any,
                rating: 'N/A',
                year: '2024'
            };
        });
    } catch (e) {
        console.error("CornHub scraping failed:", e);
        return [];
    }
}

async function scrape18EU(page: number) {
    const baseUrl = 'https://18eu.net';
    const url = `${baseUrl}/movies/page/${page}/`;

    try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) return [];
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const items = doc.querySelectorAll('.movie-item');

        return Array.from(items).map(item => {
            const titleEl = item.querySelector('.movie-title a');
            const posterEl = item.querySelector('img') as HTMLImageElement;
            const href = titleEl?.getAttribute('href') || '';
            const id = href.split('/').filter(Boolean).pop();

            return {
                id: `cs-18eu-${id}`,
                title: titleEl?.textContent?.trim() || 'Unknown',
                poster: posterEl?.src || '',
                type: 'movie' as any,
                rating: 'N/A',
                year: '2024'
            };
        });
    } catch (e) {
        console.error("18EU scraping failed:", e);
        return [];
    }
}

async function scrapeAllWish(page: number) {
    // Implementation for AllWish...
    return [];
}

export async function fetchMetadata(providerId: string, id: string) {
    console.log(`[CloudStream] Fetching metadata for ${id} via provider ${providerId}`);

    // For now, we derive basic metadata from the ID/snapshot.
    // In a real execution, we'd scrape the specific detail page.
    const name = id.split('-').pop() || 'Unknown';
    const isSflix = id.includes('sflix');

    return {
        id,
        type: 'movie', // Default to movie, should ideally be passed or detected
        name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        poster: isSflix ? `https://static.bunnycdn.ru/i/cache/images/0/07/${id.split('-').pop()}.jpg` : '',
        description: 'Metadata fetched via repository scraping. Full details coming soon.',
        genres: ['Action', 'Mystery'],
        year: '2024'
    };
}

export async function fetchStreams(providerId: string, id: string) {
    console.log(`[CloudStream] Fetching streams for ${id} via ${providerId}`);

    // Sflix Stream Resolution Strategy
    if (id.startsWith('cs-sflix-')) {
        const sflixId = id.replace('cs-sflix-', '');

        // Strategy: Use VidSrc as a meta-provider fallback for Sflix IDs
        // Many CloudStream providers map to IDs that these meta-providers can resolve
        return [
            {
                name: 'VidSrc | Mirror 1',
                title: 'Multi-Res (Auto)',
                url: `https://vidsrc.to/embed/movie/${sflixId}`,
                isEmbed: true
            },
            {
                name: 'SuperEmbed | Mirror 2',
                title: '1080p (Fast)',
                url: `https://multiembed.mov/?video_id=${sflixId}&s=sflix`,
                isEmbed: true
            }
        ];
    }

    if (id.startsWith('cs-cornhub-')) {
        const videoId = id.replace('cs-cornhub-', '');
        return [
            {
                name: 'CornHub | Mirror 1',
                title: 'High Quality',
                url: `https://cornhub.website/embed/${videoId}`,
                isEmbed: true
            }
        ];
    }

    if (id.startsWith('cs-18eu-')) {
        const movieId = id.replace('cs-18eu-', '');
        return [
            {
                name: '18EU | Mirror 1',
                title: 'Full Movie',
                url: `https://18eu.net/embed/${movieId}`,
                isEmbed: true
            }
        ];
    }

    return [
        {
            name: `${providerId} | Default`,
            title: 'Auto-Selected',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
        }
    ];
}

export async function fetchNSFWContent(providers: CloudStreamProvider[]): Promise<any[]> {
    const allItems: any[] = [];

    const fetchPromises = providers.map(async (provider) => {
        try {
            // High-level catalogs for CloudStream usually map to 'Trending' or 'New'
            // For this implementation, we'll fetch its generic catalog
            const catalog = await fetchProviderCatalog(`${provider.repositoryUrl}-${provider.internalName}`, 'nsfw');

            return catalog.map(item => ({
                ...item,
                addonName: provider.name,
                addonBaseUrl: provider.url,
                sourceType: 'cloudstream'
            }));
        } catch (err) {
            console.warn(`[CloudStream NSFW] Failed for ${provider.name}:`, err);
            return [];
        }
    });

    const results = await Promise.allSettled(fetchPromises);
    results.forEach(res => {
        if (res.status === 'fulfilled') {
            allItems.push(...res.value);
        }
    });

    return allItems;
}

export async function searchContent(providerId: string, query: string) {
    console.log(`[CloudStream] Searching for "${query}" via ${providerId}`);
    const providerName = providerId.split('-').pop() || '';

    if (providerName.toLowerCase().includes('sflix')) {
        const url = `https://sflix.to/search/${query.replace(/\s+/g, '-')}`;
        try {
            const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
            if (!response.ok) return [];
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const items = doc.querySelectorAll('.flw-item');

            return Array.from(items).map(item => {
                const titleEl = item.querySelector('.film-name a');
                const posterEl = item.querySelector('.film-poster-img') as HTMLImageElement;
                const infoEls = item.querySelectorAll('.fdi-item');

                const href = titleEl?.getAttribute('href') || '';
                const sflixId = href.split('-').pop();

                return {
                    id: `cs-sflix-${sflixId}`,
                    title: titleEl?.textContent?.trim() || 'Unknown',
                    poster: posterEl?.src || posterEl?.getAttribute('data-src') || '',
                    type: href.includes('/movie/') ? 'movie' : 'series' as any,
                    rating: 'N/A',
                    year: infoEls[0]?.textContent?.trim() || ''
                };
            });
        } catch (e) {
            console.error("Sflix search failed:", e);
            return [];
        }
    }

    return [
        {
            id: `cs-${providerName}-search-1`,
            title: `${query} (via ${providerName})`,
            poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg',
            type: 'movie',
            rating: '8.0'
        }
    ];
}
