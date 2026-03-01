"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Tv, Radio, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "vaul";
import { useProfileStore } from "@/store/profileStore";
import { Film as FilmIcon, Tv as TvIcon, PlaySquare, BookOpen, ShieldAlert, Globe, Bookmark, User } from "lucide-react";

const NAV_ITEMS = [
    { name: "Home", href: "/", icon: Home },
    { name: "Movies", href: "/movies", icon: Film },
    { name: "TV Shows", href: "/tv", icon: Tv },
    { name: "Live TV", href: "/live", icon: Radio },
];

const MORE_LINKS = [
    { name: "Anime", href: "/anime", icon: PlaySquare },
    { name: "Manga", href: "/manga", icon: BookOpen },
    { name: "NSFW", href: "/nsfw", icon: ShieldAlert, nsfw: true },
    { name: "Watchlist", href: "/watchlist", icon: Bookmark },
    { name: "Addons", href: "/settings/addons", icon: Globe },
    { name: "Profile", href: "/profile", icon: User },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { preferences } = useProfileStore();

    return (
        <Drawer.Root shouldScaleBackground>
            <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-white/5 bg-background/60 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur-2xl md:hidden shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1.5 transition-all duration-300 relative",
                                isActive ? "text-accent" : "text-text-muted"
                            )}
                        >
                            <motion.div
                                whileTap={{ scale: 0.85 }}
                                className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300",
                                    isActive ? "bg-accent/10" : "hover:bg-white/5"
                                )}
                            >
                                <Icon className={cn(
                                    "h-[26px] w-[26px] transition-transform duration-300",
                                    isActive && "scale-110"
                                )} />
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav-dot"
                                        className="absolute -bottom-1 h-1 w-1 rounded-full bg-accent"
                                    />
                                )}
                                {item.name === "Live TV" && !isActive && (
                                    <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse border-2 border-background" />
                                )}
                            </motion.div>
                        </Link>
                    );
                })}

                <Drawer.Trigger asChild>
                    <button
                        className="flex flex-col items-center gap-1.5 text-text-muted hover:text-white transition-all duration-300"
                    >
                        <motion.div
                            whileTap={{ scale: 0.85 }}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-white/5"
                        >
                            <Menu className="h-[26px] w-[26px]" />
                        </motion.div>
                    </button>
                </Drawer.Trigger>

                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[70] mt-24 flex h-[65vh] flex-col rounded-t-[32px] bg-surface/90 backdrop-blur-3xl border-t border-white/10 outline-none">
                        <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-white/10" />

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                            <h2 className="mb-6 text-xl font-bold text-white px-2">More To Explore</h2>
                            <div className="grid grid-cols-3 gap-4">
                                {MORE_LINKS.filter(item => !item.nsfw || preferences.showNSFW).map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;

                                    return (
                                        <Drawer.Close asChild key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "flex flex-col items-center justify-center gap-3 rounded-3xl p-4 transition-all duration-300",
                                                    isActive ? "bg-accent/10 border border-accent/20" : "bg-white/5 border border-white/5"
                                                )}
                                            >
                                                <div className={cn(
                                                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                                                    isActive ? "text-accent" : "text-text-muted"
                                                )}>
                                                    <Icon className="h-7 w-7" />
                                                </div>
                                                <span className={cn(
                                                    "text-xs font-semibold tracking-tight",
                                                    isActive ? "text-white" : "text-text-muted"
                                                )}>
                                                    {item.name}
                                                </span>
                                            </Link>
                                        </Drawer.Close>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-white/5">
                            <p className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted opacity-50">
                                MeFlix Premium v1.2
                            </p>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </nav>
        </Drawer.Root>
    );
}
