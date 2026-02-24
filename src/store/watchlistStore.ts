import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Movie } from "@/lib/mockData";

interface WatchlistState {
    watchlist: Movie[];
    history: Movie[];
    favorites: Movie[];

    addToWatchlist: (item: Movie) => void;
    removeFromWatchlist: (id: string) => void;
    toggleFavorite: (item: Movie) => void;
    addToHistory: (item: Movie) => void;
    removeFromHistory: (id: string) => void;
    clearHistory: () => void;
    isInWatchlist: (id: string) => boolean;
    isFavorite: (id: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>()(
    persist(
        (set, get) => ({
            watchlist: [],
            history: [],
            favorites: [],

            addToWatchlist: (item) => {
                if (!get().isInWatchlist(item.id)) {
                    set((state) => ({ watchlist: [item, ...state.watchlist] }));
                }
            },

            removeFromWatchlist: (id) => {
                set((state) => ({
                    watchlist: state.watchlist.filter((i) => i.id !== id),
                }));
            },

            toggleFavorite: (item) => {
                const isFav = get().isFavorite(item.id);
                set((state) => ({
                    favorites: isFav
                        ? state.favorites.filter((i) => i.id !== item.id)
                        : [item, ...state.favorites],
                }));
            },

            addToHistory: (item) => {
                set((state) => ({
                    history: [item, ...state.history.filter((i) => i.id !== item.id)].slice(0, 50),
                }));
            },

            removeFromHistory: (id) => {
                set((state) => ({
                    history: state.history.filter((i) => i.id !== id),
                }));
            },

            clearHistory: () => set({ history: [] }),

            isInWatchlist: (id) => get().watchlist.some((i) => i.id === id),
            isFavorite: (id) => get().favorites.some((i) => i.id === id),
        }),
        {
            name: "meflix-watchlist-store",
        }
    )
);
