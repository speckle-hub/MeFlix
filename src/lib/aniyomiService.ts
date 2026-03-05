export interface AniyomiSource {
    name: string;
    id: string;
    baseUrl: string;
    lang: string;
}

export interface AniyomiExtension {
    name: string;
    pkg: string;
    version: string;
    nsfw: number;
    sources: AniyomiSource[];
}

export async function fetchRepoIndex(repoUrl: string): Promise<AniyomiExtension[]> {
    try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(repoUrl)}`);
        if (!response.ok) throw new Error(`Failed to fetch Aniyomi repo: ${repoUrl}`);
        const data = await response.json();

        if (Array.isArray(data)) {
            return data.map((ext: any) => ({
                name: ext.name,
                pkg: ext.pkg,
                version: ext.version,
                nsfw: ext.nsfw,
                sources: ext.sources || []
            }));
        }
        return [];
    } catch (err) {
        console.error("Aniyomi Repo Fetch Error:", err);
        return [];
    }
}

export async function fetchProviderCatalog(sourceId: string, type: string, page: number = 1) {
    console.log(`[Aniyomi] Fetching catalog for source ${sourceId} (${type}, page ${page})`);

    try {
        if (sourceId.toLowerCase().includes('gogoanime')) {
            return await scrapeGogoAnime(page);
        }

        if (sourceId.toLowerCase().includes('animeidhentai')) {
            return await scrapeAnimeIdHentai(page);
        }

        // Fallback mock
        return [
            {
                id: `ani-${sourceId}-monster`,
                title: 'Monster',
                poster: 'https://images.justwatch.com/poster/306786603/s592/monster.webp',
                type: 'series',
                rating: '8.7',
                year: '2004'
            }
        ];
    } catch (err) {
        console.error(`[Aniyomi] Catalog fetch failed for ${sourceId}:`, err);
        return [];
    }
}

async function scrapeAnimeIdHentai(page: number) {
    const baseUrl = 'https://animeidhentai.com';
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
                id: `ani-hentai-${id}`,
                title: titleEl?.textContent?.trim() || 'Unknown',
                poster: posterEl?.src || '',
                type: 'series' as any,
                rating: 'N/A',
                year: '2024'
            };
        });
    } catch (e) {
        console.error("AnimeIdHentai scraping failed:", e);
        return [];
    }
}

async function scrapeGogoAnime(page: number) {
    const baseUrl = 'https://gogoanime3.co';
    const url = `${baseUrl}/popular.html?page=${page}`;

    try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) return [];
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const items = doc.querySelectorAll('.items li');

        return Array.from(items).map(item => {
            const titleEl = item.querySelector('.name a');
            const posterEl = item.querySelector('img') as HTMLImageElement;
            const releasedEl = item.querySelector('.released');

            const href = titleEl?.getAttribute('href') || '';
            const animeId = href.split('/').pop();

            return {
                id: `ani-gogo-${animeId}`,
                realSlug: animeId,
                title: titleEl?.textContent?.trim() || 'Unknown',
                poster: posterEl?.src || '',
                type: 'series' as any,
                rating: 'N/A',
                year: releasedEl?.textContent?.replace('Released:', '').trim() || ''
            };
        });
    } catch (e) {
        console.error("GogoAnime scraping failed:", e);
        return [];
    }
}

export async function fetchMetadata(sourceId: string, id: string) {
    console.log(`[Aniyomi] Fetching metadata for ${id} via source ${sourceId}`);

    const isGogo = id.startsWith('ani-gogo-');
    const isHentai = id.startsWith('ani-hentai-');
    const name = id.split('-').pop() || 'Unknown Anime';

    return {
        id,
        type: 'series',
        name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        poster: isGogo ? `https://gogocdn.net/cover/${id.replace('ani-gogo-', '')}.png` :
            isHentai ? `https://animeidhentai.com/wp-content/uploads/covers/${id.replace('ani-hentai-', '')}.jpg` : '',
        description: 'Anime details fetched via Aniyomi repository scraping. Explore episodes below.',
        genres: ['Anime', 'Animation', 'Hentai'],
        year: '2024'
    };
}

export async function fetchStreams(sourceId: string, id: string) {
    console.log(`[Aniyomi] Fetching streams for ${id} via source ${sourceId}`);

    if (id.startsWith('ani-hentai-')) {
        const hentaiId = id.replace('ani-hentai-', '');
        return [
            {
                name: 'AnimeIdHentai | Mirror 1',
                title: '720p/1080p',
                url: `https://animeidhentai.com/embed/${hentaiId}`,
                isEmbed: true
            }
        ];
    }

    if (id.startsWith('ani-gogo-')) {
        const animeId = id.replace('ani-gogo-', '');
        // Strategy: Use a known anime embed fallback for GogoAnime IDs
        return [
            {
                name: 'Gogo Stream | Mirror 1',
                title: '720p/1080p',
                url: `https://vidsrc.to/embed/anime/${animeId}`, // Some meta-providers support anime slugs
                isEmbed: true
            },
            {
                name: 'HLS Direct | Test',
                title: 'Multi-Res',
                url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
            }
        ];
    }

    return [
        {
            name: `Aniyomi | ${sourceId}`,
            title: 'Auto-Selected',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
        }
    ];
}

export async function searchContent(sourceId: string, query: string) {
    console.log(`[Aniyomi] Searching for "${query}" via source ${sourceId}`);

    if (sourceId.toLowerCase().includes('gogoanime')) {
        const baseUrl = 'https://gogoanime3.co';
        const url = `${baseUrl}/search.html?keyword=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
            if (!response.ok) return [];
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const items = doc.querySelectorAll('.items li');

            return Array.from(items).map(item => {
                const titleEl = item.querySelector('.name a');
                const posterEl = item.querySelector('img') as HTMLImageElement;
                const releasedEl = item.querySelector('.released');
                const href = titleEl?.getAttribute('href') || '';
                const animeId = href.split('/').pop();

                return {
                    id: `ani-gogo-${animeId}`,
                    title: titleEl?.textContent?.trim() || 'Unknown',
                    poster: posterEl?.src || '',
                    type: 'series' as any,
                    rating: 'N/A',
                    year: releasedEl?.textContent?.replace('Released:', '').trim() || ''
                };
            });
        } catch (e) {
            console.error("GogoAnime search failed:", e);
            return [];
        }
    }

    return [];
}

export async function fetchNSFWContent(extensions: AniyomiExtension[]): Promise<any[]> {
    const allItems: any[] = [];

    // Aniyomi is primarily anime, but some extensions are NSFW
    const fetchPromises = extensions.flatMap(ext =>
        ext.sources.map(async (source) => {
            try {
                const catalog = await fetchProviderCatalog(source.id, 'nsfw');
                return catalog.map(item => ({
                    ...item,
                    addonName: `${ext.name} - ${source.name}`,
                    addonBaseUrl: source.baseUrl,
                    sourceType: 'aniyomi'
                }));
            } catch (err) {
                console.warn(`[Aniyomi NSFW] Failed for ${source.name}:`, err);
                return [];
            }
        })
    );

    const results = await Promise.allSettled(fetchPromises);
    results.forEach(res => {
        if (res.status === 'fulfilled') {
            allItems.push(...res.value);
        }
    });

    return allItems;
}
