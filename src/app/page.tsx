"use client";

import { Suspense } from "react";
import Hero from "@/components/ui/Hero";
import ContentGrid from "@/components/ui/ContentGrid";
import { useCatalog } from "@/hooks/useCatalog";
import FilterBar from "@/components/ui/FilterBar";
import PullToRefresh from "@/components/ui/PullToRefresh";
import LiveNowRow from "@/components/ui/LiveNowRow";
import { ContentGridSkeleton } from "@/components/ui/Skeleton";
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
    data: animeList,
    loading: animeLoading,
    error: animeError
  } = useCatalog("anime", "top");

  // Combine error/loading for simple UI
  const isLoading = (moviesLoading && !trendingMovies.length) ||
    (seriesLoading && !trendingSeries.length) ||
    (animeLoading && !animeList.length);

  const hasError = moviesError && seriesError && animeError;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero section with dynamic movie data */}
      <Hero movies={trendingMovies} loading={moviesLoading} />

      <div className="flex flex-col gap-12 pb-20 -mt-20 relative z-10 px-4 md:px-8">
        {/* Filter / Category Bar */}
        <FilterBar />

        {/* Live Now TV Section */}
        <LiveNowRow />

        {/* Dynamic Content Rows */}
        <ContentGrid
          title="Trending Movies"
          movies={trendingMovies}
          loading={moviesLoading}
        />

        <ContentGrid
          title="Popular Series"
          movies={trendingSeries}
          loading={seriesLoading}
        />

        <ContentGrid
          title="Latest Anime"
          movies={animeList}
          loading={animeLoading}
        />

        {/* Status indicator for empty states (only show if truly empty and not loading) */}
        {!isLoading && !trendingMovies.length && !trendingSeries.length && !animeList.length && (
          <div className="py-20 text-center">
            <h3 className="text-xl font-bold text-white mb-2">No Content Available</h3>
            <p className="text-text-muted">Please check your internet connection or installed addons.</p>
          </div>
        )}
      </div>
    </div>
  );
}
