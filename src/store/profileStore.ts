import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProfilePreferences {
    defaultQuality: 'auto' | '1080p' | '720p' | '480p';
    defaultPlaybackSpeed: number;
    autoplayNext: boolean;
    showNSFW: boolean;
    subtitleLanguage: string;
}

interface ProfileState {
    displayName: string;
    avatarColor: string;
    memberSince: string;
    preferences: ProfilePreferences;

    // Actions
    setDisplayName: (name: string) => void;
    updatePreference: <K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) => void;
    exportData: () => void;
    importData: (jsonData: string) => void;
    clearAllData: () => void;
}

const DEFAULT_PREFERENCES: ProfilePreferences = {
    defaultQuality: 'auto',
    defaultPlaybackSpeed: 1.0,
    autoplayNext: true,
    showNSFW: false,
    subtitleLanguage: 'English',
};

// Generate a random gradient color for the avatar
const getRandomGradient = () => {
    const colors = [
        'from-red-500 to-orange-500',
        'from-blue-500 to-cyan-500',
        'from-purple-500 to-pink-500',
        'from-emerald-500 to-teal-500',
        'from-indigo-500 to-blue-500',
        'from-amber-500 to-yellow-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            displayName: "Cinephile",
            avatarColor: 'from-blue-500 to-cyan-500', // Stable default
            memberSince: "February 2024", // Stable default
            preferences: DEFAULT_PREFERENCES,

            setDisplayName: (name) => set({ displayName: name }),

            updatePreference: (key, value) => set((state) => ({
                preferences: { ...state.preferences, [key]: value }
            })),

            exportData: () => {
                const data: Record<string, string | null> = {};
                const keys = [
                    'meflix-addons',
                    'meflix-progress',
                    'meflix-watchlist',
                    'meflix-profile',
                    'meflix-settings'
                ];

                keys.forEach(key => {
                    data[key] = localStorage.getItem(key);
                });

                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `meflix-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            },

            importData: (jsonData) => {
                try {
                    const data = JSON.parse(jsonData);
                    Object.entries(data).forEach(([key, value]) => {
                        if (value && typeof value === 'string') {
                            localStorage.setItem(key, value);
                        }
                    });
                    window.location.reload(); // Refresh to hydrate new state
                } catch (e) {
                    console.error("Failed to import data:", e);
                    alert("Invalid backup file.");
                }
            },

            clearAllData: () => {
                const keys = [
                    'meflix-addons',
                    'meflix-progress',
                    'meflix-watchlist',
                    'meflix-profile',
                    'meflix-settings'
                ];
                keys.forEach(key => localStorage.removeItem(key));
                window.location.reload();
            },
        }),
        {
            name: "meflix-profile",
        }
    )
);
