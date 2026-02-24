"use client";

import { useState, useEffect } from "react";
import { useWatchlistStore } from "@/store/watchlistStore";
import { useAddonStore } from "@/store/addonStore";
import { useProfileStore } from "@/store/profileStore";
import {
    History,
    Bookmark,
    User,
    Settings,
    Shield,
    Eye,
    EyeOff,
    Clock,
    Zap,
    Globe,
    ChevronRight,
    Download,
    Upload,
    Trash2,
    Edit2,
    Save,
    X,
    CheckCircle2,
    Library
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function ProfilePage() {
    const { watchlist, history } = useWatchlistStore();
    const { addons } = useAddonStore();
    const {
        displayName,
        avatarColor,
        memberSince,
        preferences,
        setDisplayName,
        updatePreference,
        exportData,
        importData,
        clearAllData
    } = useProfileStore();

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(displayName);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="min-h-screen bg-background" />;
    }

    const handleSaveName = () => {
        setDisplayName(newName);
        setIsEditingName(false);
    };

    const stats = [
        { label: "Total Watched", value: history.length, icon: History, color: "text-purple-400" },
        { label: "Watchlist", value: watchlist.length, icon: Bookmark, color: "text-accent" },
        { label: "Addons", value: addons.length, icon: Zap, color: "text-amber-400" },
        { label: "Member Since", value: memberSince.split(" ").pop(), icon: Clock, color: "text-emerald-400" },
    ];

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) importData(content);
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen pb-20 space-y-10 animate-fade-in max-w-6xl mx-auto px-4 lg:px-0">
            {/* Profile Header section */}
            <div className="relative overflow-hidden rounded-3xl bg-surface/30 p-8 border border-white/5 lg:p-12 mb-8 mt-4 lg:mt-8">
                <div className="absolute top-0 right-0 -m-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                    {/* Avatar */}
                    <div className={`h-32 w-32 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-black/40 ring-4 ring-white/10 shrink-0`}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-4 text-center lg:text-left flex-1">
                        <div className="flex items-center justify-center lg:justify-start gap-4">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-2xl font-bold text-white outline-none focus:border-accent"
                                        autoFocus
                                    />
                                    <button onClick={handleSaveName} className="p-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30">
                                        <Save className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => setIsEditingName(false)} className="p-2 bg-white/5 text-text-muted rounded-lg hover:bg-white/10">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-4xl font-black text-white lg:text-5xl">{displayName}</h1>
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="p-2 bg-white/5 text-text-muted rounded-full hover:bg-white/10 opacity-50 hover:opacity-100 transition-opacity"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                        </div>
                        <p className="text-lg text-text-muted">
                            Member since {memberSince} • Premium MeFlix User
                        </p>

                        {/* Stats Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                            {stats.map((stat, idx) => (
                                <div key={idx} className="bg-black/20 border border-white/5 rounded-2xl p-4 text-center group hover:border-white/10 transition-colors">
                                    <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color} opacity-80`} />
                                    <div className="text-xl font-bold text-white">{stat.value}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-text-muted font-bold">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Column: Preferences */}
                <div className="lg:col-span-2 space-y-10">
                    <section className="bg-surface/20 border border-white/5 rounded-3xl p-6 lg:p-8 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                                <Settings className="h-5 w-5 text-accent" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Preferences</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Quality */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Default Quality</label>
                                <select
                                    value={preferences.defaultQuality}
                                    onChange={(e) => updatePreference('defaultQuality', e.target.value as any)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent appearance-none transition-all cursor-pointer"
                                >
                                    <option value="auto">Auto (Recommended)</option>
                                    <option value="1080p">High (1080p)</option>
                                    <option value="720p">Medium (720p)</option>
                                    <option value="480p">Low (480p)</option>
                                </select>
                            </div>

                            {/* Playback Speed */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Default Speed</label>
                                <select
                                    value={preferences.defaultPlaybackSpeed}
                                    onChange={(e) => updatePreference('defaultPlaybackSpeed', parseFloat(e.target.value))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent appearance-none transition-all cursor-pointer"
                                >
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1">Normal (1.0x)</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2">2.0x</option>
                                </select>
                            </div>

                            {/* Subtitle Language */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Subtitles</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <input
                                        type="text"
                                        value={preferences.subtitleLanguage}
                                        onChange={(e) => updatePreference('subtitleLanguage', e.target.value)}
                                        placeholder="English, Spanish, etc."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-accent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Autoplay */}
                            <div className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
                                <div className="space-y-1">
                                    <div className="font-bold text-white">Autoplay Next</div>
                                    <div className="text-xs text-text-muted">Start next episode automatically</div>
                                </div>
                                <button
                                    onClick={() => updatePreference('autoplayNext', !preferences.autoplayNext)}
                                    className={`relative h-6 w-12 rounded-full transition-colors ${preferences.autoplayNext ? 'bg-accent' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${preferences.autoplayNext ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* NSFW Toggle */}
                            <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${preferences.showNSFW ? 'bg-red-500/20' : 'bg-white/5'}`}>
                                        <Shield className={`h-4 w-4 ${preferences.showNSFW ? 'text-red-400' : 'text-text-muted'}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-bold text-white">NSFW Content</div>
                                        <div className="text-xs text-text-muted">Show adult rated material</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updatePreference('showNSFW', !preferences.showNSFW)}
                                    className={`relative h-6 w-12 rounded-full transition-colors ${preferences.showNSFW ? 'bg-red-500' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${preferences.showNSFW ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Data Management Section */}
                    <section className="bg-surface/20 border border-white/5 rounded-3xl p-6 lg:p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <Trash2 className="h-5 w-5 text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Data Management</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <button
                                onClick={exportData}
                                className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors font-bold text-white group"
                            >
                                <Download className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                                Export Backup
                            </button>

                            <label className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors font-bold text-white cursor-pointer group">
                                <Upload className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                                Import Backup
                                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                            </label>

                            <button
                                onClick={() => {
                                    if (confirm("Are you sure? This will delete all your watch progress, addons, and profile settings.")) {
                                        clearAllData();
                                    }
                                }}
                                className="flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-colors font-bold text-red-400 group"
                            >
                                <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                Clear All Data
                            </button>
                        </div>
                    </section>
                </div>

                {/* Right Column: Quick Links & Summary */}
                <div className="space-y-10">
                    {/* Addons Quick View */}
                    <section className="bg-surface/20 border border-white/5 rounded-3xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Zap className="h-5 w-5 text-amber-400" />
                                Installed Addons
                            </h3>
                            <Link href="/addons" className="text-xs font-bold text-accent hover:underline flex items-center">
                                Manage <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {addons.slice(0, 5).map((addon, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                                    <div className="h-10 w-10 relative rounded-lg overflow-hidden bg-white/5 shrink-0">
                                        {addon.icon ? (
                                            <Image src={addon.icon} alt={addon.name} fill className="object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-xs font-black text-white/20">ME</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-white truncate">{addon.name}</div>
                                        <div className="text-[10px] text-text-muted truncate">{addon.url}</div>
                                    </div>
                                    {addon.isEnabled && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    )}
                                </div>
                            ))}
                            {addons.length > 5 && (
                                <div className="text-center text-xs text-text-muted py-2">
                                    + {addons.length - 5} more addons
                                </div>
                            )}
                            {addons.length === 0 && (
                                <div className="text-center text-text-muted py-6 text-sm italic">
                                    No addons installed yet.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Library Quick Access */}
                    <section className="bg-surface/20 border border-white/5 rounded-3xl p-6 space-y-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Library className="h-5 w-5 text-purple-400" />
                            Library
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            <Link href="/profile" className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-accent transition-colors group">
                                <div className="flex items-center gap-3">
                                    <Bookmark className="h-5 w-5 text-accent" />
                                    <span className="font-bold text-white">My Watchlist</span>
                                </div>
                                <span className="text-sm font-bold text-text-muted group-hover:text-white transition-colors">{watchlist.length} items</span>
                            </Link>

                            <Link href="/profile" className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-purple-500 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <History className="h-5 w-5 text-purple-400" />
                                    <span className="font-bold text-white">Watch History</span>
                                </div>
                                <span className="text-sm font-bold text-text-muted group-hover:text-white transition-colors">{history.length} items</span>
                            </Link>
                        </div>
                    </section>

                    {/* App Version Info */}
                    <div className="text-center space-y-2 pt-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">MeFlix Streaming Engine</div>
                        <div className="text-xs text-text-muted">Version 2.4.0-premium</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

