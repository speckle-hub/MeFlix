"use client";

import { Suspense, useMemo } from "react";
import Hero from "@/components/ui/Hero";
import ContentGrid from "@/components/ui/ContentGrid";
import FilterBar from "@/components/ui/FilterBar";
import PullToRefresh from "@/components/ui/PullToRefresh";
import LiveNowRow from "@/components/ui/LiveNowRow";
import { useCatalog } from "@/hooks/useCatalog";
import { useProgressStore } from "@/store/progressStore";
import { useMangaStore } from "@/store/mangaStore";
import { ContentGridSkeleton } from "@/components/ui/Skeleton";
import { AlertCircle, PlayCircle, BookOpen, RefreshCw } from "lucide-react";
import { clearCatalogCache } from "@/lib/stremioService";

export default function Home() {
  const handleRefresh = async () => {
    clearCatalogCache();
    await new Promise(resolve => setTimeout(resolve, 800));
    window.location.reload();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Suspense fallback={<ContentGridSkeleton />}>
        <HomeContent />
      </Suspense>
    </PullToRefresh>
  );
}

function HomeContent() {
  const {
    data: trendingMovies,
    loading: moviesLoading,
    error: moviesError
  } = useCatalog("movie", "top");

  const {
    data: trendingSeries,
    loading: seriesLoading,
    error: seriesError
  } = useCatalog("series", "top");

  const {
    data: trendingAnime,
    loading: animeLoading
  } = useCatalog("anime", "top");

  const {
    data: recentlyAdded,
    loading: recentLoading
  } = useCatalog("movie", "top"); // Cinemeta only supports 'top' reliably

  const {
    data: trendingNow,
    loading: trendingLoading
  } = useCatalog("series", "top"); // Cinemeta only supports 'top' reliably

  const { progress } = useProgressStore();
  const { readingProgress } = useMangaStore();

  const continueWatching = useMemo(() => {
    const mediaItems = Object.values(progress)
      .filter(p => !p.isNSFW)
      .map(p => ({
        id: p.id,
        title: p.title,
        poster: p.poster,
        type: p.type as any,
        isNSFW: p.isNSFW,
        updatedAt: p.updatedAt,
        description: "", backdrop: "", rating: "N/A", year: "", quality: "HD",
        addonBaseUrl: p.addonBaseUrl,
        addonId: p.addonId
      }));

    const mangaItems = Object.values(readingProgress)
      .map(p => ({
        id: p.mangaId,
        title: p.title,
        poster: p.poster,
        type: 'manga' as any,
        isNSFW: false, // Manga NSFW is handled by tabs in /manga, but here we can filter if needed
        sourceId: p.sourceId,
        updatedAt: p.lastRead,
        description: "", backdrop: "", rating: "Manga", year: "Ch. " + p.chapterTitle, quality: "PNG"
      }));

    return [...mediaItems, ...mangaItems]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10);
  }, [progress, readingProgress]);

  return (
    <div className="space-y-12 animate-fade-in">
      <Hero movies={trendingMovies} loading={moviesLoading} />

      <div className="space-y-12">
        <FilterBar />

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white">
              <PlayCircle className="h-5 w-5 text-accent" />
              <h2 className="text-2xl font-black tracking-tight">Continue Watching</h2>
            </div>
            <ContentGrid title="Continue Watching" movies={continueWatching.slice(0, 6)} />
          </div>
        )}

        {/* Error Feedback */}
        {(moviesError || seriesError) && (
          <div className="flex items-center gap-3 rounded-2xl bg-accent/10 p-4 text-accent border border-accent/20">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">
              Note: Some addons could not be reached. Showing available or featured content.
            </p>
          </div>
        )}

        {/* Live Now Row */}
        <LiveNowRow />

        {/* Trending Now */}
        <ContentGrid
          title="Trending Now"
          movies={trendingNow.slice(0, 6)}
          loading={trendingLoading}
        />

        {/* Recently Added */}
        <ContentGrid
          title="Recently Added"
          movies={recentlyAdded.slice(0, 6)}
          loading={recentLoading}
        />

        {/* Movies Section */}
        {moviesLoading ? (
          <ContentGridSkeleton />
        ) : (
          <ContentGrid
            title="Trending Movies"
            movies={trendingMovies}
          />
        )}

        {/* Series Section */}
        {seriesLoading ? (
          <ContentGridSkeleton />
        ) : (
          <ContentGrid
            title="Popular TV Shows"
            movies={trendingSeries}
          />
        )}

        {/* Anime Section */}
        {animeLoading ? (
          <ContentGridSkeleton />
        ) : (
          <ContentGrid
            title="Top Anime"
            movies={trendingAnime}
          />
        )}
      </div>
    </div>
  );
}
