"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const source_1 = __importDefault(require("got/dist/source"));
const const_1 = require("./const");
const util_1 = require("./util");
function isSpotifyPayload(payload) {
    return 'type' in payload;
}
class SpotifyClient extends events_1.EventEmitter {
    constructor(socket, token, provider) {
        super();
        this.socket = socket;
        this.token = token;
        this.provider = provider;
        // these variables are used to diff the state on each state change packet, as each packet includes /everything/
        this._playerState = null;
        this._lastTrackURI = null;
        this._lastTrack = null;
        this._isPlaying = false;
        this._isPaused = false;
        this._lastOptions = null;
        this._lastPosition = null;
        this._lastVolume = NaN;
        this._devices = {};
        this._activeDeviceID = null;
        this._trackCache = {};
        this._deviceID = util_1.makeid(40);
        socket.onmessage = this.processRawMessage.bind(this);
        socket.onclose = this.emit.bind(this, "close");
    }
    /**
     * Ping Spotify in 30 seconds
     */
    deferredPing() {
        return setTimeout(() => this.ping(), 1000 * 30);
    }
    ping() {
        this.send({ type: "ping" });
    }
    /**
     * Send a payload to spotify
     * @param payload payload to send
     */
    send(payload) {
        if (process.env.SPOTIFY_DEBUG) {
            console.debug({
                module: "sactivity",
                action: "spotify_outbound",
                payload
            });
        }
        this.socket.send(JSON.stringify(payload));
    }
    /**
     * Returns the name of a device with the given ID
     * @param id device ID
     */
    deviceName(id) {
        var _a;
        return (_a = this.devices[id]) === null || _a === void 0 ? void 0 : _a.name;
    }
    async resolve(...ids) {
        const pull = await this.fetchMetadata(...ids.filter(id => !this._trackCache[id]));
        if (Object.keys(pull).length > 0) {
            Object.entries(pull).forEach(([key, value]) => this._trackCache[key] = value);
        }
        return ids.map(id => this._trackCache[id]).reduce((acc, track) => ({ ...acc, [track.id]: track }), {});
    }
    async resolveURI(...uri) {
        return Object.entries(await this.resolve(...uri.map(uri => uri.split(':track:')[1]))).map(([key, value]) => [`spotify:track:${key}`, value]).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    }
    /**
     * Spotify Devices
     */
    get devices() {
        return this._devices;
    }
    /**
     * The current track
     */
    get track() {
        return this._lastTrack;
    }
    get shallowTrack() {
        return this.playerState.track;
    }
    set devices(devices) {
        this._devices = devices;
        // emit volume change if it did change on the active device
        if (this.activeDevice && this.activeDevice.volume !== this._lastVolume) {
            this.emit("volume", this._lastVolume = this.activeDevice.volume);
        }
    }
    /**
     * The latest PlayerState
     */
    get playerState() {
        return this._playerState;
    }
    set playerState(playerState) {
        this._playerState = playerState;
    }
    async _diffPlayerState() {
        const playerState = this._playerState;
        const events = [];
        // if track UID did change, emit the change
        if (playerState.track) {
            if (playerState.track.uri !== this._lastTrackURI) {
                this._lastTrackURI = playerState.track.uri;
                await this.resolveURI(playerState.track.uri).then(({ [playerState.track.uri]: track }) => {
                    this._lastTrack = track;
                    events.push(["track", track]);
                });
            }
        }
        // if playing state did change, emit the change
        if (playerState.is_playing !== this._isPlaying) {
            this._isPlaying = playerState.is_playing;
            events.push([this._isPlaying ? "playing" : "stopped"]);
        }
        // if pause state did change, emit the change
        if (playerState.is_paused !== this._isPaused) {
            this._isPaused = playerState.is_paused;
            events.push([this._isPaused ? "paused" : "resumed"]);
        }
        // if playback options did change (shuffle, repeat, repeat song), emit the options as a whole
        if (playerState.options) {
            const stringToken = JSON.stringify(playerState.options);
            if (stringToken !== this._lastOptions) {
                this._lastOptions = stringToken;
                events.push(["options", playerState.options]);
            }
        }
        // if position in song did change, emit the change
        if (playerState.position_as_of_timestamp !== this._lastPosition) {
            events.push(["position", this._lastPosition = playerState.position_as_of_timestamp]);
        }
        events.forEach(([name, ...data]) => this.emit(name, ...data));
    }
    /**
     * The currently playing Spotify Device
     */
    get activeDevice() {
        if (!this.activeDeviceID)
            return null;
        return this.devices[this.activeDeviceID];
    }
    /**
     * The ID of the currently playing Spotify Device
     */
    get activeDeviceID() {
        return this._activeDeviceID;
    }
    set activeDeviceID(deviceID) {
        const lastDevice = this._activeDeviceID;
        this._activeDeviceID = deviceID;
        // if the active device ID did change, emit the change
        if (lastDevice !== deviceID) {
            this.emit("device", this.activeDevice);
        }
    }
    /**
     * Returns a deep metadata structure for a track ID
     * @param ids ids to query
     */
    async fetchMetadata(...ids) {
        if (ids.length === 0)
            return Promise.resolve({});
        const run = async () => {
            const { body } = await source_1.default.get(const_1.SPOTIFY_TRACK_DATA(ids), {
                headers: {
                    authorization: `Bearer ${this.token}`,
                    ...const_1.SPOTIFY_HEADERS
                },
                responseType: 'json'
            });
            return body;
        };
        const body = await run().catch(e => this.provider.generateAccessToken().then(token => this.token = token).then(() => run()));
        if ((typeof body !== "object") || !body)
            return {};
        if (!("tracks" in body))
            return {};
        const { tracks } = body;
        return tracks.reduce((a, c) => ({ ...a, [c.id]: c }), {});
    }
    /**
     * Update internal values according to a state change payload
     * @param param0 payload
     */
    handleStateChange({ cluster: { active_device_id, player_state, devices }, devices_that_changed }) {
        this.devices = devices;
        this.activeDeviceID = active_device_id;
        this.playerState = player_state;
    }
    /**
     * Process a payload from the dealer
     * @param payload payload to process
     */
    processMessage(payload) {
        if (payload.type !== "message")
            return;
        if (process.env.SPOTIFY_DEBUG) {
            console.debug({
                module: "sactivity",
                action: "inbound",
                payload: console.dir(payload, { depth: 6 })
            });
        }
        switch (payload.uri) {
            case "hm://connect-state/v1/cluster": {
                // possible state change
                if (!(payload.payloads && Array.isArray(payload.payloads))) {
                    // nvm?
                    return;
                }
                payload.payloads.forEach(payload => {
                    if ('update_reason' in payload && payload['update_reason'] === 'DEVICE_STATE_CHANGED') {
                        this.handleStateChange(payload);
                    }
                });
            }
            default: {
                if (payload.uri) {
                    if (payload.uri.startsWith('hm://pusher/v1/connections/') && payload.headers) {
                        const { ['Spotify-Connection-Id']: connectionID } = payload.headers;
                        this.subscribe(encodeURIComponent(connectionID)).then(() => this.trackDevice(connectionID)).then(() => this.ping()).then(() => this.connectState(connectionID));
                        return;
                    }
                }
            }
        }
    }
    /**
     * Process a raw message from the dealer
     * @param message message to process
     */
    processRawMessage(message) {
        var payload;
        try {
            payload = JSON.parse(message);
        }
        catch (e) {
            this.emit('error', e);
            return;
        }
        if (!isSpotifyPayload(payload)) {
            return;
        }
        switch (payload.type) {
            case "message": {
                this.processMessage(payload);
                break;
            }
            case "pong": {
                this.deferredPing();
                break;
            }
        }
    }
    subscribe(connectionID) {
        return source_1.default.put(const_1.SPOTIFY_SUBSCRIBE(connectionID), {
            headers: {
                authorization: `Bearer ${this.token}`,
                origin: 'https://open.spotify.com',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36',
                'sec-fetch-site': 'same-site',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty'
            },
            responseType: 'json'
        });
    }
    trackDevice(connectionID) {
        return source_1.default.post(const_1.SPOTIFY_TRACK, {
            headers: {
                authorization: `Bearer ${this.token}`,
                ...const_1.SPOTIFY_HEADERS
            },
            body: JSON.stringify({ "device": { "brand": "spotify", "capabilities": { "change_volume": true, "audio_podcasts": true, "enable_play_token": true, "play_token_lost_behavior": "pause", "disable_connect": false, "video_playback": true, "manifest_formats": ["file_urls_mp3", "file_urls_external", "file_ids_mp4", "file_ids_mp4_dual", "manifest_ids_video"] }, "device_id": this._deviceID = util_1.makeid(40), "device_type": "computer", "metadata": {}, "model": "web_player", "name": "Web Player (Chrome)", "platform_identifier": "web_player osx 10.15.4;chrome 80.0.3987.163;desktop" }, "connection_id": connectionID, "client_version": "harmony:4.0.0-4f6c892", "volume": 65535 })
        });
    }
    connectState(connectionID) {
        return source_1.default.put(const_1.SPOTIFY_CONNECT_STATE(this._deviceID), {
            headers: {
                authorization: `Bearer ${this.token}`,
                ...const_1.SPOTIFY_HEADERS,
                ['x-spotify-connection-id']: connectionID
            },
            body: JSON.stringify({
                member_type: "CONNECT_STATE",
                device: {
                    device_info: {
                        capabilities: {
                            can_be_player: false,
                            hidden: true
                        }
                    }
                }
            })
        });
    }
}
exports.SpotifyClient = SpotifyClient;
exports.default = SpotifyClient;
