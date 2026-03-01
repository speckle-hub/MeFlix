"use client";

import { useState, useEffect } from "react";

export function useDevice() {
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const mobileQuery = window.matchMedia("(max-width: 767px)");
        const tabletQuery = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
        const desktopQuery = window.matchMedia("(min-width: 1024px)");

        const updateDevice = () => {
            setIsMobile(mobileQuery.matches);
            setIsTablet(tabletQuery.matches);
            setIsDesktop(desktopQuery.matches);
        };

        updateDevice();

        mobileQuery.addEventListener("change", updateDevice);
        tabletQuery.addEventListener("change", updateDevice);
        desktopQuery.addEventListener("change", updateDevice);

        return () => {
            mobileQuery.removeEventListener("change", updateDevice);
            tabletQuery.removeEventListener("change", updateDevice);
            desktopQuery.removeEventListener("change", updateDevice);
        };
    }, []);

    // Return falsy values if not mounted to prevent hydration mismatch for JS logic
    if (!isMounted) {
        return { isMobile: false, isTablet: false, isDesktop: true, isMounted: false };
    }

    return { isMobile, isTablet, isDesktop, isMounted };
}
