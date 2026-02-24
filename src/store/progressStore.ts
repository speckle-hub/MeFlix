import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProgressItem {
    id: string; // Base ID (e.g., tt0903747)
    type: string;
    timestamp: number;
    duration: number;
    title: string;
    poster: string;
    isNSFW: boolean;
    updatedAt: number;
    // New fields for resumption and source tracking
    fullId?: string; // Full ID (e.g., tt0903747:1:1)
    addonBaseUrl?: string;
    addonId?: string;
    season?: number;
    episode?: number;
}

interface ProgressState {
    progress: Record<string, ProgressItem>;
    saveProgress: (item: Omit<ProgressItem, "updatedAt">) => void;
    getProgress: (id: string) => ProgressItem | undefined;
    removeFromContinueWatching: (id: string) => void;
    clearAllProgress: () => void;
}

export const useProgressStore = create<ProgressState>()(
    persist(
        (set, get) => ({
            progress: {},

            saveProgress: (item) => {
                set((state) => ({
                    progress: {
                        ...state.progress,
                        [item.id]: { ...item, updatedAt: Date.now() },
                    },
                }));
            },

            getProgress: (id) => get().progress[id],

            removeFromContinueWatching: (id) => {
                const newProgress = { ...get().progress };
                delete newProgress[id];
                set({ progress: newProgress });
            },

            clearAllProgress: () => set({ progress: {} }),
        }),
        {
            name: "meflix-progress-store",
        }
    )
);
