import { MangaSource, MangaRepo } from "@/store/mangaStore";

const PROXY_URL = "/api/proxy?url=";

export async function fetchMangaRepoIndex(repo: MangaRepo): Promise<MangaSource[]> {
    try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(repo.url)}`);
        if (!response.ok) throw new Error(`Failed to fetch repo: ${repo.name}`);

        const data = await response.json();

        // The structure is usually an array of extensions
        // Each entry: { name, pkg, lang, version, nsfw, sources: [] }
        if (Array.isArray(data)) {
            return data.map(item => ({
                id: item.pkg || item.name,
                name: item.name,
                pkg: item.pkg,
                lang: item.lang,
                version: item.version,
                nsfw: item.nsfw || 0,
                repoUrl: repo.url,
                isInstalled: false,
                isEnabled: false
            }));
        }

        return [];
    } catch (err) {
        console.error(`[MangaService] Repo fetch error (${repo.name}):`, err);
        return [];
    }
}

// Self-hosted support (e.g. Suwayomi, Kavita)
export async function validateSelfHostedInstance(baseUrl: string, type: 'suwayomi' | 'kavita'): Promise<boolean> {
    try {
        const url = type === 'suwayomi' ? `${baseUrl}/api/v1/source` : `${baseUrl}/api/v1/server`;
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
        return response.ok;
    } catch (err) {
        console.error(`[MangaService] ${type} validation error:`, err);
        return false;
    }
}

// MangaDex API Integration (Priority 1)
const MANGADEX_API = "https://api.mangadex.org";

export interface MangaSearchResult {
    id: string;
    title: string;
    description: string;
    coverUrl: string;
    author: string;
    status: string;
    tags: string[];
    isAdult: boolean;
}

export async function searchMangaDex(query: string, limit = 20): Promise<MangaSearchResult[]> {
    try {
        const url = `${MANGADEX_API}/manga?title=${encodeURIComponent(query)}&limit=${limit}&includes[]=cover_art&includes[]=author`;
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
        const data = await response.json();

        if (!data.data) return [];

        return data.data.map((manga: any) => {
            const coverRel = manga.relationships.find((r: any) => r.type === "cover_art");
            const authorRel = manga.relationships.find((r: any) => r.type === "author");
            const coverFileName = coverRel?.attributes?.fileName;

            return {
                id: manga.id,
                title: manga.attributes.title.en || manga.attributes.title[Object.keys(manga.attributes.title)[0]],
                description: manga.attributes.description.en || "",
                coverUrl: coverFileName ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}` : "",
                author: authorRel?.attributes?.name || "Unknown",
                status: manga.attributes.status,
                tags: manga.attributes.tags.map((t: any) => t.attributes.name.en),
                isAdult: manga.attributes.contentRating === "erotica" || manga.attributes.contentRating === "pornographic"
            };
        });
    } catch (err) {
        console.error("[MangaService] MangaDex search error:", err);
        return [];
    }
}

export async function fetchMangaDexLatest(limit = 20, isAdult = false): Promise<MangaSearchResult[]> {
    try {
        const ratings = isAdult ? "contentRating[]=erotica&contentRating[]=pornographic" : "contentRating[]=safe&contentRating[]=suggestive";
        const url = `${MANGADEX_API}/manga?limit=${limit}&${ratings}&includes[]=cover_art&includes[]=author&order[updatedAt]=desc`;
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
        const data = await response.json();

        if (!data.data) return [];

        return data.data.map((manga: any) => {
            const coverRel = manga.relationships.find((r: any) => r.type === "cover_art");
            const authorRel = manga.relationships.find((r: any) => r.type === "author");
            const coverFileName = coverRel?.attributes?.fileName;

            return {
                id: manga.id,
                title: manga.attributes.title.en || manga.attributes.title[Object.keys(manga.attributes.title)[0]],
                description: manga.attributes.description.en || "",
                coverUrl: coverFileName ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}` : "",
                author: authorRel?.attributes?.name || "Unknown",
                status: manga.attributes.status,
                tags: manga.attributes.tags.map((t: any) => t.attributes.name.en),
                isAdult: manga.attributes.contentRating === "erotica" || manga.attributes.contentRating === "pornographic"
            };
        });
    } catch (err) {
        console.error("[MangaService] MangaDex latest error:", err);
        return [];
    }
}

export interface MangaChapter {
    id: string;
    chapter: string;
    title: string;
    volume: string;
    publishAt: string;
    language: string;
    externalUrl?: string;
}

export async function fetchMangaDexChapters(mangaId: string, limit = 100, offset = 0): Promise<MangaChapter[]> {
    try {
        const url = `${MANGADEX_API}/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&translatedLanguage[]=en&order[chapter]=desc&includeExternalUrl=0`;
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
        const data = await response.json();

        if (!data.data) return [];

        return data.data.map((chap: any) => ({
            id: chap.id,
            chapter: chap.attributes.chapter,
            title: chap.attributes.title || "",
            volume: chap.attributes.volume || "",
            publishAt: chap.attributes.publishAt,
            language: chap.attributes.translatedLanguage,
            externalUrl: chap.attributes.externalUrl
        }));
    } catch (err) {
        console.error("[MangaService] MangaDex chapters error:", err);
        return [];
    }
}

export async function fetchMangaDexPages(chapterId: string): Promise<string[]> {
    try {
        const url = `${MANGADEX_API}/at-home/server/${chapterId}`;
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
        const data = await response.json();

        if (!data.baseUrl || !data.chapter) return [];

        const host = data.baseUrl;
        const hash = data.chapter.hash;
        return data.chapter.data.map((page: string) => `${host}/data/${hash}/${page}`);
    } catch (err) {
        console.error("[MangaService] MangaDex pages error:", err);
        return [];
    }
}
