"use client";

import { useState } from "react";
import {
    Settings, Play, Palette, Shield, Info,
    ChevronRight, ArrowLeft, Globe, Monitor,
    Check, Trash2, RefreshCcw, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSettingsStore, AccentColor } from "@/store/settingsStore";
import { useAddonStore } from "@/store/addonStore";
import { useWatchlistStore } from "@/store/watchlistStore";
import { useProgressStore } from "@/store/progressStore";

type Section = "addons" | "playback" | "appearance" | "privacy" | "about";

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState<Section>("addons");
    const {
        accentColor, setAccentColor,
        backgroundBrightness, setBackgroundBrightness,
        cardSize, setCardSize,
        autoplay, setAutoplay,
        resetAll
    } = useSettingsStore();

    const sections = [
        { id: "addons", label: "Addons Manager", icon: Globe },
        { id: "playback", label: "Playback", icon: Play },
        { id: "appearance", label: "Appearance", icon: Palette },
        { id: "privacy", label: "Privacy", icon: Shield },
        { id: "about", label: "About", icon: Info },
    ] as const;

    const accentColors: { id: AccentColor; color: string }[] = [
        { id: "red", color: "#e50914" },
        { id: "blue", color: "#0070f3" },
        { id: "purple", color: "#7928ca" },
        { id: "green", color: "#00703c" },
        { id: "orange", color: "#f5a623" },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                {/* Sidebar */}
                <div className="space-y-2">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm",
                                activeSection === section.id
                                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                                    : "text-text-muted hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <section.icon className="h-4 w-4" />
                            {section.label}
                            {activeSection === section.id && (
                                <motion.div layoutId="setting-active" className="ml-auto">
                                    <ChevronRight className="h-4 w-4" />
                                </motion.div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="rounded-3xl border border-white/5 bg-surface/50 backdrop-blur-xl p-8 min-h-[600px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-8"
                        >
                            {activeSection === "appearance" && (
                                <div className="space-y-10">
                                    <SettingGroup title="Theme & Color">
                                        <p className="text-xs text-text-muted mb-4 uppercase tracking-widest font-bold">Accent Color</p>
                                        <div className="flex flex-wrap gap-4">
                                            {accentColors.map((color) => (
                                                <button
                                                    key={color.id}
                                                    onClick={() => setAccentColor(color.id)}
                                                    className={cn(
                                                        "group relative h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                                                        accentColor === color.id ? "scale-110" : "hover:scale-105"
                                                    )}
                                                    style={{ backgroundColor: color.color }}
                                                >
                                                    {accentColor === color.id && (
                                                        <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                                                            <Check className="h-4 w-4 text-white" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 rounded-2xl border-2 border-white/0 group-hover:border-white/20 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </SettingGroup>

                                    <SettingGroup title="Darkness Mode">
                                        <p className="text-xs text-text-muted mb-6">Adjust background intensity from pure black to dark gray.</p>
                                        <div className="flex items-center gap-6">
                                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">OLED</span>
                                            <input
                                                type="range" min="0" max="1" step="0.1"
                                                value={backgroundBrightness}
                                                onChange={(e) => setBackgroundBrightness(parseFloat(e.target.value))}
                                                className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none accent-accent"
                                            />
                                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Gray</span>
                                        </div>
                                    </SettingGroup>

                                    <SettingGroup title="Interface">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-white">Card Style</h4>
                                                <p className="text-xs text-text-muted">Change how content cards are displayed.</p>
                                            </div>
                                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                                {(["small", "medium", "large"] as const).map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={() => setCardSize(size)}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
                                                            cardSize === size ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-white"
                                                        )}
                                                    >
                                                        {size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </SettingGroup>
                                </div>
                            )}

                            {activeSection === "playback" && (
                                <div className="space-y-6">
                                    <SettingToggle
                                        label="Autoplay"
                                        description="Automatically play the next episode in a series."
                                        value={autoplay}
                                        onChange={setAutoplay}
                                    />
                                    <SettingGroup title="Streaming Quality">
                                        <p className="text-xs text-text-muted mb-4">Default resolution for all players.</p>
                                        <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-accent appearance-none">
                                            <option>Auto (Recommended)</option>
                                            <option>4K Ultra HD</option>
                                            <option>1080p Full HD</option>
                                            <option>720p HD</option>
                                        </select>
                                    </SettingGroup>
                                </div>
                            )}

                            {activeSection === "addons" && <AddonSettings />}

                            {activeSection === "privacy" && <PrivacySettings resetAll={resetAll} />}

                            {activeSection === "about" && (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                                    <div className="h-24 w-24 rounded-[32px] bg-accent flex items-center justify-center shadow-2xl shadow-accent/40">
                                        <Monitor className="h-12 w-12 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-black text-white">MeFlix</h2>
                                        <p className="text-text-muted font-medium">Version 2.0.4 Platinum</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="px-6 py-2 rounded-xl glass text-xs font-bold text-white border border-white/5">Terms</button>
                                        <button className="px-6 py-2 rounded-xl glass text-xs font-bold text-white border border-white/5">Credits</button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <div className="bg-white/0 rounded-2xl">{children}</div>
        </section>
    );
}

function SettingToggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-4 px-0">
            <div className="space-y-1">
                <h4 className="font-bold text-white">{label}</h4>
                <p className="text-xs text-text-muted">{description}</p>
            </div>
            <button
                onClick={() => onChange(!value)}
                className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    value ? "bg-accent" : "bg-white/10"
                )}
            >
                <motion.div
                    animate={{ x: value ? 26 : 4 }}
                    className="absolute top-1 left-0 h-4 w-4 rounded-full bg-white shadow-sm"
                />
            </button>
        </div>
    );
}

function AddonSettings() {
    const { addons, toggleAddon, removeAddon } = useAddonStore();
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Active Addons</h3>
                <span className="text-xs font-bold text-accent px-2 py-1 rounded bg-accent/10 border border-accent/20">
                    {addons.filter(a => a.isEnabled).length} Enabled
                </span>
            </div>
            <div className="grid gap-4">
                {addons.map(addon => (
                    <div key={addon.url} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group">
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg",
                            addon.isEnabled ? "bg-accent text-white" : "bg-white/10 text-text-muted"
                        )}>
                            {addon.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white truncate">{addon.name}</h4>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <p className="text-xs text-text-muted truncate">Operational</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => toggleAddon(addon.url)}
                                className={cn(
                                    "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                                    addon.isEnabled ? "bg-white/10 text-white" : "bg-accent text-white"
                                )}
                            >
                                {addon.isEnabled ? "Disable" : "Enable"}
                            </button>
                            <button
                                onClick={() => removeAddon(addon.url)}
                                className="p-1.5 rounded-xl text-text-muted hover:text-accent hover:bg-accent/10 transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full py-4 rounded-2xl border border-dashed border-white/10 text-text-muted text-sm font-bold hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Add Custom Addon URL
            </button>
        </div>
    );
}

function PrivacySettings({ resetAll }: { resetAll: () => void }) {
    const { clearHistory, watchlist } = useWatchlistStore();
    const { clearAllProgress } = useProgressStore();

    const handleReset = () => {
        if (confirm("Are you sure? This will clear all settings, watchlist, and history.")) {
            resetAll();
            clearHistory();
            clearAllProgress();
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-white">Data Control</h3>
            <div className="grid gap-4">
                <button
                    onClick={clearHistory}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left"
                >
                    <div>
                        <h4 className="font-bold text-white">Clear Watch History</h4>
                        <p className="text-xs text-text-muted">Remove all items from recently watched.</p>
                    </div>
                    <Trash2 className="h-4 w-4 text-text-muted" />
                </button>
                <button
                    onClick={clearAllProgress}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left"
                >
                    <div>
                        <h4 className="font-bold text-white">Clear Playback Progress</h4>
                        <p className="text-xs text-text-muted">Reset "Continue Watching" for all items.</p>
                    </div>
                    <RefreshCcw className="h-4 w-4 text-text-muted" />
                </button>
                <button
                    onClick={handleReset}
                    className="flex items-center justify-between p-4 rounded-2xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all text-left text-accent"
                >
                    <div>
                        <h4 className="font-bold">Reset All Application Data</h4>
                        <p className="text-xs opacity-70">Factory nuclear reset. Watchlist and settings will be lost.</p>
                    </div>
                    <Shield className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
