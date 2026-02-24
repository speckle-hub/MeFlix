"use client";

import { useState } from "react";
import { useAddonStore } from "@/store/addonStore";
import { Globe, Plus, Trash2, CheckCircle2, XCircle, Loader2, Info, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import AddonManager from "@/components/ui/AddonManager";
import MangaSourceManager from "@/components/ui/MangaSourceManager";

export default function AddonsPage() {
    const { isDemoMode, setDemoMode } = useAddonStore();
    const [activeTab, setActiveTab] = useState<'stremio' | 'manga'>('stremio');

    // Sync Demo Mode with service
    const handleDemoToggle = (value: boolean) => {
        setDemoMode(value);
        import("@/lib/stremioService").then(m => m.setServiceDemoMode(value));
        toast.info(value ? "Demo Mode Enabled" : "Real Mode Enabled", {
            description: value ? "Showing mock data for testing." : "Fetching real content from addons."
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 py-10 pb-20 animate-fade-in">
            {/* Header with Tabs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Source Management</h1>
                    <p className="text-text-muted mt-1 font-medium">Configure your content aggregators and providers.</p>
                </div>

                <div className="flex bg-surface p-1.5 rounded-2xl border border-white/5 shadow-xl">
                    <button
                        onClick={() => setActiveTab('stremio')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                            activeTab === 'stremio' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-white"
                        )}
                    >
                        Stremio
                    </button>
                    <button
                        onClick={() => setActiveTab('manga')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                            activeTab === 'manga' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-white"
                        )}
                    >
                        Manga
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'stremio' ? (
                    <motion.div
                        key="stremio-tab"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-12"
                    >
                        {/* Demo Mode Toggle */}
                        <div className="group relative rounded-3xl bg-surface/50 p-6 border border-white/5 hover:border-accent/20 transition-all duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                                        isDemoMode ? "bg-accent/20 text-accent" : "bg-white/5 text-text-muted"
                                    )}>
                                        <Info className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">Developer Demo Mode</h3>
                                        <p className="text-text-muted text-sm">Use mock data for testing UI without real addons.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDemoToggle(!isDemoMode)}
                                    className={cn(
                                        "relative h-7 w-14 rounded-full transition-all duration-300",
                                        isDemoMode ? "bg-accent shadow-[0_0_15px_rgba(var(--accent),0.5)]" : "bg-zinc-700"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 h-5 w-5 rounded-full bg-white transition-all duration-300 shadow-lg",
                                        isDemoMode ? "left-8" : "left-1"
                                    )} />
                                </button>
                            </div>
                        </div>

                        {isDemoMode && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/5 border border-accent/20 text-accent animate-scale-in">
                                <Info className="h-5 w-5 flex-shrink-0" />
                                <p className="text-sm font-medium">
                                    <strong>Demo Mode is active:</strong> Real addons are ignored. Toggle off to use your connected sources.
                                </p>
                            </div>
                        )}

                        <AddonManager
                            isNSFW={false}
                            title="Regular Sources"
                            description="General content addons like Cinemata or Torrentio. These sources populate the Home, Movies, and TV pages."
                        />

                        {/* NSFW Section Link */}
                        <div className="p-8 rounded-[40px] glass border border-white/10 bg-gradient-to-br from-red-500/10 via-transparent to-transparent">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-white flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                            <Globe className="h-6 w-6 text-red-500" />
                                        </div>
                                        Advanced Sources
                                    </h3>
                                    <p className="text-text-muted max-w-lg font-medium">
                                        Configure mature content sources and adult addons. These are kept separate for privacy and protection.
                                    </p>
                                </div>
                                <a
                                    href="/nsfw"
                                    className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-red-500/20 group"
                                >
                                    Manage NSFW
                                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="manga-tab"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <MangaSourceManager />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
