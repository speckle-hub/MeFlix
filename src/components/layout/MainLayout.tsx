"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { usePathname } from "next/navigation";
import { useAddonStore } from "@/store/addonStore";
import { setServiceDemoMode } from "@/lib/stremioService";
import SearchModal from "@/components/ui/SearchModal";
import { AnimatePresence } from "framer-motion";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { isDemoMode } = useAddonStore();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Sync demo mode to service for server-side consistency
    useEffect(() => {
        setServiceDemoMode(isDemoMode);
    }, [isDemoMode]);

    // Global Search event listener
    useEffect(() => {
        const handleOpenSearch = () => setIsSearchOpen(true);
        window.addEventListener('open-search', handleOpenSearch);
        return () => window.removeEventListener('open-search', handleOpenSearch);
    }, []);

    const isVideoPage = pathname?.startsWith('/video/');

    if (isVideoPage) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-accent selection:text-white">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40 border-r border-white/5 bg-background shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content */}
            <main className="md:pl-64 pb-20 md:pb-0 min-h-screen flex flex-col relative z-0">
                <div className="flex-grow">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
                <BottomNav />
            </div>

            {/* Search Modal */}
            <AnimatePresence>
                {isSearchOpen && (
                    <SearchModal onClose={() => setIsSearchOpen(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}
