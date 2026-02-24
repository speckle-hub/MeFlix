"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Bookmark, User, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
    { name: "Home", href: "/", icon: Home },
    { name: "Live", href: "/live", icon: Radio },
    { name: "Search", href: "/search", icon: Search },
    { name: "Watchlist", href: "/watchlist", icon: Bookmark },
    { name: "Profile", href: "/profile", icon: User },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-white/5 bg-background/80 px-4 py-3 pb-8 backdrop-blur-xl lg:hidden">
            {MOBILE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                if (item.name === "Search") {
                    return (
                        <button
                            key={item.href}
                            onClick={() => window.dispatchEvent(new CustomEvent("meflix:open-search"))}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-all duration-300",
                                "text-text-muted hover:text-white"
                            )}
                        >
                            <div className="relative mb-1 flex h-10 w-10 items-center justify-center rounded-2xl hover:bg-white/5 transition-all duration-300">
                                <Icon className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-medium uppercase tracking-widest">{item.name}</span>
                        </button>
                    );
                }

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 transition-all duration-300",
                            isActive ? "text-accent" : "text-text-muted"
                        )}
                    >
                        <div className={cn(
                            "relative mb-1 flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300",
                            isActive ? "bg-accent/10" : "hover:bg-white/5"
                        )}>
                            <Icon className={cn(
                                "h-6 w-6 transition-transform duration-300",
                                isActive && "scale-110"
                            )} />
                            {isActive && (
                                <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-accent" />
                            )}
                            {item.name === "Live" && !isActive && (
                                <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-pulse border-2 border-background" />
                            )}
                        </div>
                        <span className="text-[10px] font-medium uppercase tracking-widest">{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
