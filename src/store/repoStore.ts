import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RepoType = 'cloudstream' | 'aniyomi';

export interface RepoExtension {
    id: string;
    name: string;
    description?: string;
    iconUrl?: string;
    baseUrl?: string;
    language?: string;
    type: RepoType;
    isEnabled: boolean;
    isNSFW: boolean;
    tvTypes?: string[]; // For CloudStream
}

interface Repository {
    url: string;
    type: RepoType;
    name: string;
    isEnabled: boolean;
    isNSFW: boolean;
    lastFetched?: number;
}

interface RepoState {
    repositories: Repository[];
    extensions: RepoExtension[];
    isHydrated: boolean;

    // Actions
    addRepository: (url: string, type: RepoType, isNSFW?: boolean) => Promise<boolean>;
    removeRepository: (url: string) => void;
    toggleRepository: (url: string) => void;
    toggleExtension: (id: string) => void;
    refreshRepositories: () => Promise<void>;
    setHydrated: (value: boolean) => void;
}

export const CLOUDSTREAM_REPOS = [
    { url: "https://raw.githubusercontent.com/self-similarity/MegaRepo/builds/repo.json", name: "MegaRepo", isNSFW: false },
    { url: "https://raw.githubusercontent.com/CranberrySoup/AniyomiCompatExtension/master/repo.json", name: "Aniyomi Compact", isNSFW: false },
    { url: "https://raw.githubusercontent.com/CakesTwix/cloudstream-extensions-uk/master/repo.json", name: "CakesTwix", isNSFW: false },
    { url: "https://raw.githubusercontent.com/Asm0d3usX/CloudX/builds/repo.json", name: "CloudX", isNSFW: false },
    { url: "https://raw.githubusercontent.com/SaurabhKaperwan/CSX/builds/CS.json", name: "CSX", isNSFW: false },
    { url: "https://raw.githubusercontent.com/ycngmn/CuxPlug/refs/heads/main/repo.json", name: "CuxPlug", isNSFW: false },
    { url: "https://raw.githubusercontent.com/doGior/doGiorsHadEnough/refs/heads/builds/repo.json", name: "doGior", isNSFW: false },
    { url: "https://raw.githubusercontent.com/Gian-Fr/ItalianProvider/builds/repo.json", name: "Gian-Fr", isNSFW: false },
    { url: "https://raw.githubusercontent.com/Kraptor123/cs-kraptor/refs/heads/master/repo.json", name: "Kraptor", isNSFW: false },
    { url: "https://raw.githubusercontent.com/Sushan64/NetMirror-Extension/refs/heads/builds/Netflix.json", name: "NetMirror", isNSFW: false },
    { url: "https://raw.githubusercontent.com/phisher98/cloudstream-extensions-phisher/refs/heads/builds/repo.json", name: "Phisher", isNSFW: false },
    { url: "https://raw.githubusercontent.com/redowan99/Redowan-CloudStream/master/repo.json", name: "Redowan", isNSFW: false },
    { url: "https://gitlab.com/tearrs/cloudstream-vietnamese/-/raw/main/repo.json", name: "Tearrs", isNSFW: false },
    { url: "https://codeberg.org/zzikozz/frencharchive/raw/branch/Release/repo.json", name: "zzikozz", isNSFW: false },
];

export const CLOUDSTREAM_NSFW_REPOS = [
    { url: "https://raw.githubusercontent.com/phisher98/CXXX/builds/CXXX.json", name: "CXXX", isNSFW: true },
    { url: "https://raw.githubusercontent.com/Kraptor123/Cs-GizliKeyif/refs/heads/master/repo.json", name: "GizliKeyif", isNSFW: true },
];

export const ANIYOMI_REPOS = [
    { url: "https://kohiden.xyz/Kohi-den/extensions/raw/branch/main/index.min.json", name: "Kohi-den", isNSFW: false },
    { url: "https://raw.githubusercontent.com/yuzono/anime-repo/repo/index.min.json", name: "Yūzōnō", isNSFW: false },
    { url: "https://raw.githubusercontent.com/Secozzi/aniyomi-extensions/refs/heads/repo/index.min.json", name: "Secozzi", isNSFW: false },
    { url: "https://raw.githubusercontent.com/Claudemirovsky/cursedyomi-extensions/repo/index.min.json", name: "Claudemirovsky", isNSFW: false },
    { url: "https://codeberg.org/hollow/aniyomi-extensions-fr/media/branch/repo/index.min.json", name: "hollow", isNSFW: false },
];

export const useRepoStore = create<RepoState>()(
    persist(
        (set, get) => ({
            repositories: [],
            extensions: [],
            isHydrated: false,

            setHydrated: (value) => set({ isHydrated: value }),

            addRepository: async (url, type, isNSFW = false) => {
                const existing = get().repositories.find(r => r.url === url);
                if (existing) return true;

                const newRepo: Repository = {
                    url,
                    type,
                    name: url.split('/').pop() || 'Unknown Repo',
                    isEnabled: true,
                    isNSFW,
                    lastFetched: Date.now()
                };

                set(state => ({
                    repositories: [...state.repositories, newRepo]
                }));

                await get().refreshRepositories();
                return true;
            },

            removeRepository: (url) => {
                set(state => ({
                    repositories: state.repositories.filter(r => r.url !== url),
                    extensions: state.extensions.filter(ext => !ext.id.startsWith(url)) // Simple cleanup
                }));
            },

            toggleRepository: (url) => {
                set(state => ({
                    repositories: state.repositories.map(r =>
                        r.url === url ? { ...r, isEnabled: !r.isEnabled } : r
                    )
                }));
            },

            toggleExtension: (id) => {
                set(state => ({
                    extensions: state.extensions.map(ext =>
                        ext.id === id ? { ...ext, isEnabled: !ext.isEnabled } : ext
                    )
                }));
            },

            refreshRepositories: async () => {
                const { repositories } = get();
                const allExtensions: RepoExtension[] = [];

                for (const repo of repositories) {
                    if (!repo.isEnabled) continue;

                    try {
                        const response = await fetch(`/api/proxy?url=${encodeURIComponent(repo.url)}`);
                        if (!response.ok) continue;
                        const data = await response.json();

                        if (repo.type === 'cloudstream') {
                            const pluginLists = data.pluginLists || [];
                            for (const listUrl of pluginLists) {
                                const listRes = await fetch(`/api/proxy?url=${encodeURIComponent(listUrl)}`);
                                if (!listRes.ok) continue;
                                const plugins = await listRes.json();

                                plugins.forEach((p: any) => {
                                    allExtensions.push({
                                        id: `${repo.url}-${p.internalName || p.name}`,
                                        name: p.name,
                                        description: p.description,
                                        iconUrl: p.iconUrl,
                                        baseUrl: p.repositoryUrl,
                                        language: p.language,
                                        type: 'cloudstream',
                                        isEnabled: true,
                                        isNSFW: repo.isNSFW,
                                        tvTypes: p.tvTypes
                                    });
                                });
                            }
                        } else if (repo.type === 'aniyomi') {
                            // Aniyomi format is an array of extensions
                            data.forEach((ext: any) => {
                                if (ext.sources) {
                                    ext.sources.forEach((src: any) => {
                                        allExtensions.push({
                                            id: `${repo.url}-${src.id}`,
                                            name: src.name,
                                            baseUrl: src.baseUrl,
                                            language: src.lang,
                                            type: 'aniyomi',
                                            isEnabled: true,
                                            isNSFW: repo.isNSFW || ext.nsfw === 1
                                        });
                                    });
                                }
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to refresh repo: ${repo.url}`, e);
                    }
                }

                set({ extensions: allExtensions });
            }
        }),
        {
            name: "meflix-repos",
            onRehydrateStorage: () => (state) => {
                state?.setHydrated(true);
            }
        }
    )
);
