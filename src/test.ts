import dotenv from "dotenv";
import { CoordinatedSpotifySocket, PlayerTrackResolver, SpotifyTrack } from ".";

dotenv.config();

const cookies = process.env.SPOTIFY_COOKIES as string;

CoordinatedSpotifySocket.create(cookies).then(({ socket, accessToken }) => {
    const cache: Map<string, SpotifyTrack> = new Map();

    const observer = new PlayerTrackResolver(states => {
        states.forEach(({ state, track }) => {
            console.log(track);
        });
    }, {
        accessToken,
        cache: {
            async resolve(ids: string[]): Promise<Record<string, SpotifyTrack>> {
                return ids.reduce((acc, id) => cache.has(id) ? Object.assign(acc, {
                    [id]: cache.get(id) as SpotifyTrack
                }) : acc, {});
            },
            async store(tracks: Record<string, SpotifyTrack>) {
                for (const id in tracks) {
                    cache.set(id, tracks[id]);
                }
            }
        }
    });

    observer.observe(socket);
});