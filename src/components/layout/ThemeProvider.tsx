"use client";

import { useEffect } from "react";
import { useSettingsStore, AccentColor } from "@/store/settingsStore";
import SeasonalOverlay from "@/components/ui/SeasonalOverlay";

const ACCENT_MAP: Record<AccentColor, { main: string; hover: string }> = {
    red: { main: "#e50914", hover: "#ff1f29" },
    blue: { main: "#0070f3", hover: "#1a8fff" },
    purple: { main: "#7928ca", hover: "#9b4de0" },
    green: { main: "#00703c", hover: "#00a35c" },
    orange: { main: "#f5a623", hover: "#ffb84d" },
};

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { accentColor, backgroundBrightness } = useSettingsStore();

    const isWinter = new Date().getMonth() === 11 || new Date().getMonth() === 0 || new Date().getMonth() === 1;

    useEffect(() => {
        const root = document.documentElement;
        const colors = ACCENT_MAP[accentColor];

        // Calculate background color based on brightness (0 = #000, 1 = #1a1a1a)
        const bgValue = Math.round(backgroundBrightness * 26);
        const bgHex = `#${bgValue.toString(16).padStart(2, "0")}${bgValue.toString(16).padStart(2, "0")}${bgValue.toString(16).padStart(2, "0")}`;

        root.style.setProperty("--app-accent", colors.main);
        root.style.setProperty("--app-accent-hover", colors.hover);
        root.style.setProperty("--app-bg", bgHex);
    }, [accentColor, backgroundBrightness]);

    return (
        <>
            {isWinter && <SeasonalOverlay />}
            {children}
        </>
    );
}
