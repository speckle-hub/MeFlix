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
    { name: "Live", icon: Radio, href: "/live", color: "text-red-500" },
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
        <aside className="fixed left-0 top-0 h-full w-64 flex flex-col p-6">
            <div className="mb-10 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white font-bold text-xl">
                    M
                </div>
                <span className="text-2xl font-bold tracking-tighter text-white">MeFlix</span>
            </div>

            <nav className="flex-1 space-y-2">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href ? pathname === item.href : false;

                    const content = (
                        <>
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
                        </>
                    );

                    const className = cn(
                        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 hover:bg-surface-hover group",
                        isActive ? "bg-surface text-white" : "text-text-muted hover:text-white"
                    );

                    if (item.name === "Search") {
                        return (
                            <button
                                key={item.name}
                                onClick={() => window.dispatchEvent(new CustomEvent('open-search'))}
                                className={className}
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.href || item.name}
                            href={item.href || "#"}
                            className={className}
                        >
                            {content}
                        </Link>
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
