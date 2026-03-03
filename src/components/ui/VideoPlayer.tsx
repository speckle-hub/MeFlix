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
import { useSettingsStore } from "@/store/settingsStore";
import { Drawer } from "vaul";
import { Sun, Volume2 as VolIcon, FastForward, Rewind } from "lucide-react";

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

    const { gesturesEnabled, setGesturesEnabled } = useSettingsStore();

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [brightness, setBrightness] = useState(100);
    const [isMuted, setIsMuted] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(preferences.defaultPlaybackSpeed || 1);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Gesture States
    const [activeGesture, setActiveGesture] = useState<'volume' | 'brightness' | 'seek' | null>(null);
    const [gestureValue, setGestureValue] = useState<number>(0);
    const [seekPreview, setSeekPreview] = useState<number | null>(null);
    const [ripple, setRipple] = useState<{ x: number, y: number, side: 'left' | 'right' } | null>(null);

    const gestureRef = useRef({
        startX: 0,
        startY: 0,
        startValue: 0,
        isThrottled: false,
        startTime: 0,
        lastTap: 0,
        didGesture: false   // tracks if a swipe gesture actually fired
    });

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

        // --- SMART PROXY LOGIC ---
        // Only these domains actually need proxying due to CORS/geo-blocking
        const DOMAINS_REQUIRING_PROXY: string[] = [];
        // We'll add real domains here later if specific sources need it

        function shouldProxy(streamUrl: string): boolean {
            try {
                const hostname = new URL(streamUrl).hostname;
                return DOMAINS_REQUIRING_PROXY.some(domain => hostname.includes(domain));
            } catch {
                return false;
            }
        }

        const isHlsManifest = url.includes('.m3u8');
        let finalUrl = url;
        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        if (isHlsManifest && shouldProxy(url)) {
            console.warn('[VideoPlayer] Skipping proxy for HLS manifest - not supported without rewriting');
            finalUrl = url;
        } else if (shouldProxy(url)) {
            finalUrl = `${origin}/api/proxy-stream?url=${encodeURIComponent(url)}`;
        }

        console.log('[VideoPlayer] Stream info:', {
            originalUrl: url,
            finalUrl,
            isHLS: isHlsManifest,
            isNSFW,
            wasProxied: finalUrl !== url
        });

        const isHls = finalUrl.includes('.m3u8') || finalUrl.includes('m3u8');

        if (isHls) {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    lowLatencyMode: isLive || false,
                    liveSyncDuration: 3,
                    liveMaxLatencyDuration: 10,
                    maxBufferLength: isLive ? 10 : 30,
                    // Pass headers if needed, but proxy handles most
                });
                hlsRef.current = hls;
                hls.loadSource(finalUrl);
                hls.attachMedia(video);

                // Set attributes that might cause lint issues in JSX
                video.setAttribute('referrerpolicy', 'no-referrer');

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setIsLoading(false);
                    // Start muted for autoplay compliance
                    video.muted = true;
                    setIsMuted(true);
                    safePlay();
                });

                hls.on(Hls.Events.ERROR, async (event, data) => {
                    console.error('[HLS ERROR]', {
                        event,
                        type: data.type,
                        details: data.details,
                        fatal: data.fatal,
                        url: finalUrl,
                        source: addonId || addonBaseUrl
                    });

                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                // If it's a proxied stream and we have a network error, try to get the JSON reason
                                const responseCode = data.response?.code;
                                if (isNSFW && ((responseCode !== undefined && responseCode >= 400) || data.details === 'manifestLoadError')) {
                                    try {
                                        const errorRes = await fetch(finalUrl);
                                        if (!errorRes.ok) {
                                            const errorData = await errorRes.json();
                                            if (errorData.error) {
                                                setStreamError(`Stream Error: ${errorData.error}. ${errorData.message || errorData.details || ''}`);
                                                setIsLoading(false);
                                                hls.destroy();
                                                return; // Stop here if we found a clear proxy error
                                            }
                                        }
                                    } catch (e) {
                                        console.warn('[VideoPlayer] Failed to fetch proxy error details:', e);
                                    }
                                }

                                if (retryCountRef.current < MAX_RETRIES) {
                                    retryCountRef.current++;
                                    setIsReconnecting(true);
                                    console.log(`[HLS] Network error, retrying (${retryCountRef.current}/${MAX_RETRIES})...`);
                                    setTimeout(() => {
                                        hls.startLoad();
                                        setIsReconnecting(false);
                                    }, 3000);
                                } else {
                                    setStreamError(`Stream connection failed. ${isNSFW ? 'NSFW Proxy error or source offline.' : 'Try another source.'}`);
                                    hls.destroy();
                                }
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log('[HLS] Media error, attempting recovery...');
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
                video.src = finalUrl;
                video.muted = true;
                setIsMuted(true);
                safePlay();
            }
        } else {
            // Direct MP4/other format
            video.src = finalUrl;
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
    }, [url, isLive, isNSFW]);

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
        <>
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
                    style={{ filter: `brightness(${brightness}%)` }}
                />

                {/* Gesture Overlay (Mobile Only) */}
                <div
                    className={cn(
                        "absolute inset-0 z-40 touch-none md:hidden",
                        !gesturesEnabled && "hidden"
                    )}
                    onPointerDown={(e) => {
                        if (!e.isPrimary) return;

                        const rect = e.currentTarget.getBoundingClientRect();
                        const edgePadding = 20; // 20px edge ignore

                        // Rule: Ignore edges to avoid conflicts with browser gestures
                        if (e.clientX < rect.left + edgePadding || e.clientX > rect.right - edgePadding) return;

                        // Rule: Do not start gesture if touching a control
                        const target = e.target as HTMLElement;
                        if (target.closest('button, input, a, [role="button"], .slider-thumb')) return;

                        // Rule: Ignore multi-touch (usually browser handles pinch/zoom)
                        // Note: Pointer events handle multi-touch via focus/primary, but we check again on move.

                        // Capture pointer so we don't lose moves if finger slides off element
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

                        gestureRef.current.startX = e.clientX;
                        gestureRef.current.startY = e.clientY;
                        gestureRef.current.startTime = Date.now();
                        gestureRef.current.didGesture = false;

                        // Double Tap Seek detection
                        const now = Date.now();
                        const delta = now - gestureRef.current.lastTap;
                        if (delta < 300 && delta > 0) {
                            // Use rect.left to get element-relative X, then compare to half width
                            const relativeX = e.clientX - rect.left;
                            const side = relativeX < rect.width / 2 ? 'left' : 'right';
                            const seekAmount = side === 'left' ? -10 : 10;
                            skip(seekAmount);
                            setRipple({ x: e.clientX, y: e.clientY, side });
                            setTimeout(() => setRipple(null), 600);
                            gestureRef.current.lastTap = 0; // reset so triple-tap doesn't re-trigger
                            gestureRef.current.didGesture = true;
                            return;
                        }
                        gestureRef.current.lastTap = now;
                    }}
                    onPointerMove={(e) => {
                        if (!e.isPrimary || gestureRef.current.isThrottled) return;

                        const deltaX = e.clientX - gestureRef.current.startX;
                        const deltaY = e.clientY - gestureRef.current.startY;
                        const rect = e.currentTarget.getBoundingClientRect();

                        if (!activeGesture) {
                            // Deadzone check: 10px threshold
                            const threshold = 10;
                            const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                            if (dist < threshold) return;

                            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                                gestureRef.current.didGesture = true;
                                const relativeX = e.clientX - rect.left;
                                if (relativeX < rect.width / 2) {
                                    setActiveGesture('brightness');
                                    gestureRef.current.startValue = brightness;
                                } else {
                                    setActiveGesture('volume');
                                    gestureRef.current.startValue = volume * 100;
                                }
                            } else if (Math.abs(deltaX) > 12) {
                                gestureRef.current.didGesture = true;
                                setActiveGesture('seek');
                                gestureRef.current.startValue = currentTime;
                                setShowControls(true);
                            }
                            return;
                        }

                        gestureRef.current.isThrottled = true;
                        requestAnimationFrame(() => {
                            if (activeGesture === 'brightness') {
                                const change = (deltaY / rect.height) * -150;
                                const newVal = Math.max(20, Math.min(100, gestureRef.current.startValue + change));
                                setBrightness(newVal);
                                setGestureValue(Math.round(newVal));
                            } else if (activeGesture === 'volume') {
                                const change = (deltaY / rect.height) * -100;
                                const newVal = Math.max(0, Math.min(100, gestureRef.current.startValue + change));
                                const volValue = newVal / 100;
                                setVolume(volValue);
                                setGestureValue(Math.round(newVal));
                                if (videoRef.current) {
                                    videoRef.current.volume = volValue;
                                    videoRef.current.muted = volValue === 0;
                                    setIsMuted(volValue === 0);
                                }
                            } else if (activeGesture === 'seek') {
                                const change = (deltaX / rect.width) * (duration || 300);
                                const newVal = Math.max(0, Math.min(duration || 1, gestureRef.current.startValue + change));
                                setSeekPreview(newVal);
                            }
                            gestureRef.current.isThrottled = false;
                        });
                    }}
                    onPointerUp={(e) => {
                        if (activeGesture === 'seek' && seekPreview !== null) {
                            if (videoRef.current) videoRef.current.currentTime = seekPreview;
                            setCurrentTime(seekPreview);
                        }

                        // Simple tap (no gesture, tiny movement): toggle play + show controls
                        if (!gestureRef.current.didGesture) {
                            const dx = Math.abs(e.clientX - gestureRef.current.startX);
                            const dy = Math.abs(e.clientY - gestureRef.current.startY);
                            const elapsed = Date.now() - gestureRef.current.startTime;
                            if (dx < 8 && dy < 8 && elapsed < 300) {
                                togglePlay();
                            }
                        }

                        setActiveGesture(null);
                        setGestureValue(0);
                        setSeekPreview(null);
                        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                        // Auto-hide controls after 3s
                        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
                        setShowControls(true);
                    }}
                    onPointerCancel={() => {
                        setActiveGesture(null);
                        setGestureValue(0);
                        setSeekPreview(null);
                        gestureRef.current.didGesture = false;
                    }}
                />

                {/* Gesture UI Overlays */}
                <AnimatePresence>
                    {activeGesture && activeGesture !== 'seek' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -20 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] pointer-events-none min-w-[120px]"
                        >
                            {activeGesture === 'brightness' ? (
                                <Sun className="w-10 h-10 text-yellow-400 fill-yellow-400/20" />
                            ) : (
                                <VolIcon className="w-10 h-10 text-white" />
                            )}
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-2xl font-black text-white tabular-nums">{gestureValue}%</span>
                                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                                    <div
                                        className="h-full bg-white transition-all duration-100"
                                        style={{ width: `${gestureValue}%` }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {seekPreview !== null && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl flex flex-col items-center gap-2 pointer-events-none"
                        >
                            <div className="flex items-center gap-3">
                                <FastForward className={cn("w-6 h-6 text-accent", seekPreview < currentTime && "rotate-180")} />
                                <span className="text-3xl font-black text-white tabular-nums">{formatTime(seekPreview)}</span>
                            </div>
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                {seekPreview > currentTime ? `+${formatTime(seekPreview - currentTime)}` : `-${formatTime(currentTime - seekPreview)}`}
                            </span>
                        </motion.div>
                    )}

                    {ripple && (
                        <motion.div
                            initial={{ opacity: 0.5, scale: 0.5 }}
                            animate={{ opacity: 0, scale: 2 }}
                            className="absolute z-50 pointer-events-none flex flex-col items-center justify-center text-white/40"
                            style={{ left: ripple.side === 'left' ? '25%' : '75%', top: '50%', transform: 'translate(-50%, -50%)' }}
                        >
                            {ripple.side === 'left' ? <Rewind className="w-20 h-20 fill-current" /> : <FastForward className="w-20 h-20 fill-current" />}
                            <span className="text-xl font-black mt-2">{ripple.side === 'left' ? '-10s' : '+10s'}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

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

                                    {/* Desktop Settings Panel Overlay (md+) */}
                                    <AnimatePresence>
                                        {showSettings && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className="hidden md:block absolute top-20 right-0 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 pointer-events-auto"
                                            >
                                                <SettingsPanelContent
                                                    isLive={!!isLive}
                                                    playbackRate={playbackRate}
                                                    setPlaybackRate={setPlaybackRate}
                                                    gesturesEnabled={gesturesEnabled}
                                                    setGesturesEnabled={setGesturesEnabled}
                                                    runAudioDiagnostic={runAudioDiagnostic}
                                                />
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

            {/* Mobile Settings Bottom Sheet (md:hidden) */}
            <Drawer.Root open={showSettings} onOpenChange={(open) => !open && setShowSettings(false)} shouldScaleBackground={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm md:hidden" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[160] flex max-h-[75vh] flex-col rounded-t-[28px] bg-zinc-900 border-t border-white/10 outline-none md:hidden">
                        <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-white/10" />
                        <div className="p-5 pb-2 flex items-center justify-between">
                            <h2 className="text-base font-bold text-white">Player Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="p-2 rounded-full bg-white/5 text-zinc-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 pb-2">
                            <SettingsPanelContent
                                isLive={!!isLive}
                                playbackRate={playbackRate}
                                setPlaybackRate={setPlaybackRate}
                                gesturesEnabled={gesturesEnabled}
                                setGesturesEnabled={setGesturesEnabled}
                                runAudioDiagnostic={() => { runAudioDiagnostic(); setShowSettings(false); }}
                            />
                        </div>
                        {/* Safe area + BottomNav spacer */}
                        <div className="h-[calc(80px+env(safe-area-inset-bottom))] shrink-0" />
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </>
    );
}

// Helper to format time
function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// ─── Settings Panel (shared between Desktop dropdown & Mobile sheet) ──────────
interface SettingsPanelContentProps {
    isLive: boolean;
    playbackRate: number;
    setPlaybackRate: (r: number) => void;
    gesturesEnabled: boolean;
    setGesturesEnabled: (v: boolean) => void;
    runAudioDiagnostic: () => void;
}

function SettingsPanelContent({
    isLive, playbackRate, setPlaybackRate,
    gesturesEnabled, setGesturesEnabled, runAudioDiagnostic
}: SettingsPanelContentProps) {
    return (
        <div className="space-y-6 py-2">
            {/* Speed */}
            {!isLive && (
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Playback Speed</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <button
                                key={rate}
                                onClick={() => setPlaybackRate(rate)}
                                className={cn(
                                    "py-2.5 rounded-lg text-xs font-bold transition-all",
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

            {/* Quality */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Quality</label>
                <div className="space-y-1.5">
                    {['1080p (Auto)', '720p', '480p'].map((q) => (
                        <button
                            key={q}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
                        >
                            {q}
                            {q.includes('Auto') && <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Gestures Toggle (Mobile only makes sense, but shown in both) */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                    <p className="text-sm font-semibold text-white">Touch Gestures</p>
                    <p className="text-[11px] text-zinc-500">Swipe to control brightness, volume & seek</p>
                </div>
                <button
                    onClick={() => setGesturesEnabled(!gesturesEnabled)}
                    className={cn(
                        "relative w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5",
                        gesturesEnabled ? "bg-red-600" : "bg-white/15"
                    )}
                    aria-label="Toggle gestures"
                >
                    <div className={cn(
                        "w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                        gesturesEnabled ? "translate-x-5" : "translate-x-0"
                    )} />
                </button>
            </div>

            {/* Audio Diagnostic */}
            <div className="pt-2 border-t border-white/5">
                <button
                    onClick={runAudioDiagnostic}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-accent hover:text-white text-zinc-400 text-xs font-bold uppercase tracking-wide transition-all"
                >
                    <Volume2 className="w-4 h-4" />
                    Run Audio Diagnostic
                </button>
            </div>
        </div>
    );
}
