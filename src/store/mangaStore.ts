import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MangaSource {
    id: string; // Typically pkg name or explicit ID
    name: string;
    pkg: string;
    lang: string;
    version: string;
    nsfw: number;
    repoUrl: string;
    isInstalled: boolean;
    isEnabled: boolean; // Added for fix
    baseUrl?: string; // For Suwayomi/custom
}

export interface MangaRepo {
    id: string;
    name: string;
    url: string;
    lastUpdated?: number;
}

export interface MangaReadingProgress {
    mangaId: string;
    sourceId: string;
    title: string;
    poster: string;
    chapterId: string;
    chapterTitle: string;
    page: number;
    totalChapters?: number;
    lastRead: number;
}

interface MangaState {
    repos: MangaRepo[];
    installedSources: MangaSource[];
    readingProgress: Record<string, MangaReadingProgress>; // key: sourceId:mangaId

    // Actions
    installSource: (source: MangaSource) => void;
    uninstallSource: (sourceId: string) => void;
    toggleSource: (sourceId: string) => void;
    saveReadingProgress: (progress: MangaReadingProgress) => void;
    removeFromReadingProgress: (sourceId: string, mangaId: string) => void;
}

export const MANGA_REPOS: MangaRepo[] = [
    {
        id: "keiyoushi",
        name: "Keiyoushi",
        url: "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json"
    },
    {
        id: "yuzono",
        name: "Yūzōnō",
        url: "https://raw.githubusercontent.com/yuzono/manga-repo/repo/index.min.json"
    },
    {
        id: "kavita",
        name: "Kavita",
        url: "https://raw.githubusercontent.com/Kareadita/tach-extension/repo/index.min.json"
    },
    {
        id: "suwayomi",
        name: "Suwayomi",
        url: "https://raw.githubusercontent.com/Suwayomi/tachiyomi-extension/repo/index.min.json"
    }
];

export const useMangaStore = create<MangaState>()(
    persist(
        (set, get) => ({
            repos: MANGA_REPOS,
            installedSources: [],
            readingProgress: {},

            installSource: (source) => {
                const alreadyInstalled = get().installedSources.some(s => s.id === source.id);
                if (!alreadyInstalled) {
                    set((state) => ({
                        installedSources: [...state.installedSources, { ...source, isInstalled: true, isEnabled: true }]
                    }));
                }
            },

            uninstallSource: (sourceId) => {
                set((state) => ({
                    installedSources: state.installedSources.filter(s => s.id !== sourceId)
                }));
            },

            toggleSource: (sourceId) => {
                set((state) => ({
                    installedSources: state.installedSources.map(s =>
                        s.id === sourceId ? { ...s, isEnabled: !s.isEnabled } : s
                    )
                }));
            },

            saveReadingProgress: (progress) => {
                const key = `${progress.sourceId}:${progress.mangaId}`;
                set((state) => ({
                    readingProgress: {
                        ...state.readingProgress,
                        [key]: { ...progress, lastRead: Date.now() }
                    }
                }));
            },

            removeFromReadingProgress: (sourceId, mangaId) => {
                const key = `${sourceId}:${mangaId}`;
                const newProgress = { ...get().readingProgress };
                delete newProgress[key];
                set({ readingProgress: newProgress });
            }
        }),
        {
            name: "meflix-manga-store",
        }
    )
);
