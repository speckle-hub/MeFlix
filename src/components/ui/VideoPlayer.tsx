"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    Settings, SkipBack, SkipForward, X, ChevronRight,
    Monitor, Loader2, Check, Plus, PartyPopper
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useProgressStore } from "@/store/progressStore";
import { useWatchlistStore } from "@/store/watchlistStore";
import { useProfileStore } from "@/store/profileStore";
import { useHaptics } from "@/hooks/useHaptics";
import { toast } from "sonner";
import Hls from 'hls.js';
import { SeasonSelector } from "./SeasonSelector";

interface VideoPlayerProps {
    url: string;
    title: string;
    id: string;
    type: string;
    poster: string;
    isLive?: boolean;
    channelLogo?: string;
    season?: number;
    episode?: number;
    episodeTitle?: string;
    isNSFW?: boolean;
    addonBaseUrl?: string;
    addonId?: string;
    onClose?: () => void;
}

export default function VideoPlayer({
    url, title, id, type, poster, isLive, channelLogo,
    season, episode, episodeTitle, isNSFW,
    addonBaseUrl, addonId,
    onClose
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const retryCountRef = useRef(0);
    const playPromiseRef = useRef<Promise<void> | null>(null);
    const MAX_RETRIES = 5;

    const { saveProgress, getProgress, removeFromContinueWatching } = useProgressStore();
    const { addToHistory, isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlistStore();
    const { preferences } = useProfileStore();
    const { light, success: hapticSuccess } = useHaptics();

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay policy
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(preferences.defaultPlaybackSpeed || 1);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);

    // HLS Initialization & Management
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !url) return;

        // Clean up previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const isHls = url.includes('.m3u8') || url.includes('m3u8');

        if (isHls) {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    lowLatencyMode: isLive || false,
                    liveSyncDuration: 3,
                    liveMaxLatencyDuration: 10,
                    maxBufferLength: isLive ? 10 : 30,
                });
                hlsRef.current = hls;
                hls.loadSource(url);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setIsLoading(false);
                    // Start muted for autoplay compliance
                    video.muted = true;
                    setIsMuted(true);
                    safePlay();
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                if (isLive && retryCountRef.current < MAX_RETRIES) {
                                    retryCountRef.current++;
                                    setIsReconnecting(true);
                                    setTimeout(() => {
                                        hls.startLoad();
                                        setIsReconnecting(false);
                                    }, 3000);
                                } else {
                                    setStreamError('Live stream connection lost. Try another source.');
                                    hls.destroy();
                                }
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                                break;
                            default:
                                setStreamError('Fatal stream error. Cannot recover.');
                                hls.destroy();
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS support
                video.src = url;
                video.muted = true;
                setIsMuted(true);
                safePlay();
            }
        } else {
            // Direct MP4/other format
            video.src = url;
            video.muted = true;
            setIsMuted(true);
            safePlay();
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [url, isLive]);

    const safePlay = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;

        // If a play is already in progress, don't start another one
        // and avoid interrupting the current promise.
        try {
            playPromiseRef.current = video.play();
            if (playPromiseRef.current !== undefined) {
                await playPromiseRef.current;
                setIsPlaying(true);
                playPromiseRef.current = null;
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.debug('[VideoPlayer] Play interrupted by new load request (expected during channel switch).');
            } else {
                console.warn('[VideoPlayer] Play failed:', err);
            }
            setIsPlaying(false);
            playPromiseRef.current = null;
        }
    }, []);

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                safePlay();
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [safePlay]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            const dur = videoRef.current.duration;
            setCurrentTime(time);

            // Save progress
            if (!isLive && Math.floor(time) % 5 === 0) {
                // For series, the 'id' passed might be an episode ID (e.g., tt...:1:1)
                // We want to store the base ID as the primary key for the card navigation,
                // but keep the fullId for resumption.
                const baseId = type === 'series' && id.includes(':') ? id.split(':')[0] : id;

                console.log('[CONTINUE WATCHING] Saving progress:', {
                    baseId,
                    type,
                    fullId: id,
                    title,
                    addonBaseUrl
                });

                saveProgress({
                    id: baseId,
                    fullId: id,
                    title,
                    poster,
                    type,
                    timestamp: time,
                    duration: dur,
                    isNSFW: !!isNSFW,
                    addonBaseUrl,
                    addonId,
                    season,
                    episode
                });
            }

            // Sync with history once after 10s
            if (!isLive && Math.floor(time) === 10) {
                addToHistory({
                    id, title, poster,
                    type: type as any,
                    description: "", backdrop: "", rating: "N/A", year: "", quality: "HD",
                    isNSFW: !!isNSFW
                });
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsLoading(false);

            console.log('[AUDIO DEBUG] video.muted:', videoRef.current.muted);
            console.log('[AUDIO DEBUG] video.volume:', videoRef.current.volume);
            console.log('[AUDIO DEBUG] readyState:', videoRef.current.readyState);

            videoRef.current.addEventListener('loadeddata', () => {
                console.log('[AUDIO DEBUG] After load - muted:', videoRef.current?.muted);
                console.log('[AUDIO DEBUG] After load - volume:', videoRef.current?.volume);
            });

            const saved = getProgress(id);
            if (saved && saved.timestamp < saved.duration * 0.9) {
                videoRef.current.currentTime = saved.timestamp;
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            videoRef.current?.parentElement?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const skip = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    };

    const togglePip = async () => {
        if (!videoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (err) {
            console.error("PiP failed:", err);
        }
    };

    const runAudioDiagnostic = () => {
        const video = videoRef.current;
        if (!video) {
            console.error('[AUDIO DIAG] videoRef.current is NULL');
            return;
        }

        console.log('=== FULL AUDIO DIAGNOSTIC ===');
        console.log('video.muted:', video.muted);
        console.log('video.volume:', video.volume);
        console.log('video.paused:', video.paused);
        console.log('video.readyState:', video.readyState);
        console.log('video.currentSrc:', video.currentSrc);
        console.log('video.networkState:', video.networkState);
        console.log('video.error:', video.error);

        // Check if audio tracks exist
        console.log('video.audioTracks:', (video as any).audioTracks);
        console.log('video.audioTracks?.length:', (video as any).audioTracks?.length);

        // Check the actual HTML attributes on the element
        console.log('Has muted attribute:', video.hasAttribute('muted'));
        console.log('video element outerHTML:', video.outerHTML.substring(0, 500));

        // Force unmute attempt
        video.muted = false;
        video.volume = 1.0;
        setIsMuted(false);
        setVolume(1);
        console.log('After force unmute - muted:', video.muted, 'volume:', video.volume);
        console.log('=== END DIAGNOSTIC ===');
    };

    const [needsUserInteraction, setNeedsUserInteraction] = useState(true);

    // Initial play check happens in HLS effect or native src setting

    const handleFirstInteraction = () => {
        if (needsUserInteraction && videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.volume = 1;
            setIsMuted(false);
            setVolume(1);
            setNeedsUserInteraction(false);
            console.log('[AUDIO] Unmuted after user interaction');
            runAudioDiagnostic(); // Run diagnostic once on first interaction
        }
    };

    // Listen for global interaction as fallback
    useEffect(() => {
        const globalHandler = () => handleFirstInteraction();
        document.addEventListener('click', globalHandler, { once: true });
        document.addEventListener('touchstart', globalHandler, { once: true });
        return () => {
            document.removeEventListener('click', globalHandler);
            document.removeEventListener('touchstart', globalHandler);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

            // Unlock audio on any key press too
            handleFirstInteraction();

            switch (e.key.toLowerCase()) {
                case " ":
                    e.preventDefault();
                    togglePlay();
                    break;
                case "f":
                    toggleFullscreen();
                    break;
                case "m":
                    const targetMute = !isMuted;
                    setIsMuted(targetMute);
                    if (videoRef.current) videoRef.current.muted = targetMute;
                    break;
                case "arrowleft":
                    if (!isLive) skip(-10);
                    break;
                case "arrowright":
                    if (!isLive) skip(10);
                    break;
                case "arrowup":
                    e.preventDefault();
                    setVolume(prev => {
                        const next = Math.min(1, prev + 0.1);
                        if (videoRef.current) videoRef.current.volume = next;
                        return next;
                    });
                    setIsMuted(false);
                    if (videoRef.current) videoRef.current.muted = false;
                    break;
                case "arrowdown":
                    e.preventDefault();
                    setVolume(prev => {
                        const next = Math.max(0, prev - 0.1);
                        if (videoRef.current) videoRef.current.volume = next;
                        return next;
                    });
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [togglePlay, id, title, poster, type, hapticSuccess, light, isInWatchlist, addToWatchlist, removeFromWatchlist, removeFromContinueWatching, needsUserInteraction, isMuted]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    return (
        <div
            className={cn(
                "relative w-full overflow-hidden bg-black group",
                isFullscreen ? "fixed inset-0 z-[200] rounded-none" : "aspect-video rounded-3xl"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
            style={{ cursor: showControls ? 'default' : 'none' }}
        >
            <video
                ref={videoRef}
                className="h-full w-full"
                onClick={() => {
                    handleFirstInteraction();
                    togglePlay();
                }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => setIsLoading(false)}
                muted={isMuted}
                playsInline
            />

            {/* Reconnecting Overlay */}
            <AnimatePresence>
                {isReconnecting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
                        <span className="text-white font-black tracking-widest uppercase">Reconnecting to Live Stream...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stream Error Overlay */}
            <AnimatePresence>
                {streamError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-zinc-950 px-6 text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                            <X className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Stream Error</h3>
                        <p className="text-zinc-400 mb-8 max-w-md">{streamError}</p>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-white text-black font-black rounded-xl hover:scale-105 transition-all"
                        >
                            CLOSE PLAYER
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top/Bottom Gradients for readability */}
            <AnimatePresence>
                {showControls && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10"
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10"
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Click to Unmute Overlay */}
            <AnimatePresence>
                {needsUserInteraction && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
                        onClick={handleFirstInteraction}
                    >
                        <button
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full text-xl font-bold shadow-2xl hover:scale-105 transition-all flex items-center gap-3 animate-pulse"
                        >
                            <VolumeX className="w-8 h-8" />
                            CLICK TO UNMUTE
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Center Controls (Play/Pause, Seek, Buffer) */}
            <AnimatePresence mode="wait">
                {showControls || !isPlaying ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                    >
                        <div className="flex items-center gap-12 lg:gap-24 pointer-events-auto">
                            {!isLive && (
                                <button
                                    onClick={() => skip(-10)}
                                    className="p-4 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all backdrop-blur-sm group/btn"
                                >
                                    <SkipBack className="w-10 h-10 group-active/btn:scale-90" />
                                    <span className="absolute mt-2 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap opacity-0 group-hover/btn:opacity-100">10s</span>
                                </button>
                            )}

                            <button
                                onClick={togglePlay}
                                className="w-24 h-24 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all backdrop-blur-md"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-12 h-12 animate-spin text-red-600" />
                                ) : isPlaying ? (
                                    <Pause className="w-12 h-12 fill-current" />
                                ) : (
                                    <Play className="w-12 h-12 fill-current translate-x-1" />
                                )}
                            </button>

                            {!isLive && (
                                <button
                                    onClick={() => skip(10)}
                                    className="p-4 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all backdrop-blur-sm group/btn"
                                >
                                    <SkipForward className="w-10 h-10 group-active/btn:scale-90" />
                                    <span className="absolute mt-2 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap opacity-0 group-hover/btn:opacity-100">10s</span>
                                </button>
                            )}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            {/* Overlays (Top and Bottom) */}
            <AnimatePresence>
                {showControls && (
                    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 lg:p-10 pointer-events-none">
                        {/* Top Bar */}
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="flex items-center justify-between pointer-events-auto"
                        >
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={onClose}
                                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <div className="space-y-0.5">
                                    <h2 className="text-2xl font-black text-white">
                                        {title}
                                        {type === "series" && season && episode && (
                                            <span className="text-zinc-400 font-medium ml-3 text-lg">
                                                S{season}:E{episode} {episodeTitle && `· ${episodeTitle}`}
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase">{type}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className={cn(
                                        "p-3 rounded-xl border transition-all pointer-events-auto",
                                        showSettings
                                            ? "bg-accent border-accent text-white"
                                            : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                    )}
                                >
                                    <Settings className={cn("w-6 h-6", showSettings && "animate-spin-slow")} />
                                </button>

                                {/* Settings Panel Overlay */}
                                <AnimatePresence>
                                    {showSettings && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            className="absolute top-20 right-0 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 pointer-events-auto"
                                        >
                                            <div className="space-y-6">
                                                {!isLive && (
                                                    <div className="space-y-3">
                                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Playback Speed</label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                                                <button
                                                                    key={rate}
                                                                    onClick={() => setPlaybackRate(rate)}
                                                                    className={cn(
                                                                        "py-2 rounded-lg text-xs font-bold transition-all",
                                                                        playbackRate === rate
                                                                            ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                                                                            : "bg-white/5 hover:bg-white/10 text-zinc-300"
                                                                    )}
                                                                >
                                                                    {rate}x
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Quality</label>
                                                    <div className="space-y-1">
                                                        {['1080p (Auto)', '720p', '480p'].map((q) => (
                                                            <button
                                                                key={q}
                                                                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all group"
                                                            >
                                                                {q}
                                                                {q.includes('Auto') && <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-white/5 space-y-2">
                                                    <button
                                                        onClick={runAudioDiagnostic}
                                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-accent hover:text-white text-zinc-400 text-xs font-bold uppercase transition-all"
                                                    >
                                                        <Volume2 className="w-4 h-4" />
                                                        Run Audio Diagnostic
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        {/* Bottom Control Bar */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="space-y-6 pointer-events-auto"
                        >
                            {/* Progress Slider */}
                            {!isLive ? (
                                <div className="space-y-2">
                                    <div className="relative group/seeker px-1">
                                        <input
                                            type="range"
                                            min="0"
                                            max={duration || 100}
                                            value={currentTime}
                                            onChange={handleSeek}
                                            className="w-full h-1.5 bg-white/20 accent-red-600 cursor-pointer rounded-full appearance-none group-hover/seeker:h-2 transition-all"
                                            style={{
                                                background: `linear-gradient(to right, theme('colors.red.600') ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%)`
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-300 text-sm font-medium tabular-nums px-1">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                                    <div className="h-full bg-red-600/30 animate-pulse w-full" />
                                </div>
                            )}

                            {/* Controls Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                                        {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                                    </button>

                                    <div className="flex items-center gap-3 group/volume">
                                        <button
                                            onClick={() => {
                                                const targetMute = !isMuted;
                                                setIsMuted(targetMute);
                                                if (videoRef.current) videoRef.current.muted = targetMute;
                                            }}
                                            className="text-white hover:scale-110 transition-transform"
                                        >
                                            {isMuted || volume === 0 ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
                                        </button>
                                        <div className="w-0 group-hover/volume:w-24 transition-all duration-300 overflow-hidden flex items-center">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={isMuted ? 0 : volume}
                                                onChange={(e) => {
                                                    const newVol = parseFloat(e.target.value);
                                                    setVolume(newVol);
                                                    setIsMuted(newVol === 0);
                                                    if (videoRef.current) {
                                                        videoRef.current.volume = newVol;
                                                        videoRef.current.muted = newVol === 0;
                                                    }
                                                }}
                                                className="w-24 h-1 bg-white/30 accent-white cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="h-6 w-px bg-white/10 mx-2" />

                                    {/* Temporary Audio Diagnostic Button */}
                                    <button
                                        onClick={runAudioDiagnostic}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-lg transition-all animate-pulse pointer-events-auto border border-emerald-400/50"
                                    >
                                        🔊 DEBUG AUDIO
                                    </button>

                                    <div className="flex items-center gap-2">
                                        {isLive ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-white text-[10px] font-black uppercase backdrop-blur-md">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                                LIVE
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-[10px] font-bold uppercase backdrop-blur-md">
                                                VOD
                                            </div>
                                        )}

                                        {isLive && channelLogo && (
                                            <div className="h-6 w-6 rounded bg-black/40 border border-white/10 p-1">
                                                <img src={channelLogo} alt="Logo" className="h-full w-full object-contain" />
                                            </div>
                                        )}

                                        {isLive && (
                                            <button
                                                onClick={() => hlsRef.current?.liveSyncPosition && (videoRef.current!.currentTime = hlsRef.current.liveSyncPosition)}
                                                className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
                                            >
                                                ↻ BACK TO LIVE
                                            </button>
                                        )}
                                        <span className="text-zinc-400 text-xs bg-white/5 py-1 px-2 rounded border border-white/10 uppercase tracking-tighter">
                                            {isLive ? 'Live Edge' : '1080p · Auto'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 text-white/70">
                                    <button className="hover:text-white transition-colors">
                                        <Check className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={togglePip}
                                        className="hover:text-white transition-colors"
                                        title="Picture in Picture"
                                    >
                                        <Monitor className="w-6 h-6" />
                                    </button>
                                    <button onClick={toggleFullscreen} className="hover:text-white hover:scale-110 transition-all">
                                        {isFullscreen ? <Minimize className="w-7 h-7" /> : <Maximize className="w-7 h-7" />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper to format time
function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
