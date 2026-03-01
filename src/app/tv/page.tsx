"use client";

import ContentGrid from "@/components/ui/ContentGrid";
import FilterBar from "@/components/ui/FilterBar";
import { useCatalog } from "@/hooks/useCatalog";
import { Tv } from "lucide-react";
import PullToRefresh from "@/components/ui/PullToRefresh";


import { Suspense } from "react";

export default function TVShowsPage() {
    return (
        <Suspense fallback={<div>Loading Series...</div>}>
            <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 1000)); window.location.reload(); }}>
                <TVShowsContent />
            </PullToRefresh>
        </Suspense>

    );
}

function TVShowsContent() {
    const { data, loading, error } = useCatalog("series", "top");

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Page Header */}
            <div className="relative overflow-hidden rounded-3xl bg-surface/30 p-8 border border-white/5 lg:p-12">
                <div className="absolute top-0 right-0 -m-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-accent">
                        <Tv className="h-6 w-6" />
                        <span className="text-sm font-bold uppercase tracking-widest">Television</span>
                    </div>
                    <h1 className="text-4xl font-black text-white lg:text-6xl">TV Shows</h1>
                    <p className="max-w-xl text-lg text-text-muted">
                        Binge-worthy series, gripping dramas, and hilarious comedies at your fingertips.
                    </p>
                </div>
            </div>

            <FilterBar />

            <ContentGrid
                title="Popular Series"
                movies={data}
                loading={loading}
            />
        </div>
    );
}
