"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Radio,
    Search,
    Filter,
    Wifi,
    AlertCircle,
    ChevronRight,
    Loader2,
    Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAddonStore } from "@/store/addonStore";
import { fetchLiveContent, LiveContentItem } from "@/lib/stremioService";
import { cn } from "@/lib/utils";
import VideoPlayer from "@/components/ui/VideoPlayer";

export default function LivePage() {
    const { addons } = useAddonStore();
    const liveAddons = useMemo(() => addons.filter(a => a.category === 'live' && a.isEnabled), [addons]);

    const [channels, setChannels] = useState<LiveContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedChannel, setSelectedChannel] = useState<LiveContentItem | null>(null);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);

    // Categories derived from data
    const categories = useMemo(() => {
        const unique = new Set(channels.map(c => c.category));
        return ["All", ...Array.from(unique)].sort();
    }, [channels]);

    // Filtered data
    const filteredChannels = useMemo(() => {
        return channels.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.addonName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [channels, searchQuery, selectedCategory]);

    useEffect(() => {
        const loadContent = async () => {
            if (liveAddons.length === 0) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const data = await fetchLiveContent(liveAddons);
                setChannels(data);
                if (data.length === 0) {
                    setError("No live content available right now.");
                }
            } catch (err) {
                console.error("[LIVE] Page fetch error:", err);
                setError("Failed to load live content.");
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [liveAddons]);

    const handlePlay = async (channel: LiveContentItem) => {
        try {
            setSelectedChannel(channel);
            // In a real scenario, we'd call fetchStreams here
            const { fetchStreams } = await import("@/lib/stremioService");
            const res = await fetchStreams(channel.addonBaseUrl + "/manifest.json", channel.type, channel.id);

            if (res.streams && res.streams.length > 0) {
                setStreamUrl(res.streams[0].url || res.streams[0].externalUrl || null);
            } else {
                setError("No playable streams found for this channel.");
                setTimeout(() => setError(null), 3000);
            }
        } catch (err) {
            console.error("[LIVE] Play error:", err);
            setError("Failed to fetch streams.");
        }
    };

    if (liveAddons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-100 p-6 text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center">
                    <Radio className="w-12 h-12 text-zinc-500" />
                </div>
                <h1 className="text-3xl font-black text-white">Live Sports & TV</h1>
                <p className="text-zinc-500 max-w-md">
                    No live addons installed. Install MediaFusion, USA TV, or GStream from the Addon Store to unlock live content.
                </p>
                <button
                    onClick={() => window.location.href = '/settings/addons'}
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all"
                >
                    INSTALL ADDONS
                </button>
            </div>
        );
    }

    return (
        <div className="pb-20">
            {/* Hero Section */}
            <section className="relative h-[45vh] lg:h-[60vh] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/20 to-transparent z-10" />

                <img
                    src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
                    alt="Sports Hero"
                />

                <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 lg:p-12 max-w-4xl space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-600/30 text-red-500 text-[10px] font-black uppercase tracking-widest">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Live Now
                        </div>
                        <div className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest">
                            {channels.length} Channels Available
                        </div>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight">
                        Experience Every <span className="text-red-600">Moment</span> Live.
                    </h1>
                    <p className="text-zinc-400 text-lg lg:text-xl font-medium max-w-2xl leading-relaxed">
                        From major league showdowns to global news, watch it all in real-time. Direct from your favorite community addons.
                    </p>
                </div>
            </section>

            {/* Content & Filters */}
            <div className="px-6 lg:px-12 -mt-10 relative z-30">
                {/* Search & Filter Bar */}
                <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-4 rounded-3xl shadow-2xl">
                    <div className="relative w-full lg:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search channels or events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all",
                                    selectedCategory === cat
                                        ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                                        : "bg-white/5 hover:bg-white/10 text-zinc-400"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="mt-12">
                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="aspect-[2/3] md:aspect-video rounded-3xl bg-zinc-900 animate-pulse relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-4 left-4 right-4 h-4 bg-white/5 rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredChannels.length > 0 ? (
                                <motion.div
                                    layout
                                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6"
                                >
                                    {filteredChannels.map((channel) => (
                                        <motion.div
                                            key={channel.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            onClick={() => handlePlay(channel)}
                                            className="group relative aspect-[2/3] md:aspect-video rounded-3xl bg-zinc-900 overflow-hidden cursor-pointer border border-white/5 hover:border-red-500/30 transition-all shadow-xl hover:shadow-red-900/10"
                                        >
                                            <img
                                                src={channel.logo || channel.poster || "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop"}
                                                className="absolute inset-0 w-full h-full object-contain p-4 lg:p-8 opacity-40 group-hover:scale-110 group-hover:opacity-60 transition-all duration-700"
                                                alt={channel.name}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop";
                                                    (e.target as HTMLImageElement).className = "absolute inset-0 w-full h-full object-cover opacity-20";
                                                }}
                                            />

                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                                            <div className="absolute top-4 left-4 flex gap-2">
                                                <div className="px-2 py-1 rounded-lg bg-red-600 text-white text-[8px] font-black uppercase flex items-center gap-1.5 shadow-lg">
                                                    <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                                    LIVE
                                                </div>
                                                <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white/70 text-[8px] font-black uppercase border border-white/10">
                                                    {channel.category}
                                                </div>
                                            </div>

                                            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                                <h3 className="text-white font-black text-sm line-clamp-1 mb-1">{channel.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{channel.addonName}</span>
                                                    <div className="flex-1 h-[1px] bg-white/5" />
                                                    <Play className="w-3 h-3 text-red-500 fill-current opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-20 text-center"
                                >
                                    <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                                        <AlertCircle className="w-8 h-8 text-zinc-500" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2">No Results Found</h3>
                                    <p className="text-zinc-500">Try adjusting your search or filters.</p>
                                    <button
                                        onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                                        className="mt-6 text-red-500 font-bold hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Video Player Overlay */}
            <AnimatePresence>
                {selectedChannel && streamUrl && (
                    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300">
                        <div className="w-full max-w-6xl p-4 lg:p-10">
                            <VideoPlayer
                                url={streamUrl}
                                title={selectedChannel.name}
                                id={selectedChannel.id}
                                poster={selectedChannel.poster || ""}
                                type={selectedChannel.type}
                                isLive={true}
                                channelLogo={selectedChannel.logo}
                                onClose={() => {
                                    setSelectedChannel(null);
                                    setStreamUrl(null);
                                }}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Error Toast-like overlay */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-zinc-900 border-l-4 border-red-600 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4"
                    >
                        <Wifi className="w-5 h-5 text-red-500" />
                        <span className="text-white font-bold text-sm tracking-wide">{error}</span>
                        <button onClick={() => setError(null)} className="text-zinc-500 hover:text-white">
                            <AlertCircle className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
