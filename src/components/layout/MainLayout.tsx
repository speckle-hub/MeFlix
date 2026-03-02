"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import MobileHeader from "./MobileHeader";
import PageTransition from "./PageTransition";
import SearchModal from "../ui/SearchModal";
import { cn } from "@/lib/utils";
import { useAddonStore } from "@/store/addonStore";
import { setServiceDemoMode } from "@/lib/stremioService";

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { isDemoMode } = useAddonStore();

    // Sync Demo Mode with Service
    useEffect(() => {
        setServiceDemoMode(isDemoMode);
    }, [isDemoMode]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        const handleOpenSearch = () => setIsSearchOpen(true);
        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("meflix:open-search", handleOpenSearch);
        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("meflix:open-search", handleOpenSearch);
        };
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-background text-white">
            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            <MobileHeader />

            {/* Desktop Sidebar with scroll-responsive border */}
            <div className={cn(
                "fixed left-0 top-0 z-50 h-full w-64 transition-all duration-300 hidden md:block",
                isScrolled ? "border-r border-white/10" : "border-r border-transparent"
            )}>
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <main className="relative z-0 flex-1 transition-all duration-300 md:ml-64 pt-16 md:pt-0 pb-24 md:pb-0">
                <div className="mx-auto w-full max-w-(--breakpoint-2xl) p-4 md:p-8">
                    <PageTransition>
                        {children}
                    </PageTransition>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
