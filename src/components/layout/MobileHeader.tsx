"use client";

import { useProfileStore } from "@/store/profileStore";
import { Search, User } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileHeader() {
    const { displayName, avatarColor } = useProfileStore();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const controlHeader = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down
                setIsVisible(false);
            } else {
                // Scrolling up
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", controlHeader);
        return () => window.removeEventListener("scroll", controlHeader);
    }, [lastScrollY]);

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.header
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-white/5 bg-background/60 px-6 backdrop-blur-2xl md:hidden pt-[max(env(safe-area-inset-top),16px)] h-[calc(4.5rem+max(env(safe-area-inset-top),16px))]"
                >
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white font-bold text-lg">
                            M
                        </div>
                        <span className="text-xl font-bold tracking-tighter text-white">MeFlix</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent("meflix:open-search"))}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-text-muted transition-all duration-300 hover:bg-white/10 hover:text-white"
                        >
                            <Search className="h-5 w-5" />
                        </button>
                        <Link
                            href="/profile"
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 p-0.5 border border-white/10 overflow-hidden"
                        >
                            <div className={cn(
                                "flex h-full w-full items-center justify-center rounded-[10px] bg-gradient-to-br text-white uppercase font-bold text-xs shadow-inner",
                                avatarColor
                            )}>
                                {displayName?.charAt(0) || "U"}
                            </div>
                        </Link>
                    </div>
                </motion.header>
            )}
        </AnimatePresence>
    );
}
