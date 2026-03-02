"use client";

import { Bookmark } from "lucide-react";
import ContentGrid from "@/components/ui/ContentGrid";

export default function ListsPage() {
    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Page Header */}
            <div className="relative overflow-hidden rounded-3xl bg-surface/30 p-8 border border-white/5 lg:p-12">
                <div className="absolute top-0 right-0 -m-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-accent">
                        <Bookmark className="h-6 w-6" />
                        <span className="text-sm font-bold uppercase tracking-widest">Collections</span>
                    </div>
                    <h1 className="text-4xl font-black text-white lg:text-6xl">My Lists</h1>
                    <p className="max-w-xl text-lg text-text-muted">
                        Organize your favorites and curate your own streaming collections.
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="h-20 w-20 rounded-3xl bg-surface-hover flex items-center justify-center text-text-muted">
                    <Bookmark className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">No lists yet</h3>
                    <p className="text-sm text-text-muted max-w-xs mx-auto">Start creating lists by clicking the "Add to List" button on any movie or series.</p>
                </div>
            </div>
        </div>
    );
}
