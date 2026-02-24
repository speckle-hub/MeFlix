"use client";

import ContentGrid from "@/components/ui/ContentGrid";
import FilterBar from "@/components/ui/FilterBar";
import { useCatalog } from "@/hooks/useCatalog";
import { PlaySquare } from "lucide-react";

import { Suspense } from "react";

export default function AnimePage() {
    return (
        <Suspense fallback={<div>Loading Anime...</div>}>
            <AnimeContent />
        </Suspense>
    );
}

function AnimeContent() {
    const { data, loading, error } = useCatalog("anime", "kitsu-anime-trending");

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Page Header */}
            <div className="relative overflow-hidden rounded-3xl bg-surface/30 p-8 border border-white/5 lg:p-12">
                <div className="absolute top-0 right-0 -m-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-accent">
                        <PlaySquare className="h-6 w-6" />
                        <span className="text-sm font-bold uppercase tracking-widest">Anime</span>
                    </div>
                    <h1 className="text-4xl font-black text-white lg:text-6xl">Anime</h1>
                    <p className="max-w-xl text-lg text-text-muted">
                        Explore stunning worlds and epic adventures from Japan's finest studios.
                    </p>
                </div>
            </div>

            <FilterBar />

            <ContentGrid
                title="Top Anime"
                movies={data}
                loading={loading}
            />
        </div>
    );
}
