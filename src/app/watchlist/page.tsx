"use client";

import { useState } from "react";
import { useWatchlistStore } from "@/store/watchlistStore";
import { useProgressStore } from "@/store/progressStore";
import ContentGrid from "@/components/ui/ContentGrid";
import {
    Bookmark, Heart, History, Play, Trash2,
    Search, Filter, LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = "watchlist" | "favorites" | "history" | "continue";

export default function WatchlistPage() {
    const [activeTab, setActiveTab] = useState<Tab>("watchlist");
    const { watchlist, favorites, history, clearHistory } = useWatchlistStore();
    const { progress } = useProgressStore();

    const continueWatching = Object.values(progress)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(p => ({
            id: p.id,
            title: p.title,
            poster: p.poster,
            type: p.type as any,
            description: "", backdrop: "", rating: "N/A", year: "", quality: "HD",
            isNSFW: false,
        }));

    const tabs = [
        { id: "watchlist", label: "Want to Watch", icon: Bookmark, count: watchlist.length },
        { id: "favorites", label: "Favorites", icon: Heart, count: favorites.length },
        { id: "continue", label: "Continue", icon: Play, count: continueWatching.length },
        { id: "history", label: "History", icon: History, count: history.length },
    ] as const;

    const currentData = {
        watchlist,
        favorites,
        history,
        continue: continueWatching
    }[activeTab];

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-white">Your Library</h1>
                    <p className="text-text-muted font-medium">Manage your collection and tracked progress.</p>
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all rounded-xl",
                                activeTab === tab.id ? "text-white" : "text-text-muted hover:text-white"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="active-tab"
                                    className="absolute inset-0 bg-accent rounded-xl shadow-lg shadow-accent/20"
                                />
                            )}
                            <tab.icon className="h-4 w-4 relative z-10" />
                            <span className="relative z-10">{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={cn(
                                    "relative z-10 text-[10px] px-1.5 py-0.5 rounded-md font-black",
                                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-white/5 text-text-muted"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-h-[50vh]">
                <AnimatePresence mode="wait">
                    {currentData.length > 0 ? (
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold text-white capitalize">{activeTab.replace("-", " ")}</h2>
                                </div>
                                {activeTab === "history" && (
                                    <button
                                        onClick={clearHistory}
                                        className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-accent transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" /> Clear History
                                    </button>
                                )}
                            </div>
                            <ContentGrid title={activeTab} movies={currentData} />
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-center space-y-6"
                        >
                            <div className="h-24 w-24 rounded-[32px] bg-white/5 flex items-center justify-center text-text-muted border border-white/5 border-dashed">
                                <LayoutGrid className="h-10 w-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">Your {activeTab} is empty</h2>
                                <p className="text-text-muted max-w-xs mx-auto">Explore the catalog and add your favorite movies or shows to track them here.</p>
                            </div>
                            <button className="bg-accent text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-all">
                                Browse Catalog
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
