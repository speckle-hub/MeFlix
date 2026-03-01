"use client";

import { type Movie } from "@/lib/mockData";
import MediaCard from "./MediaCard";
import { ContentGridSkeleton } from "./Skeleton";
import { Ghost, SearchX, Clapperboard } from "lucide-react";

interface ContentGridProps {
    title: string;
    movies: Movie[];
    loading?: boolean;
}

export default function ContentGrid({ title, movies, loading }: ContentGridProps) {
    if (loading) {
        return <ContentGridSkeleton />;
    }

    if (movies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 rounded-3xl border border-white/5 bg-surface/30">
                <div className="relative">
                    <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full" />
                    {title.toLowerCase().includes("anime") ? (
                        <Ghost className="relative h-20 w-20 text-accent/60" />
                    ) : (
                        <Clapperboard className="relative h-20 w-20 text-accent/60" />
                    )}
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Nothing found in {title}</h3>
                    <p className="max-w-xs text-sm text-text-muted">
                        We couldn't find any content for this category. Try adjusting your filters or adding more addons.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <section className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight text-white lg:text-3xl">
                    {title}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-8 hidden md:block" />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-6 lg:gap-x-6">
                {movies.map((movie, index) => (
                    <MediaCard key={movie.id} movie={movie} index={index} />
                ))}
            </div>
        </section>
    );
}
