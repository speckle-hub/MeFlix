"use client";

import { useEffect, useState, useMemo } from "react";
import { Radio, ChevronRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAddonStore } from "@/store/addonStore";
import { fetchLiveContent, LiveContentItem } from "@/lib/stremioService";
import { cn } from "@/lib/utils";

export default function LiveNowRow() {
    const { addons } = useAddonStore();
    const liveAddons = useMemo(() => addons.filter(a => a.category === 'live' && a.isEnabled), [addons]);

    const [channels, setChannels] = useState<LiveContentItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLive = async () => {
            if (liveAddons.length === 0) {
                setLoading(false);
                return;
            }
            try {
                // For the homepage, we only want a few items
                const data = await fetchLiveContent(liveAddons);
                setChannels(data.slice(0, 10)); // Take top 10
            } catch (err) {
                console.warn("[LIVE-ROW] Fetch failed:", err);
            } finally {
                setLoading(false);
            }
        };
        loadLive();
    }, [liveAddons]);

    if (!loading && channels.length === 0) return null;

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-600/10 border border-red-600/20">
                        <Radio className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-white">Live Now</h2>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Global Channels & Sports</p>
                    </div>
                </div>
                <Link
                    href="/live"
                    className="flex items-center gap-1 text-sm font-black text-zinc-400 hover:text-red-500 transition-colors group"
                >
                    VIEW ALL
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-64 aspect-video rounded-3xl bg-zinc-900 animate-pulse" />
                    ))
                ) : (
                    channels.map((channel, index) => (
                        <Link
                            key={channel.id}
                            href={`/live?play=${channel.id}`}
                            className="group flex-shrink-0 w-64 aspect-video relative rounded-3xl bg-zinc-900 overflow-hidden border border-white/5 hover:border-red-600/30 transition-all shadow-lg"
                        >
                            <img
                                src={channel.logo || channel.poster || ""}
                                className="absolute inset-0 w-full h-full object-contain p-6 opacity-30 group-hover:scale-110 group-hover:opacity-50 transition-all duration-700"
                                alt={channel.name}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.opacity = "0";
                                }}
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                            <div className="absolute top-3 left-3">
                                <div className="px-2 py-0.5 rounded-lg bg-red-600 text-white text-[8px] font-black uppercase flex items-center gap-1 shadow-lg">
                                    <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                    LIVE
                                </div>
                            </div>

                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-black text-[13px] line-clamp-1">{channel.name}</h3>
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">{channel.category}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                    <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </section>
    );
}
