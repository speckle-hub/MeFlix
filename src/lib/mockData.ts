export interface Movie {
    id: string;
    title: string;
    description: string;
    poster: string;
    backdrop: string;
    rating: string;
    year: string;
    quality: string;
    type: 'movie' | 'series' | 'anime' | 'manga';
    isNSFW: boolean;
}

export const MOCK_MOVIES: Movie[] = [
    {
        id: "tt1375666",
        title: "Inception",
        description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        poster: "https://images.metahub.space/poster/medium/tt1375666/img",
        backdrop: "https://images.metahub.space/background/medium/tt1375666/img",
        rating: "8.8",
        year: "2010",
        quality: "4K",
        type: "movie",
        isNSFW: false
    },
    {
        id: "tt0816692",
        title: "Interstellar",
        description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        poster: "https://images.metahub.space/poster/medium/tt0816692/img",
        backdrop: "https://images.metahub.space/background/medium/tt0816692/img",
        rating: "8.7",
        year: "2014",
        quality: "4K",
        type: "movie",
        isNSFW: false
    },
    {
        id: "tt0468569",
        title: "The Dark Knight",
        description: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
        poster: "https://images.metahub.space/poster/medium/tt0468569/img",
        backdrop: "https://images.metahub.space/background/medium/tt0468569/img",
        rating: "9.0",
        year: "2008",
        quality: "4K",
        type: "movie",
        isNSFW: false
    },
    {
        id: "tt1160419",
        title: "Dune",
        description: "A noble family becomes embroiled in a war for control over the galaxy's most valuable asset while its heir becomes troubled by visions of a dark future.",
        poster: "https://images.metahub.space/poster/medium/tt1160419/img",
        backdrop: "https://images.metahub.space/background/medium/tt1160419/img",
        rating: "8.0",
        year: "2021",
        quality: "4K",
        type: "movie",
        isNSFW: true
    }
];

export const MOCK_SERIES: Movie[] = [
    {
        id: "tt0773262",
        title: "Dexter",
        description: "By day, mild-mannered Dexter is a blood-spatter analyst for the Miami police. But at night, he is a serial killer who only targets other murderers.",
        poster: "https://images.metahub.space/poster/medium/tt0773262/img",
        backdrop: "https://images.metahub.space/background/medium/tt0773262/img",
        rating: "8.7",
        year: "2006",
        quality: "HD",
        type: "series",
        isNSFW: false
    },
    {
        id: "tt0903747",
        title: "Breaking Bad",
        description: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
        poster: "https://images.metahub.space/poster/medium/tt0903747/img",
        backdrop: "https://images.metahub.space/background/medium/tt0903747/img",
        rating: "9.5",
        year: "2008",
        quality: "HD",
        type: "series",
        isNSFW: false
    },
    {
        id: "tt0944947",
        title: "Game of Thrones",
        description: "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.",
        poster: "https://images.metahub.space/poster/medium/tt0944947/img",
        backdrop: "https://images.metahub.space/background/medium/tt0944947/img",
        rating: "9.2",
        year: "2011",
        quality: "HD",
        type: "series",
        isNSFW: false
    }
];

export const MOCK_ANIME: Movie[] = [
    {
        id: "tt2560140",
        title: "Attack on Titan",
        description: "After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.",
        poster: "https://images.metahub.space/poster/medium/tt2560140/img",
        backdrop: "https://images.metahub.space/background/medium/tt2560140/img",
        rating: "9.0",
        year: "2013",
        quality: "HD",
        type: "anime",
        isNSFW: false
    }
];

export const MOCK_NSFW: Movie[] = [
    {
        id: "nsfw1",
        title: "Premium Feature 🔞",
        description: "A cinematic experience exploring mature themes and artistic expression.",
        poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=500&q=80",
        backdrop: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=1200",
        rating: "Adult",
        year: "2024",
        quality: "4K",
        type: "movie",
        isNSFW: true
    }
];

export const FEATURED_MOVIES: Movie[] = [
    {
        ...MOCK_MOVIES[0],
        backdrop: "https://images.metahub.space/background/medium/tt1375666/img",
        poster: "https://images.metahub.space/poster/medium/tt1375666/img"
    },
    {
        ...MOCK_MOVIES[1],
        backdrop: "https://images.metahub.space/background/medium/tt0816692/img",
        poster: "https://images.metahub.space/poster/medium/tt0816692/img"
    },
    {
        ...MOCK_MOVIES[2],
        backdrop: "https://images.metahub.space/background/medium/tt0468569/img",
        poster: "https://images.metahub.space/poster/medium/tt0468569/img"
    }
];
export const TRENDING_CONTENT: Movie[] = [
    ...MOCK_MOVIES,
    ...MOCK_SERIES,
    ...MOCK_ANIME,
    ...MOCK_NSFW
];
