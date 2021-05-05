import { SpotifyAccessTokenRegnerator, SpotifySocket } from "./SpotifySocket";
import WebSocket from "isomorphic-ws";
import { automatedCreateSpotifyClient, connectState, getAccessToken, SpotifyDevice, subscribeToNotifications } from "../util/spotify-ws-api";
import { debug } from "../util/debug";

/**
 * Default coordinator for the initialization of a Spotify socket following a successful connection
 */
export class CoordinatedSpotifySocket extends SpotifySocket {
    /**
     * Creates a coordinated socket from the given cookies and SpotifyDevice
     * @param cookie cookies from open.spotify.com
     * @param device device metadata to use when initializing – omit to use default
     * @returns promise of a CoordinatedSpotifySocket and the accessToken used to create it
     */
    public static async create(cookie: string, device?: SpotifyDevice): Promise<{
        accessToken: string;
        socket: CoordinatedSpotifySocket;
    }> {
        const { accessToken, socket } = await automatedCreateSpotifyClient(cookie);

        return {
            accessToken,
            socket: new CoordinatedSpotifySocket(socket, accessToken, cookie, device)
        };
    }

    /**
     * Default device metadata. The device_id is randomized at runtime.
     * 
     * This object is sealed. If you need to mutate it, make your own.
     */
    public static readonly DEFAULT_DEVICE: SpotifyDevice = Object.seal({
        brand: "spotify",
        capabilities: {
            audio_podcasts: true,
            change_volume: true,
            disable_connect: false,
            enable_play_token: true,
            manifest_formats: [
                "file_urls_mp3",
                "manifest_ids_video",
                "file_urls_external",
                "file_ids_mp4",
                "file_ids_mp4_dual"
            ],
            play_token_lost_behavior: "pause",
            supports_file_media_type: true,
            video_playback: true
        },
        device_id: Array(40).fill(0).map(x => Math.random().toString(36).charAt(2)).join(''),
        device_type: "computer",
        metadata: {},
        model: "web_player",
        name: "Web Player (Microsoft Edge)",
        platform_identifier: "web_player osx 11.3.0;microsoft edge 89.0.774.54;desktop"
    });

    private constructor(socket: WebSocket, accessToken: string, cookie: string, public readonly device: SpotifyDevice = CoordinatedSpotifySocket.DEFAULT_DEVICE) {
        super(socket);

        this.#accessToken = accessToken;
        this.#cookie = cookie;

        socket.onclose = async () => {
            debug("disconnected from spotify.");

            if (this.#forceClosed) return;
            
            debug("scheduling reconnect");
            await new Promise(resolve => setTimeout(resolve, 5000));

            debug("reconnecting to spotify");
            const { accessToken, socket } = await automatedCreateSpotifyClient(cookie);

            this.#accessToken = accessToken;
            this.attach(socket);
        };

        this.observeConnectionID(async connectionID => {
            if (connectionID) {
                await subscribeToNotifications(connectionID, this.#accessToken);
                const cluster = await connectState(connectionID, this.#accessToken, device);

                debug("we are connected to spotify.");

                this.handlePayload({
                    headers: {
                        "content-type": "application/json"
                    },
                    payloads: [
                        {
                            ack_id: "none",
                            cluster,
                            devices_that_changed: [cluster.active_device_id],
                            update_reason: "INITIAL_STATE"
                        }
                    ],
                    type: "message",
                    uri: "hm://connect-state/v1/cluster"
                });
            }
        });
    }

    #accessToken: string;
    #cookie: string;
    #forceClosed: boolean = false;

    public close() {
        this.#forceClosed = true;
        this.socket.close();
    }

    public async generateAccessToken(): Promise<string> {
        const { accessToken } = await getAccessToken(this.#cookie);
        return this.#accessToken = accessToken;
    }

    public get accessTokenRegenerator(): SpotifyAccessTokenRegnerator {
        return () => this.generateAccessToken();
    }
}