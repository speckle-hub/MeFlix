import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccentColor = "red" | "blue" | "purple" | "green" | "orange";

interface SettingsState {
    accentColor: AccentColor;
    backgroundBrightness: number; // 0 (pure black) to 1 (dark gray)
    autoplay: boolean;
    defaultQuality: string;
    cardSize: "small" | "medium" | "large";
    animationIntensity: "full" | "reduced" | "none";

    setAccentColor: (color: AccentColor) => void;
    setBackgroundBrightness: (value: number) => void;
    setAutoplay: (value: boolean) => void;
    setDefaultQuality: (value: string) => void;
    setCardSize: (size: "small" | "medium" | "large") => void;
    setAnimationIntensity: (intensity: "full" | "reduced" | "none") => void;
    resetAll: () => void;
}

const DEFAULT_SETTINGS = {
    accentColor: "red" as AccentColor,
    backgroundBrightness: 0.4, // Matches #0a0a0a roughly
    autoplay: true,
    defaultQuality: "Auto",
    cardSize: "medium" as const,
    animationIntensity: "full" as const,
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            ...DEFAULT_SETTINGS,
            setAccentColor: (accentColor) => set({ accentColor }),
            setBackgroundBrightness: (backgroundBrightness) => set({ backgroundBrightness }),
            setAutoplay: (autoplay) => set({ autoplay }),
            setDefaultQuality: (defaultQuality) => set({ defaultQuality }),
            setCardSize: (cardSize) => set({ cardSize }),
            setAnimationIntensity: (animationIntensity) => set({ animationIntensity }),
            resetAll: () => set(DEFAULT_SETTINGS),
        }),
        {
            name: "meflix-settings-store",
        }
    )
);
