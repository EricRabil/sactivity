import dotenv from "dotenv";
import { AudioAnalysisEvents, Cache, CoordinatedSpotifySocket, SpotifyAnalysisResult } from ".";

dotenv.config();

const cookies = process.env.SPOTIFY_COOKIES as string;

function mockCache<T>(): Cache<T> {
    const cache: Map<string, T> = new Map();

    return {
        async resolve(ids: string[]): Promise<Record<string, T>> {
            return ids.reduce((acc, id) => cache.has(id) ? Object.assign(acc, {
                [id]: cache.get(id) as T
            }) : acc, {});
        },
        async store(tracks: Record<string, T>) {
            for (const id in tracks) {
                cache.set(id, tracks[id]);
            }
        }
    }
}

CoordinatedSpotifySocket.create(cookies).then(({ socket, accessToken }) => {
    const analysisCache: Cache<SpotifyAnalysisResult> = mockCache();

    const resolver = new AudioAnalysisEvents({
        cache: analysisCache,
        cookie: cookies
    });

    resolver.on("tatum", () => console.log("tatum"));

    resolver.observe(socket);
});
