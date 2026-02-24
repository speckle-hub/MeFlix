"use client";

import { useState } from "react";
import { useAddonStore } from "@/store/addonStore";
import { fetchAddonManifest } from "@/lib/stremioService";
import { Globe, Plus, Trash2, Loader2, Info, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddonManagerProps {
    isNSFW: boolean;
    title?: string;
    description?: string;
}

export default function AddonManager({ isNSFW, title, description }: AddonManagerProps) {
    const { addons, addAddon, removeAddon, toggleAddon } = useAddonStore();
    const [newUrl, setNewUrl] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Filter addons for this specific manager
    const filteredAddons = addons.filter(a => a.isNSFW === isNSFW);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUrl) return;

        setIsAdding(true);
        try {
            const manifest = await fetchAddonManifest(newUrl);
            if (!manifest) {
                toast.error("Invalid Addon", {
                    description: "Could not fetch manifest. The addon might be offline or the URL is incorrect."
                });
                return;
            }
            addAddon(newUrl, manifest.name, isNSFW);
            setNewUrl("");
            toast.success(`Successfully added ${manifest.name}`, {
                description: isNSFW ? "Added to NSFW Sources" : "Added as Regular Source"
            });
        } catch (err) {
            toast.error("Failed to add addon", {
                description: "Make sure the URL is a valid Stremio manifest.json"
            });
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-white">{title || (isNSFW ? "NSFW Addon Manager" : "Addon Manager")}</h2>
                    {isNSFW && (
                        <span className="bg-red-500/20 text-red-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Adult Only
                        </span>
                    )}
                </div>
                <p className="text-text-muted">
                    {description || (isNSFW ? "Manage mature content sources separately." : "Add and manage regular Stremio addons.")}
                </p>
            </div>

            {/* Add New Addon */}
            <form onSubmit={handleAdd} className="relative group">
                <div className={cn(
                    "absolute -inset-1 blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200",
                    isNSFW ? "bg-gradient-to-r from-red-500/20 to-transparent" : "bg-gradient-to-r from-accent/20 to-transparent"
                )} />
                <div className="relative flex flex-col sm:flex-row gap-4 rounded-3xl bg-surface p-2 border border-white/5 shadow-xl">
                    <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder={isNSFW ? "Paste NSFW manifest.json URL..." : "Paste manifest.json URL..."}
                        className="flex-1 bg-transparent px-6 py-4 text-white placeholder-text-muted focus:outline-none"
                    />
                    <button
                        disabled={isAdding}
                        type="submit"
                        className={cn(
                            "flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all disabled:opacity-50",
                            isNSFW ? "bg-red-500 hover:bg-red-600 shadow-[0_8px_16px_-4px_rgba(239,68,68,0.4)]" : "bg-accent hover:bg-accent-dark shadow-[0_8px_16px_-4px_rgba(var(--accent),0.4)]"
                        )}
                    >
                        {isAdding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                        Add {isNSFW ? "NSFW" : ""} Addon
                    </button>
                </div>
            </form>

            {/* List Addons */}
            <div className="grid gap-4">
                {filteredAddons.map((addon) => (
                    <div
                        key={addon.url}
                        className="group flex items-center justify-between rounded-3xl bg-surface/50 p-6 border border-white/5 hover:bg-surface-hover transition-all duration-300"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5",
                                addon.isEnabled
                                    ? (isNSFW ? "bg-red-500/10 text-red-500" : "bg-accent/10 text-accent")
                                    : "bg-white/5 text-text-muted"
                            )}>
                                <Globe className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{addon.name}</h3>
                                <p className="text-text-muted text-xs truncate max-w-[200px] sm:max-w-sm">
                                    {addon.url}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => toggleAddon(addon.url)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                    addon.isEnabled
                                        ? (isNSFW ? "bg-red-500/20 text-red-500 border border-red-500/20" : "bg-accent/20 text-accent border border-accent/20")
                                        : "bg-white/5 text-text-muted border border-white/10"
                                )}
                            >
                                {addon.isEnabled ? "Active" : "Disabled"}
                            </button>
                            <button
                                onClick={() => removeAddon(addon.url)}
                                className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredAddons.length === 0 && (
                    <div className="text-center py-12 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                        <Info className="h-8 w-8 text-text-muted mx-auto mb-3" />
                        <p className="text-text-muted text-sm italic">No {isNSFW ? "NSFW" : "regular"} addons found. {isNSFW ? "Add mature sources here." : "Connect a source above!"}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
