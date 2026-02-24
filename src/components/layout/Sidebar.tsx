"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Bookmark, User, Film, Tv, PlaySquare, ShieldAlert, Globe, Radio, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/profileStore";

const BASE_NAV_ITEMS = [
    { name: "Home", href: "/", icon: Home },
    { name: "Search", href: "/search", icon: Search },
    { name: "Movies", href: "/movies", icon: Film },
    { name: "TV Shows", href: "/tv", icon: Tv },
    { name: "Anime", href: "/anime", icon: PlaySquare },
    { name: "Manga", href: "/manga", icon: BookOpen },
    { name: "Live", href: "/live", icon: Radio, color: "text-red-500" },
    { name: "Watchlist", href: "/watchlist", icon: Bookmark },
    { name: "Addons", href: "/settings/addons", icon: Globe },
];

const NSFW_NAV_ITEM = { name: "NSFW", href: "/nsfw", icon: ShieldAlert, color: "text-rose-400" };

export default function Sidebar() {
    const pathname = usePathname();
    const { preferences } = useProfileStore();
    const NAV_ITEMS = preferences.showNSFW
        ? [...BASE_NAV_ITEMS, NSFW_NAV_ITEM]
        : BASE_NAV_ITEMS;

    return (
        <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-white/5 bg-background p-6 lg:flex">
            <div className="mb-10 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white font-bold text-xl">
                    M
                </div>
                <span className="text-2xl font-bold tracking-tighter text-white">MeFlix</span>
            </div>

            <nav className="flex-1 space-y-2">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <div key={item.href}>
                            {item.name === "Search" ? (
                                <button
                                    onClick={() => {
                                        console.log("[MeFlix] Search button clicked, triggering modal...");
                                        window.dispatchEvent(new CustomEvent("meflix:open-search"));
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 hover:bg-surface-hover group text-text-muted hover:text-white"
                                    )}
                                >
                                    <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 text-text-muted group-hover:text-white" />
                                    {item.name}
                                </button>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 hover:bg-surface-hover group",
                                        isActive ? "bg-surface text-white" : "text-text-muted hover:text-white"
                                    )}
                                >
                                    <Icon className={cn(
                                        "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                                        item.color || (isActive ? "text-accent" : "text-text-muted group-hover:text-white")
                                    )} />
                                    {item.name}
                                    {isActive && (
                                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent animate-fade-in" />
                                    )}
                                    {item.name === "Live" && !isActive && (
                                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                    )}
                                </Link>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5">
                <Link
                    href="/profile"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-text-muted hover:text-white hover:bg-surface-hover transition-all duration-300"
                >
                    <User className="h-5 w-5" />
                    Profile
                </Link>
            </div>
        </aside>
    );
}
