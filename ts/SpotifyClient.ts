import { EventEmitter } from "events";
import { WebSocket } from "@clusterws/cws";
import got from "got/dist/source";
import { SPOTIFY_SUBSCRIBE, SPOTIFY_TRACK, SPOTIFY_HEADERS, SPOTIFY_CONNECT_STATE, SPOTIFY_TRACK_DATA } from "./const";
import { makeid } from "./util";
import { SpotifyTrack } from "./types";
import { SpotifyProvider } from ".";

type SpotifyPayloadType = "ping" | "pong" | "message";

interface SpotifyPayload {
  type: SpotifyPayloadType;
  uri?: string;
  headers?: Record<string, string>;
  payloads?: any[];
}

interface SpotifyDevice {
  can_play: boolean;
  volume: number;
  name: string;
  capabilities: {
    can_be_player: boolean;
    gaia_eq_connect_id: boolean;
    supports_logout: boolean;
    is_observable: boolean;
    volume_steps: number;
    supported_types: string[];
    command_acks: boolean;
    supports_playlist_v2: boolean;
    is_controllable: boolean;
    supports_external_episodes: boolean;
    supports_command_request: boolean;
  };
  metadata: Array<{
    type: string;
    metadata: string;
  }>;
  device_software_version: string;
  device_type: string;
  spirc_version: string;
  device_id: string;
  client_id: string;
  brand: string;
  model: string;
}

interface SpotifyShallowTrack {
  uri: string;
  uid: string;
  provider: string;
  metadata: {
    context_uri: string;
    player: string;
    album_title: string;
    album_uri: string;
    image_small_url: string;
    image_url: string;
    entity_url: string;
    ['collection.artist_is_banned']: boolean;
    image_xlarge_url: string;
    artist_uri: string;
    iteration: string;
    ['collection.is_banned']: boolean;
    image_large_url: string;
  }
}

interface PlayerState {
  timestamp: string;
  context_uri: string;
  context_url: string;
  context_restrictions: any;
  play_origin: {
    feature_identifier: string;
    feature_version: string;
    view_uri: string;
    referrer_identifier: string;
  };
  index: {
    page: number;
    track: number;
  };
  track: SpotifyShallowTrack;
  playback_id: string;
  playback_speed: number;
  position_as_of_timestamp: string;
  duration: string;
  is_playing: boolean;
  is_paused: boolean;
  is_system_initiated: boolean;
  options: PlaybackOptions;
  restrictions: Record<string, string[]>;
  suppressions: Record<string, string[]>;
  prev_tracks: SpotifyShallowTrack[];
  next_tracks: SpotifyShallowTrack[];
  context_metdata: {
    ['zelda.context_uri']: string;
    context_owner: string;
    context_description: string;
    image_url: string;
  };
  page_metadata: any;
  session_id: string;
  queue_revision: string;
}

interface PlaybackOptions {
  shuffling_context: boolean;
  repeating_context: boolean;
  repeating_track: boolean;
}

interface StateChangePayload {
  cluster: {
    timestamp: string;
    active_device_id: string;
    player_state: PlayerState;
    devices: Record<string, SpotifyDevice>;
    transfer_data_timestamp: string;
  }
  update_reason: string;
  devices_that_changed: string[];
}

function isSpotifyPayload(payload: any): payload is SpotifyPayload {
  return 'type' in payload;
}

export declare interface SpotifyClient {
  on(event: 'volume', listener: (vol: number) => any): this;
  on(event: 'playing', listener: () => any): this;
  on(event: 'stopped', listener: () => any): this;
  on(event: 'paused', listener: () => any): this;
  on(event: 'resumed', listener: () => any): this;
  on(event: 'track', listener: (track: SpotifyTrack) => any): this;
  on(event: 'options', listener: (opts: PlaybackOptions) => any): this;
  on(event: 'position', listener: (pos: string) => any): this;
  on(event: 'device', listener: (device: SpotifyDevice) => any): this;
  on(event: 'close', listener: () => any): this;
  on(event: string, listener: Function): this;
}

export class SpotifyClient extends EventEmitter {
  // these variables are used to diff the state on each state change packet, as each packet includes /everything/
  private _playerState: PlayerState = null!;
  private _lastTrackURI: string | null = null;
  private _lastTrack: SpotifyTrack | null = null;
  private _isPlaying: boolean = false;
  private _isPaused: boolean = false;
  private _lastOptions: string | null = null;
  private _lastPosition: string | null = null;
  private _lastVolume: number = NaN;
  private _devices: Record<string, SpotifyDevice> = {};
  private _activeDeviceID: string | null = null;
  private _trackCache: Record<string, SpotifyTrack> = {};

  constructor(public readonly socket: WebSocket, private token: string, private provider: SpotifyProvider) {
    super();
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
    this.send({ type: "ping" })
  }

  /**
   * Send a payload to spotify
   * @param payload payload to send
   */
  send(payload: SpotifyPayload) {
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
  deviceName(id: string): string {
    return this.devices[id]?.name;
  }

  async resolve(...ids: string[]) {
    const pull = await this.fetchMetadata(...ids.filter(id => !this._trackCache[id]));
    if (Object.keys(pull).length > 0) {
      Object.entries(pull).forEach(([key, value]) => this._trackCache[key] = value);
    }

    return ids.map(id => this._trackCache[id]).reduce((acc, track) => ({ ...acc, [track.id]: track }), {} as Record<string, SpotifyTrack>);
  }

  async resolveURI(...uri: string[]) {
    return Object.entries(await this.resolve(...uri.map(uri => uri.split(':track:')[1]))).map(([key, value]) => (
        [`spotify:track:${key}`, value] as [string, SpotifyTrack]
    )).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as ReturnType<this['resolve']>);
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
    return this._lastTrack!;
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

    // if playing state did change, emit the change
    if (playerState.is_playing !== this._isPlaying) {
      this._isPlaying = playerState.is_playing;
      this.emit(this._isPlaying ? "playing" : "stopped");
    }

    // if pause state did change, emit the change
    if (playerState.is_paused !== this._isPaused) {
      this._isPaused = playerState.is_paused;
      this.emit(this._isPaused ? "paused" : "resumed");
    }

    // if track UID did change, emit the change
    if (playerState.track) {
      if (playerState.track.uri !== this._lastTrackURI) {
        this._lastTrackURI = playerState.track.uri;
        this.resolveURI(playerState.track.uri).then(({[playerState.track.uri]: track}) => {
          this._lastTrack = track;
          this.emit("track", track);
        });
      }
    }

    // if playback options did change (shuffle, repeat, repeat song), emit the options as a whole
    if (playerState.options) {
      const stringToken = JSON.stringify(playerState.options);
      if (stringToken !== this._lastOptions) {
        this._lastOptions = stringToken;
        this.emit("options", playerState.options);
      }
    }

    // if position in song did change, emit the change
    if (playerState.position_as_of_timestamp !== this._lastPosition) {
      this.emit("position", this._lastPosition = playerState.position_as_of_timestamp);
    }
  }

  /**
   * The currently playing Spotify Device
   */
  get activeDevice() {
    if (!this.activeDeviceID) return null;
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
  private async fetchMetadata(...ids: string[]): Promise<Record<string, SpotifyTrack>> {
    interface TracksQueryResult {
      tracks: SpotifyTrack[];
    }

    if (ids.length === 0) return Promise.resolve({});
    const run = async () => {
      const { body } = await got.get(SPOTIFY_TRACK_DATA(ids), {
        headers: {
          authorization: `Bearer ${this.token}`,
          ...SPOTIFY_HEADERS
        },
        responseType: 'json'
      });
      return body;
    }

    const body = await run().catch(e => this.provider.generateAccessToken().then(token => this.token = token).then(() => run()));

    if ((typeof body !== "object") || !body) return {};
    if (!("tracks" in body)) return {};

    const { tracks } = body as TracksQueryResult;
    return tracks.reduce((a, c) => ({ ...a, [c.id]: c }), {} as Record<string, SpotifyTrack>);
  }

  /**
   * Update internal values according to a state change payload
   * @param param0 payload
   */
  private handleStateChange({ cluster: { active_device_id, player_state, devices }, devices_that_changed }: StateChangePayload) {
    this.devices = devices;
    this.activeDeviceID = active_device_id;
    this.playerState = player_state;
  }

  /**
   * Process a payload from the dealer
   * @param payload payload to process
   */
  private processMessage(payload: SpotifyPayload) {
    if (payload.type !== "message") return;

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
  private processRawMessage(message: any) {
    var payload;
    try {
      payload = JSON.parse(message);
    } catch (e) {
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

  private subscribe(connectionID: string) {
    return got.put(SPOTIFY_SUBSCRIBE(connectionID), {
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

  private _deviceID: string = makeid(40);

  private trackDevice(connectionID: string) {
    return got.post(SPOTIFY_TRACK, {
      headers: {
        authorization: `Bearer ${this.token}`,
        ...SPOTIFY_HEADERS
      },
      body: JSON.stringify({ "device": { "brand": "spotify", "capabilities": { "change_volume": true, "audio_podcasts": true, "enable_play_token": true, "play_token_lost_behavior": "pause", "disable_connect": false, "video_playback": true, "manifest_formats": ["file_urls_mp3", "file_urls_external", "file_ids_mp4", "file_ids_mp4_dual", "manifest_ids_video"] }, "device_id": this._deviceID = makeid(40), "device_type": "computer", "metadata": {}, "model": "web_player", "name": "Web Player (Chrome)", "platform_identifier": "web_player osx 10.15.4;chrome 80.0.3987.163;desktop" }, "connection_id": connectionID, "client_version": "harmony:4.0.0-4f6c892", "volume": 65535 })
    });
  }

  private connectState(connectionID: string) {
    return got.put(SPOTIFY_CONNECT_STATE(this._deviceID), {
      headers: {
        authorization: `Bearer ${this.token}`,
        ...SPOTIFY_HEADERS,
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

export default SpotifyClient;