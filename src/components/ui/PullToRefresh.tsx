"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { motion, useAnimation } from "framer-motion";

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const controls = useAnimation();
    const [pullDistance, setPullDistance] = useState(0);
    const MAX_PULL = 100;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY > 0) return;
        const startY = e.touches[0].pageY;

        const handleTouchMove = (moveEvent: TouchEvent) => {
            const currentY = moveEvent.touches[0].pageY;
            const diff = currentY - startY;
            if (diff > 0) {
                setPullDistance(Math.min(diff, MAX_PULL));
            }
        };

        const handleTouchEnd = async () => {
            if (pullDistance >= 60) {
                setIsRefreshing(true);
                await onRefresh();
                setIsRefreshing(false);
            }
            setPullDistance(0);
            window.removeEventListener("touchmove", handleTouchMove as any);
            window.removeEventListener("touchend", handleTouchEnd);
        };

        window.addEventListener("touchmove", handleTouchMove as any);
        window.addEventListener("touchend", handleTouchEnd);
    };

    return (
        <div onTouchStart={handleTouchStart} className="relative min-h-screen">
            <motion.div
                style={{ height: pullDistance, opacity: pullDistance / MAX_PULL }}
                className="flex items-center justify-center overflow-hidden bg-accent/5"
            >
                <Loader2 className={isRefreshing ? "animate-spin" : ""} />
            </motion.div>
            {children}
        </div>
    );
}
