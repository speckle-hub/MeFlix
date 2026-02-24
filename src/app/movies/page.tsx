"use client";

import ContentGrid from "@/components/ui/ContentGrid";
import FilterBar from "@/components/ui/FilterBar";
import { useCatalog } from "@/hooks/useCatalog";
import { Film } from "lucide-react";

import { Suspense } from "react";

export default function MoviesPage() {
    return (
        <Suspense fallback={<div>Loading Movies...</div>}>
            <MoviesContent />
        </Suspense>
    );
}

function MoviesContent() {
    const { data, loading, error } = useCatalog("movie", "top");

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Page Header */}
            <div className="relative overflow-hidden rounded-3xl bg-surface/30 p-8 border border-white/5 lg:p-12">
                <div className="absolute top-0 right-0 -m-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-accent">
                        <Film className="h-6 w-6" />
                        <span className="text-sm font-bold uppercase tracking-widest">Cinema</span>
                    </div>
                    <h1 className="text-4xl font-black text-white lg:text-6xl">Movies</h1>
                    <p className="max-w-xl text-lg text-text-muted">
                        Discover the latest blockbusters and timeless classics from our curated collection.
                    </p>
                </div>
            </div>

            <FilterBar />

            <ContentGrid
                title="All Movies"
                movies={data}
                loading={loading}
            />
        </div>
    );
}
