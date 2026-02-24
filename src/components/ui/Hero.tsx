"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { FEATURED_MOVIES } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface HeroProps {
    movies?: any[];
    loading?: boolean;
}

export default function Hero({ movies, loading }: HeroProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Use dynamic movies if provided, otherwise fallback to featured mock data
    const displayMovies = (movies && movies.length > 0) ? movies.slice(0, 5) : FEATURED_MOVIES;

    const next = () => setCurrentIndex((prev) => (prev + 1) % displayMovies.length);
    const prev = () => setCurrentIndex((prev) => (prev - 1 + displayMovies.length) % displayMovies.length);

    useEffect(() => {
        if (displayMovies.length <= 1) return;
        const timer = setInterval(next, 8000);
        return () => clearInterval(timer);
    }, [displayMovies.length]);

    if (loading) {
        return (
            <div className="relative -mx-4 -mt-4 h-[90vh] w-[calc(100%+2rem)] animate-pulse bg-background/50 lg:-mx-8 lg:-mt-8 lg:h-[80vh] lg:w-[calc(100%+4rem)]" />
        );
    }

    const movie = displayMovies[currentIndex];
    if (!movie) return null;

    return (
        <section className="relative -mx-4 -mt-4 h-[90vh] w-[calc(100%+2rem)] overflow-hidden lg:-mx-8 lg:-mt-8 lg:h-[80vh] lg:w-[calc(100%+4rem)]">
            <AnimatePresence mode="wait">
                <motion.div
                    key={movie.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="relative h-full w-full"
                >
                    {/* Backdrop focusing on maximum visibility */}
                    <motion.div
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute inset-0"
                    >
                        <Image
                            src={movie.backdrop || movie.background || movie.poster}
                            alt={movie.title}
                            fill
                            className="object-cover opacity-100 transition-opacity duration-1000"
                            priority
                            unoptimized
                        />
                        {/* 
                            Premium Gradient System:
                            - Bottom: Fade to black for text readability
                            - Left: Soft shadow for text contrast
                            - Top: Subtle vignetting
                        */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
                        <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent opacity-80" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
                    </motion.div>

                    {/* Content Layer */}
                    <div className="relative z-10 flex h-full items-end p-8 pb-16 lg:p-16 lg:pb-24">
                        <div className="flex w-full items-end justify-between">
                            {/* Text Content */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="max-w-3xl"
                            >
                                <div className="mb-6 flex flex-wrap items-center gap-3">
                                    <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                                        {movie.quality || "4K"}
                                    </span>
                                    <span className="text-sm font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                        {movie.year || "2024"}
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-white/60" />
                                    <span className="text-sm font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                        {movie.rating || "8.5"} RATING
                                    </span>
                                    <span className="rounded-full border border-white/40 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                                        {movie.type?.toUpperCase() || "MOVIE"}
                                    </span>
                                </div>

                                <motion.h1
                                    className="mb-4 text-6xl font-black tracking-tighter text-white md:text-8xl lg:text-9xl uppercase line-clamp-2"
                                    style={{
                                        textShadow: "0 10px 30px rgba(0,0,0,0.8)",
                                        lineHeight: 0.9
                                    }}
                                >
                                    {movie.title || movie.name}
                                </motion.h1>

                                <motion.p
                                    className="mb-10 line-clamp-2 text-lg font-bold text-white/90 md:text-2xl lg:max-w-2xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                                >
                                    {movie.description}
                                </motion.p>

                                <div className="flex flex-wrap gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-3 rounded-2xl bg-white px-10 py-5 font-black text-black transition-all shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
                                    >
                                        <Play className="h-6 w-6 fill-current" />
                                        WATCH NOW
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-3 rounded-2xl bg-white/10 glass px-10 py-5 font-black text-white transition-all shadow-xl"
                                    >
                                        <Info className="h-6 w-6" />
                                        DETAILS
                                    </motion.button>
                                </div>
                            </motion.div>

                            {/* Floating Side Poster (Depth Element) */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, x: 20 }}
                                animate={{ scale: 1, opacity: 1, x: 0 }}
                                transition={{ delay: 0.5, duration: 1 }}
                                className="hidden shrink-0 lg:block lg:pb-4"
                            >
                                <div className="group relative aspect-[2/3] w-56 overflow-hidden rounded-2xl border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.9)] transition-all duration-500 hover:scale-105 hover:border-accent/50">
                                    <Image
                                        src={movie.poster}
                                        alt={movie.title || movie.name}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Controls */}
            {displayMovies.length > 1 && (
                <div className="absolute bottom-12 right-8 z-20 flex gap-3 lg:right-16">
                    <button
                        onClick={prev}
                        className="flex h-12 w-12 items-center justify-center rounded-full glass text-white transition-all hover:bg-accent hover:border-accent"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={next}
                        className="flex h-12 w-12 items-center justify-center rounded-full glass text-white transition-all hover:bg-accent hover:border-accent"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </div>
            )}

            {/* Indicators */}
            {displayMovies.length > 1 && (
                <div className="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                    {displayMovies.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 transition-all duration-500 rounded-full",
                                i === currentIndex ? "w-8 bg-accent" : "w-1.5 bg-white/20"
                            )}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
