import axios from "axios";
import WebSocket from "isomorphic-ws";
import { SpotifyCluster } from "../types/SpotifyCluster";
import { CORE_HEADERS } from "./const";

export interface AccessToken {
    accessToken: string;
    accessTokenExpirationTimestampMs: number;
    clientId: string;
    isAnonymous: boolean;
}

/**
 * Gets an access token for connecting to the WebSocket server
 * @param cookie cookies from open.spotify.com
 * @returns the access token generation payload
 */
export async function getAccessToken(cookie: string): Promise<AccessToken> {
    const { data } = await axios.get<AccessToken>("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
        headers: {
            cookie,
            ...CORE_HEADERS
        }
    });

    return data;
}

export interface DiscoveryResult {
    /**
     * Array of dealers in the format {HOSTNAME}:{PORT}
     */
    dealer: string[];
    /**
     * Array of spclient URLs in the format {HOSTNAME}:{PORT}
     */
    spclient: string[];
}

const DEALER_DISCOVERY_HEADERS = {
    ...CORE_HEADERS,
    origin: "https://open.spotify.com"
}

/**
 * Resolves the dealers currently provided by Spotify
 * @returns dealer discovery payload
 */
export async function discoverDealers(): Promise<DiscoveryResult> {
    const { data } = await axios.get<DiscoveryResult>("https://apresolve.spotify.com/?type=dealer&type=spclient", {
        headers: DEALER_DISCOVERY_HEADERS
    });

    return data;
}

/**
 * Creates a WebSocket connection from the given array of dealers and access token
 * @param dealers dealers Spotify is offering
 * @param accessToken WebSocket token
 * @returns raw WebSocket connection
 */
export function createSpotifySocket(dealers: string[], accessToken: string) {
    const [ dealer ] = dealers;
    const [ dealerHost, port ] = dealer.split(":");

    const protocol = port === "443" ? "wss" : "ws";

    return new WebSocket(`${protocol}://${dealerHost}/?access_token=${accessToken}`)
}

/**
 * Automates the process of resolving dealers/accessToken from the cookies, returning a WebSocket connection
 * @param cookie cookies from open.spotify.com
 * @returns a promise of a raw WebSocket connection, and the access token used to create it
 */
export async function automatedCreateSpotifyClient(cookie: string): Promise<{
    accessToken: string;
    socket: WebSocket;
}> {
    const { dealer } = await discoverDealers();
    const { accessToken } = await getAccessToken(cookie);

    return {
        accessToken,
        socket: createSpotifySocket(dealer, accessToken)
    };
}

/**
 * Metadata required when registering a device with Spotify
 */
export interface SpotifyDevice {
    /**
     * The brand of the device (e.g. Spotify, Sonos, etc.)
     */
    brand: string;
    capabilities: {
        audio_podcasts: boolean;
        change_volume: boolean;
        disable_connect: boolean;
        enable_play_token: boolean;
        manifest_formats: string[];
        play_token_lost_behavior: string;
        supports_file_media_type: boolean;
        video_playback: boolean;
    };
    device_id: string;
    device_type: string;
    metadata: Record<string, string>;
    model: string;
    name: string;
    platform_identifier: string;
}

/**
 * Subscribes a connection to notifications for a user
 * @param connectionID ID of the connection to subscribe
 * @param accessToken token representing the user to subscribe to
 */
export async function subscribeToNotifications(connectionID: string, accessToken: string): Promise<void> {
    await axios.put(`https://api.spotify.com/v1/me/notifications/user?connection_id=${escape(connectionID)}`, undefined, {
        headers: {
            ...CORE_HEADERS,
            authorization: `Bearer ${accessToken}`
        }
    });
}


export async function trackPlayback(connectionID: string, accessToken: string, device: SpotifyDevice): Promise<void> {
    await axios.post("https://guc-spclient.spotify.com/track-playback/v1/devices", {
        client_version: "harmony:4.12.0-38fc756",
        connection_id: connectionID,
        device,
        volume: 65535
    }, {
        headers: {
            ...CORE_HEADERS,
            origin: "https://open.spotify.com",
            authorization: `Bearer ${accessToken}`
        }
    });
}

/**
 * Connects the cluster state to a connection
 * @param connectionID ID of the connection to connect
 * @param accessToken token representing the user to connect to
 * @param device device associated to the connection
 */
export async function connectState(connectionID: string, accessToken: string, device: SpotifyDevice): Promise<SpotifyCluster> {
    const { data } = await axios.put<SpotifyCluster>(`https://guc-spclient.spotify.com/connect-state/v1/devices/hobs_${device.device_id}`, {
        device: {
            device_info: {
                capabilities: {
                    can_be_player: false,
                    hidden: true,
                    needs_full_player_state: true
                }
            }
        },
        member_type: "CONNECT_STATE"
    }, {
        headers: {
            ...CORE_HEADERS,
            authorization: `Bearer ${accessToken}`,
            "x-spotify-connection-id": connectionID
        }
    });

    return data;
}