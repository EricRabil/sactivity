import { EventEmitter } from "events";
import { WebSocket } from "@clusterws/cws";
import got, { HTTPError } from "got/dist/source";
import { SPOTIFY_SUBSCRIBE, SPOTIFY_TRACK, SPOTIFY_HEADERS, SPOTIFY_CONNECT_STATE, SPOTIFY_TRACK_DATA, SPOTIFY_AUDIO_ANALYSIS, SPOTIFY_ANALYSIS_PAGE, SPOTIFY_ANALYSIS_TOKEN } from "./const";
import { makeid, spotifyTrackID } from "./util";
import { AnalysisResult, AsyncAnalysisCache, PlaybackOptions, PlayerState, SpotifyDevice, SpotifyPayload, SpotifyTrack, StateChangePayload } from "./types";
import Sactivity, { SpotifyProvider } from ".";

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
  on(event: 'trackID', listener: (trackID: string) => any): this;
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
  public _analysisCache: Record<string, AnalysisResult> = {};
  private _lastTimestamp: number = NaN;
  
  public asyncCache?: AsyncAnalysisCache;

  constructor(public readonly socket: WebSocket, private token: string, private provider: Sactivity) {
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
      Object.entries(pull).forEach(([key, value]) => {
        this._trackCache[key] = value;
        if (value.linked_from && value.linked_from.uri) {
          const linkedURI = spotifyTrackID(value.linked_from.uri);
          console.log(linkedURI);
          if (linkedURI) this._trackCache[linkedURI] = value;
        }
      });
    }

    return ids.map(id => [id, this._trackCache[id]]).reduce((acc, [id, track]) => ({ ...acc, [id as string]: track as SpotifyTrack }), {} as Record<string, SpotifyTrack>);
  }

  async resolveURI(...uri: string[]) {
    return Object.entries(await this.resolve(...uri.map(uri => uri.split(':track:')[1]))).map(([key, value]) => (
      [`spotify:track:${key}`, value] as [string, SpotifyTrack]
    )).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as ReturnType<this['resolve']>);
  }

  async analyzeIfNeeded(trackIDs: string[], token?: string): Promise<void> {
    if (this.asyncCache) {
      const cached = await this.asyncCache.resolveMany(trackIDs);
      trackIDs = trackIDs.filter(id => !cached[id]);
    }

    await Promise.all(trackIDs.map(id => this.analyze(id, token)));
  }

  /**
   * Returns a Spotify analysis for a given track
   * @param trackID track to analyze
   */
  async analyze(trackID: string, token = process.env.ANALYSIS_TOKEN || this.token): Promise<AnalysisResult> {
    if (this.asyncCache) {
      const result = await this.asyncCache.resolve(trackID);
      if (result) return result;
    }
    else if (this._analysisCache[trackID]) return this._analysisCache[trackID];

    try {
      const { body } = await got.get(SPOTIFY_AUDIO_ANALYSIS(trackID), {
        headers: {
          authorization: `Bearer ${token}`,
          ...SPOTIFY_HEADERS
        },
        responseType: 'json'
      }) as { body: AnalysisResult };

      if (this.asyncCache) await this.asyncCache.store(trackID, body);

      return body;
    } catch (e) {
      if (e instanceof HTTPError) {
        if (typeof e.response.body === "object" && e.response.body !== null && "error" in e.response.body) {
          const body = (e.response.body as { error: { status?: number, message?: string } });

          if (body.error.status === 401 && body.error.message === "The access token expired") {
            const token = await this.createAnalysisToken();
            if (!token) return null!;

            return this.analyze(trackID, this.token = token);
          }
        }
        console.log(e.response.body);
      }

      return null!;
    }
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

  /**
   * Current position in the song
   */
  get position(): number {
    if (this._isPaused) return +(this._lastPosition || NaN);
    const effective = this._lastTimestamp;
    const base = +(this._lastPosition || NaN);

    const diff = Date.now() - effective;

    return base + diff;
  }

  set playerState(playerState) {
    this._playerState = playerState;
    this._diffPlayerState();
  }

  private async _diffPlayerState() {
    const playerState = this._playerState;
    const events: Array<[string, ...any[]]> = [];

    this._lastTimestamp = +playerState.timestamp;

    // if track UID did change, emit the change
    if (playerState.track) {
      if (playerState.track.uri !== this._lastTrackURI) {
        this._lastTrackURI = playerState.track.uri;
        events.push(["trackID", playerState.track.uri.split(":")[2]]);

        this.resolveURI(playerState.track.uri).then(({ [playerState.track.uri]: track }) => {
          this._lastTrack = track;
          this.emit("track", track);
        });
      }
    }

    const isEmpty = (!this._activeDeviceID || playerState.playback_speed === 0);

    playerState.is_playing = isEmpty ? false : playerState.is_playing;
    playerState.is_paused = isEmpty ? true : playerState.is_paused;

    // if playing state did change, emit the change
    if (playerState.is_playing !== this._isPlaying) {
      this._isPlaying = playerState.is_playing;
      events.push([this._isPlaying ? "playing" : "stopped"])
    }

    // if pause state did change, emit the change
    if (playerState.is_paused !== this._isPaused) {
      this._isPaused = playerState.is_paused;
      events.push([this._isPaused ? "paused" : "resumed"])
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
  private handleStateChange({ active_device_id, player_state, devices }: StateChangePayload["cluster"]) {
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
            this.handleStateChange(payload.cluster);
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

  public async createAnalysisToken(): Promise<string | null> {
    const headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-encoding": "gzip, deflate, br",
      "accept-language": "en",
      "cache-control": "max-age=0",
      cookie: this.provider.cookies,
      "referer": "https://developer.spotify.com/callback/",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36"
    }

    const page = await got.get(SPOTIFY_ANALYSIS_PAGE, {
      headers
    });

    const bits = /&client_id=(.*)`/g.exec(page.body);
    if (!bits) return null;

    const [ , clientID ] = bits;

    const result = await got.get(SPOTIFY_ANALYSIS_TOKEN(clientID), {
      headers: {
        ...headers,
        referer: "https://developer.spotify.com/"
      },
      followRedirect: false
    });

    const location = result.headers.location;
    if (!location) return null;

    const tokenBits = /access_token=(.*)&token_/g.exec(location);
    if (!tokenBits) return null;

    return tokenBits[1] || null;
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
      body: JSON.stringify({ "device": { "brand": "spotify", "capabilities": { "change_volume": true, "audio_podcasts": true, "enable_play_token": true, "play_token_lost_behavior": "pause", "disable_connect": false, "video_playback": true, "manifest_formats": ["file_urls_mp3", "file_urls_external", "file_ids_mp4", "file_ids_mp4_dual", "manifest_ids_video"] }, "device_id": this._deviceID = makeid(40), "device_type": "computer", "metadata": {}, "model": "web_player", "name": "Web Player (Chrome)", "platform_identifier": "web_player osx 10.15.4;chrome 80.0.3987.163;desktop" }, "connection_id": connectionID, "client_version": "harmony:4.9.0-d242618", "volume": 65535 })
    });
  }

  private async connectState(connectionID: string) {
    const { body } = await got.put(SPOTIFY_CONNECT_STATE(this._deviceID), {
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
      }),
      responseType: "json"
    });

    this.handleStateChange(body as StateChangePayload["cluster"]);
  }
}

export default SpotifyClient;