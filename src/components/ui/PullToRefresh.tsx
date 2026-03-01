"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    disabled?: boolean;
}

export default function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isPulling = useRef(false);

    const MAX_PULL = 80;
    const REFRESH_THRESHOLD = 60;

    useEffect(() => {
        if (disabled) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY <= 0) {
                startY.current = e.touches[0].pageY;
                isPulling.current = true;
            } else {
                isPulling.current = false;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPulling.current || isRefreshing) return;

            const currentY = e.touches[0].pageY;
            const diff = currentY - startY.current;

            if (diff > 0) {
                const resistance = 0.4;
                const distance = Math.min(diff * resistance, MAX_PULL);
                setPullDistance(distance);

                if (e.cancelable) e.preventDefault();
            } else {
                setPullDistance(0);
                isPulling.current = false;
            }
        };

        const handleTouchEnd = async () => {
            if (!isPulling.current || isRefreshing) return;
            isPulling.current = false;

            if (pullDistance >= REFRESH_THRESHOLD) {
                setIsRefreshing(true);
                setPullDistance(REFRESH_THRESHOLD);
                try {
                    await onRefresh();
                } catch (err) {
                    console.error("Refresh failed", err);
                } finally {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }
            } else {
                setPullDistance(0);
            }
        };

        const el = containerRef.current;
        if (el) {
            el.addEventListener("touchstart", handleTouchStart, { passive: true });
            el.addEventListener("touchmove", handleTouchMove, { passive: false });
            el.addEventListener("touchend", handleTouchEnd);
        }

        return () => {
            if (el) {
                el.removeEventListener("touchstart", handleTouchStart);
                el.removeEventListener("touchmove", handleTouchMove);
                el.removeEventListener("touchend", handleTouchEnd);
            }
        };
    }, [pullDistance, isRefreshing, onRefresh, disabled]);

    return (
        <div ref={containerRef} className="relative min-h-full overflow-x-hidden">
            <motion.div
                animate={{
                    height: pullDistance,
                    opacity: pullDistance > 0 ? 1 : 0
                }}
                transition={isPulling.current ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                className="flex items-center justify-center overflow-hidden bg-gradient-to-b from-accent/10 to-transparent"
            >
                <div className="flex flex-col items-center gap-2">
                    <Loader2
                        className={isRefreshing ? "animate-spin h-6 w-6 text-accent" : "h-6 w-6 text-accent"}
                        style={{
                            transform: !isRefreshing ? `rotate(${pullDistance * 3}deg) scale(${Math.min(pullDistance / REFRESH_THRESHOLD, 1)})` : undefined
                        }}
                    />
                    {pullDistance > 20 && !isRefreshing && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent/60">
                            {pullDistance >= REFRESH_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
                        </span>
                    )}
                </div>
            </motion.div>
            <motion.div
                animate={{ y: pullDistance }}
                transition={isPulling.current ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                className="relative z-10"
            >
                {children}
            </motion.div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
