"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Loader2, Info, AlertTriangle } from 'lucide-react';
import { useAddonStore } from '@/store/addonStore';
import { StremioStream } from '@/types/stremio';
import { Drawer } from 'vaul';

interface StreamSelectorProps {
    type: "movie" | "series";
    id: string;
    title: string;
    onSelect: (stream: StremioStream) => void;
    onClose: () => void;
}

export const StreamSelector: React.FC<StreamSelectorProps> = ({
    type,
    id,
    title,
    onSelect,
    onClose
}) => {
    const { addons } = useAddonStore();
    const [streams, setStremioStreams] = useState<StremioStream[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllStremioStreams = async () => {
            console.log(`[STREAM SELECTOR] Initializing fetch for ${type}/${id}`);
            setLoading(true);
            setError(null);
            const allStremioStreams: StremioStream[] = [];

            // Fetch from enabled addons
            let enabledAddons = addons.filter(a => a.isEnabled);

            // Check if we have a specific source-addon context (NSFW directed fetch)
            try {
                const contextRaw = sessionStorage.getItem('content_context');
                if (contextRaw) {
                    const context = JSON.parse(contextRaw);
                    if (context.addonBaseUrl) {
                        const normalize = (u: string) => u.replace(/\/+$/, '').replace('/manifest.json', '').toLowerCase();
                        const contextUrl = normalize(context.addonBaseUrl);
                        const sourceAddon = enabledAddons.find(a => normalize(a.url) === contextUrl);

                        if (sourceAddon) {
                            console.log(`[STREAM] Directed fetch: prioritizing source addon "${sourceAddon.name}"`);
                            enabledAddons = [sourceAddon];
                        }
                    }
                }
            } catch (err) {
                console.warn('[STREAM] Failed to parse content context:', err);
            }

            if (enabledAddons.length === 0) {
                setError("No addons enabled. Please install or enable an addon.");
                setLoading(false);
                return;
            }

            const promises = enabledAddons.map(async (addon) => {
                try {
                    const baseUrl = addon.url.replace('/manifest.json', '');
                    // We use the ID as provided, let the service handle encoding logic
                    const streamUrl = `${baseUrl}/stream/${type}/${id}.json`;
                    console.log(`[STREAMS] Fetching from ${addon.name}:`, streamUrl);

                    const response = await fetch(`/api/proxy?url=${encodeURIComponent(streamUrl)}`);

                    if (!response.ok) {
                        return;
                    }

                    const data = await response.json();

                    if (data.streams && Array.isArray(data.streams)) {
                        console.log(`[STREAM] Found ${data.streams.length} streams via "${addon.name}"`);
                        const streamsWithAddon = data.streams.map((s: any) => ({
                            ...s,
                            addonName: addon.name,
                            addonId: addon.id || addon.manifest?.id,
                            addonBaseUrl: addon.url.replace('/manifest.json', ''),
                            name: s.name || addon.name || "Unknown"
                        }));
                        allStremioStreams.push(...streamsWithAddon);
                    } else {
                        console.log(`[STREAM DEBUG] "${addon.name}" has no streams for this ID.`);
                    }
                } catch (e) {
                    console.error(`[STREAM DEBUG] Error fetching from ${addon.name}:`, e);
                }
            });

            await Promise.allSettled(promises);

            if (allStremioStreams.length === 0) {
                setError("No streams found. Try another movie or check your addons.");
            } else {
                // Sort by quality (4K first, then 1080p, etc.)
                const sorted = allStremioStreams.sort((a, b) => {
                    const getRank = (s: any) => {
                        const t = (s.title || s.name || "").toLowerCase();
                        if (t.includes('4k') || t.includes('2160p')) return 4;
                        if (t.includes('1080p')) return 3;
                        if (t.includes('720p')) return 2;
                        return 1;
                    };
                    return getRank(b) - getRank(a);
                });
                setStremioStreams(sorted);
            }
            setLoading(false);
        };

        fetchAllStremioStreams();
    }, [type, id, addons]);

    const renderStreamList = () => (
        <div className="space-y-2">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-accent animate-spin" />
                    <p className="text-zinc-400">Searching for streams...</p>
                </div>
            ) : error ? (
                <div className="text-center py-16 px-6">
                    <AlertTriangle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                    <p className="text-zinc-300 font-medium mb-1">{error}</p>
                    <p className="text-zinc-500 text-sm mb-6">Make sure you have relevant addons enabled.</p>
                    <button onClick={onClose} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
                        Close
                    </button>
                </div>
            ) : (
                streams.map((stream, idx) => {
                    const quality = stream.title?.match(/\b(4k|2160p|1080p|720p|480p)\b/i)?.[0] || "HD";

                    return (
                        <button
                            key={idx}
                            onClick={() => onSelect(stream)}
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/50 transition-all group text-left min-h-[56px]"
                        >
                            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-accent/20 flex items-center justify-center group-hover:bg-accent/40 transition-colors">
                                    <Play className="w-5 h-5 text-accent fill-accent" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-white font-semibold truncate text-sm md:text-base">{stream.name}</span>
                                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-zinc-300 font-bold uppercase">
                                            {quality}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate">{stream.title}</p>
                                </div>
                            </div>
                        </button>
                    );
                })
            )}
        </div>
    );

    return (
        <>
            {/* Desktop Modal - Visible on md+ */}
            <div className="hidden md:block">
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-zinc-900 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Select Stream</h2>
                                    <p className="text-zinc-400 text-sm line-clamp-1">{title}</p>
                                </div>
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar flex-1">
                                {renderStreamList()}
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Mobile Bottom Sheet - Visible on <md */}
            <div className="md:hidden">
                <Drawer.Root open={true} onOpenChange={(open) => !open && onClose()} shouldScaleBackground={false}>
                    <Drawer.Portal>
                        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
                        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[85vh] flex-col rounded-t-[32px] bg-zinc-900 border-t border-white/10 outline-none">
                            <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-white/10" />

                            <div className="p-6 pb-2">
                                <h2 className="text-lg font-bold text-white">Select Stream</h2>
                                <p className="text-zinc-400 text-xs truncate">{title}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {renderStreamList()}
                            </div>

                            {/* Spacer for BottomNav + Safe Area */}
                            <div className="h-[calc(80px+env(safe-area-inset-bottom))] shrink-0" />
                        </Drawer.Content>
                    </Drawer.Portal>
                </Drawer.Root>
            </div>
        </>
    );
};
