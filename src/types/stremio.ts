export interface StremioManifest {
    id: string;
    version: string;
    name: string;
    description?: string;
    resources: (string | { name: string; types: string[]; idPrefixes?: string[] })[];
    types: string[];
    catalogs: StremioCatalogManifest[];
    idPrefixes?: string[];
    background?: string;
    logo?: string;
    contactEmail?: string;
}

export interface StremioCatalogManifest {
    type: string;
    id: string;
    name?: string;
    extra?: { name: string; isRequired?: boolean; options?: string[] }[];
}

export interface StremioVideo {
    id: string;
    title: string;
    released: string;
    season: number;
    episode: number;
    thumbnail?: string;
    overview?: string;
}

export interface StremioMeta {
    id: string;
    type: string;
    name: string;
    poster?: string;
    background?: string;
    logo?: string;
    description?: string;
    releaseInfo?: string;
    runtime?: string;
    genres?: string[];
    imdbRating?: string;
    cast?: string[];
    director?: string[];
    year?: number;
    website?: string;
    videos?: StremioVideo[];
    isNSFW?: boolean;
}

export interface StremioStream {
    name?: string;
    title?: string;
    infoHash?: string;
    fileIdx?: number;
    url?: string;
    ytId?: string;
    externalUrl?: string;
    behaviorHints?: {
        notWebReady?: boolean;
        bingeGroup?: string;
        videoSize?: number;
    };
    addonBaseUrl?: string; // Track source for resumption
    addonId?: string;
}

export interface StremioCatalogResponse {
    metas: StremioMeta[];
}

export interface StremioMetaResponse {
    meta: StremioMeta;
}

export interface StremioStreamResponse {
    streams: StremioStream[];
}
