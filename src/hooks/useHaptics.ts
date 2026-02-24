"use client";

import { useCallback } from "react";

export function useHaptics() {
    const vibrate = useCallback((pattern: number | number[] = 10) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                // Ignore failures (some browsers block vibration without user interaction)
            }
        }
    }, []);

    const success = () => vibrate([10, 30, 10]);
    const light = () => vibrate(10);
    const medium = () => vibrate(20);
    const heavy = () => vibrate(50);

    return { vibrate, success, light, medium, heavy };
}
