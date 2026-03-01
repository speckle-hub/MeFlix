"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MangaChapter } from "@/lib/mangaService";

import { Search, X } from "lucide-react";

interface ChapterAccordionProps {
    chapters: MangaChapter[];
    progress: any;
    source: string;
}

export function ChapterAccordion({ chapters, progress, source }: ChapterAccordionProps) {
    const [expandedGroup, setExpandedGroup] = useState<number | null>(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    const filteredChapters = useMemo(() => {
        if (!searchQuery) return chapters;
        return chapters.filter(ch =>
            ch.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ch.title && ch.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [chapters, searchQuery]);

    const groups = useMemo(() => {
        const sorted = [...filteredChapters].sort((a, b) => parseFloat(b.chapter) - parseFloat(a.chapter));
        const bracketSize = 50;
        const result: { label: string; chapters: MangaChapter[] }[] = [];

        if (searchQuery) {
            return [{ label: "Search Results", chapters: sorted }];
        }

        for (let i = 0; i < sorted.length; i += bracketSize) {
            const chunk = sorted.slice(i, i + bracketSize);
            const first = chunk[chunk.length - 1].chapter;
            const last = chunk[0].chapter;
            result.push({
                label: `Chapters ${first} - ${last}`,
                chapters: chunk
            });
        }
        return result;
    }, [filteredChapters, searchQuery]);

    useEffect(() => {
        if (searchQuery) setExpandedGroup(0);
    }, [searchQuery]);

    if (chapters.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            showSearch ? "bg-accent text-white" : "bg-white/5 text-text-muted hover:bg-white/10"
                        )}
                    >
                        <Search className="h-4 w-4" />
                    </button>
                    {showSearch && (
                        <div className="relative flex-1 min-w-[200px]">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search chapter..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1.2 p-1 text-text-muted hover:text-white"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                {groups.map((group, idx) => (
                    <div key={group.label} className="overflow-hidden rounded-2xl border border-white/5 bg-surface/30">
                        <button
                            onClick={() => setExpandedGroup(expandedGroup === idx ? null : idx)}
                            className="flex w-full items-center justify-between p-5 transition-colors hover:bg-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-white">{group.label}</span>
                                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    {group.chapters.length} Chapters
                                </span>
                            </div>
                            {expandedGroup === idx ? (
                                <ChevronDown className="h-5 w-5 text-accent" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-text-muted" />
                            )}
                        </button>

                        <AnimatePresence>
                            {expandedGroup === idx && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                >
                                    <div className="grid grid-cols-1 gap-2 p-3 bg-black/20">
                                        {group.chapters.map((chapter) => {
                                            const isRead = progress && parseFloat(chapter.chapter) <= parseFloat(progress.chapterTitle);
                                            return (
                                                <Link
                                                    key={chapter.id}
                                                    href={`/manga/read/${source}/${chapter.id}`}
                                                    className={cn(
                                                        "group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 active:scale-[0.98]",
                                                        isRead
                                                            ? "bg-surface/20 border-white/5 opacity-50"
                                                            : "bg-surface/40 border-white/5 active:bg-surface-hover"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className={cn(
                                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors font-black text-[10px]",
                                                            isRead ? "bg-white/5 text-text-muted" : "bg-accent/20 text-accent"
                                                        )}>
                                                            CH
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-sm text-white truncate">
                                                                Chapter {chapter.chapter}
                                                                {chapter.title && <span className="ml-2 font-medium text-text-muted text-xs">— {chapter.title}</span>}
                                                            </h4>
                                                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                                                {new Date(chapter.publishAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
}
