"use client";

import { useState, useEffect } from "react";
import { useMangaStore, MangaSource, MangaRepo } from "@/store/mangaStore";
import { fetchMangaRepoIndex, validateSelfHostedInstance } from "@/lib/mangaService";
import { BookOpen, Plus, Trash2, Loader2, Info, ShieldAlert, Globe, Server, Check, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function MangaSourceManager() {
    const { repos, installedSources, installSource, uninstallSource, toggleSource } = useMangaStore();
    const [selectedRepo, setSelectedRepo] = useState<MangaRepo | null>(null);
    const [availableSources, setAvailableSources] = useState<MangaSource[]>([]);
    const [isLoadingRepo, setIsLoadingRepo] = useState(false);

    const [selfHostedType, setSelfHostedType] = useState<'suwayomi' | 'kavita'>('suwayomi');
    const [selfHostedUrl, setSelfHostedUrl] = useState("");
    const [isValidating, setIsValidating] = useState(false);

    // Fetch sources when repo changes
    useEffect(() => {
        if (selectedRepo) {
            const fetchIndex = async () => {
                setIsLoadingRepo(true);
                const sources = await fetchMangaRepoIndex(selectedRepo);
                setAvailableSources(sources);
                setIsLoadingRepo(false);
            };
            fetchIndex();
        } else {
            setAvailableSources([]);
        }
    }, [selectedRepo]);

    const handleAddSelfHosted = async () => {
        if (!selfHostedUrl) return;
        setIsValidating(true);
        try {
            const isValid = await validateSelfHostedInstance(selfHostedUrl, selfHostedType);
            if (isValid) {
                const source: MangaSource = {
                    id: `${selfHostedType}-${Date.now()}`,
                    name: `${selfHostedType.charAt(0).toUpperCase() + selfHostedType.slice(1)} (Self-Hosted)`,
                    pkg: `custom.${selfHostedType}`,
                    lang: "en",
                    version: "1.0.0",
                    nsfw: 0,
                    repoUrl: "self-hosted",
                    isInstalled: true,
                    isEnabled: true,
                    baseUrl: selfHostedUrl
                };
                installSource(source);
                setSelfHostedUrl("");
                toast.success(`Connected to ${selfHostedType} instance!`);
            } else {
                toast.error("Validation Failed", {
                    description: `Could not connect to ${selfHostedType} at this URL.`
                });
            }
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Self-Hosted Connectivity */}
            <section className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <Server className="h-6 w-6 text-accent" />
                        Self-Hosted Sources
                    </h2>
                    <p className="text-text-muted">Connect your own Suwayomi or Kavita server instances via API.</p>
                </div>

                <div className="grid sm:grid-cols-[1fr_200px] gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center rounded-3xl bg-surface p-2 border border-white/5 shadow-xl">
                        <div className="flex gap-2 px-4 py-2 bg-white/5 rounded-2xl shrink-0">
                            {(['suwayomi', 'kavita'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSelfHostedType(type)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                        selfHostedType === type ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-white"
                                    )}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <input
                            type="url"
                            value={selfHostedUrl}
                            onChange={(e) => setSelfHostedUrl(e.target.value)}
                            placeholder="http://your-server-ip:4567"
                            className="flex-1 bg-transparent px-4 py-3 text-white placeholder-text-muted focus:outline-none"
                        />
                        <button
                            onClick={handleAddSelfHosted}
                            disabled={isValidating || !selfHostedUrl}
                            className="flex items-center gap-2 rounded-2xl bg-accent hover:bg-accent-dark px-8 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
                        >
                            {isValidating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                            Connect
                        </button>
                    </div>
                </div>
            </section>

            {/* Repository Browser */}
            <section className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <Globe className="h-6 w-6 text-accent" />
                        Repository Sources
                    </h2>
                    <p className="text-text-muted">Browse and install sources from official community repositories.</p>
                </div>

                {/* Repo Selection Chips */}
                <div className="flex flex-wrap gap-3">
                    {repos.map(repo => (
                        <button
                            key={repo.id}
                            onClick={() => setSelectedRepo(selectedRepo?.id === repo.id ? null : repo)}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all border",
                                selectedRepo?.id === repo.id
                                    ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                                    : "bg-surface/50 text-text-muted border-white/5 hover:border-white/20"
                            )}
                        >
                            {repo.name}
                            {selectedRepo?.id === repo.id && <Check className="h-4 w-4" />}
                        </button>
                    ))}
                </div>

                {/* Sources List */}
                <AnimatePresence mode="wait">
                    {selectedRepo && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-widest text-text-muted">
                                    {isLoadingRepo ? "Fetching index..." : `${availableSources.length} Extensions Found`}
                                </span>
                            </div>

                            <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {isLoadingRepo ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="h-10 w-10 text-accent animate-spin" />
                                        <p className="text-text-muted animate-pulse">Parsing repo index...</p>
                                    </div>
                                ) : availableSources.map(source => {
                                    const isInstalled = installedSources.some(s => s.pkg === source.pkg);
                                    return (
                                        <div
                                            key={source.pkg}
                                            className="group flex items-center justify-between rounded-3xl bg-surface/40 p-5 border border-white/5 hover:border-white/10 transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/5 border border-accent/10 text-accent">
                                                    <BookOpen className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-white">{source.name}</h3>
                                                        <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-text-muted">v{source.version}</span>
                                                        {source.nsfw === 1 && (
                                                            <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-1.5 py-0.5 rounded border border-red-500/10">NSFW</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-text-muted">{source.pkg} • {source.lang.toUpperCase()}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => isInstalled ? uninstallSource(source.id) : installSource(source)}
                                                className={cn(
                                                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                                    isInstalled
                                                        ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
                                                        : "bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white shadow-accent/10"
                                                )}
                                            >
                                                {isInstalled ? "Uninstall" : "Install"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* Installed Sources Management */}
            <section className="space-y-6 pt-6 border-t border-white/5">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <Settings2 className="h-6 w-6 text-accent" />
                        Manage Installed Sources
                    </h2>
                    <p className="text-text-muted">Enable, disable, or remove your active manga extensions.</p>
                </div>

                <div className="grid gap-4">
                    {installedSources.map(source => (
                        <div
                            key={source.id}
                            className="flex items-center justify-between rounded-3xl bg-surface/60 p-6 border border-white/5 shadow-xl"
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all",
                                    source.isEnabled ? "bg-accent/10 border-accent/20 text-accent" : "bg-white/5 border-white/5 text-text-muted"
                                )}>
                                    {source.repoUrl === "self-hosted" ? <Server className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{source.name}</h3>
                                    <p className="text-xs text-text-muted">{source.lang.toUpperCase()} • {source.pkg}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => toggleSource(source.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
                                        source.isEnabled
                                            ? "bg-accent/20 text-accent border-accent/20 shadow-lg shadow-accent/5"
                                            : "bg-white/5 text-text-muted border-white/10"
                                    )}
                                >
                                    {source.isEnabled ? "Active" : "Disabled"}
                                </button>
                                <button
                                    onClick={() => uninstallSource(source.id)}
                                    className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {installedSources.length === 0 && (
                        <div className="text-center py-16 rounded-[40px] border-2 border-dashed border-white/5 bg-white/[0.01]">
                            <BookOpen className="h-12 w-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-text-muted italic">No sources installed yet. Browse the repositories to start.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
