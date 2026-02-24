"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Command, Keyboard, X } from "lucide-react";
import { useWatchlistStore } from "@/store/watchlistStore";
import { toast } from "sonner";

export default function ShortcutManager() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if focus is in an input or textarea
            if (
                document.activeElement?.tagName === "INPUT" ||
                document.activeElement?.tagName === "TEXTAREA"
            ) {
                return;
            }

            if (e.key === "?" || (e.shiftKey && e.key === "/")) {
                setIsOpen(prev => !prev);
            }

            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const shortcuts = [
        { key: "?", label: "Toggle this guide" },
        { key: "K", label: "Global Search", cmd: true },
        { key: "Space", label: "Play / Pause" },
        { key: "F", label: "Toggle Fullscreen" },
        { key: "M", label: "Mute / Unmute" },
        { key: "L", label: "Mark as Watched" },
        { key: "D", label: "Add to Watchlist" },
        { key: "J / K", label: "Previous / Next Episode" },
        { key: "← / →", label: "Seek backward / forward" },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface border border-white/10 rounded-[32px] p-8 z-[10000] shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-purple-500 to-accent" />

                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                                    <Keyboard className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Keyboard Shortcuts</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="h-8 w-8 rounded-full hover:bg-white/5 flex items-center justify-center text-text-muted transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {shortcuts.map((s) => (
                                <div key={s.key} className="flex items-center justify-between group">
                                    <span className="text-sm font-medium text-text-muted group-hover:text-white transition-colors">
                                        {s.label}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {s.cmd && (
                                            <kbd className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/40 flex items-center gap-1">
                                                <Command className="h-2.5 w-2.5" />
                                            </kbd>
                                        )}
                                        <kbd className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-xs font-black text-white min-w-[2.5rem] text-center shadow-lg">
                                            {s.key}
                                        </kbd>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 text-center">
                            <p className="text-[10px] uppercase tracking-widest font-black text-white/20">Power-user Experience</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
