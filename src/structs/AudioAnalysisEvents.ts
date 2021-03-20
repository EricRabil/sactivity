import EventEmitter from "eventemitter3";
import { TypedEventEmitter } from "../types/internal/TypedEventEmitter";
import { Observer } from "../types/Observer";
import { SpotifyAnalysisResult, SpotifyAnalysisSection, SpotifyAnalysisSegment, SpotifyAnalysisTimeInterval } from "../types/SpotifyAnalysis";
import { SpotifyPlayerState } from "../types/SpotifyCluster";
import { AudioAnalysisCallback, AudioAnalysisObserver, AudioAnalysisObserverOptions } from "./AudioAnalysisObserver";
import { SpotifySocket } from "./SpotifySocket";
import { playerStatePosition } from "../util/spotify-player-state";

interface Events {
    tatum: SpotifyAnalysisTimeInterval;
    segment: SpotifyAnalysisSegment;
    section: SpotifyAnalysisSection;
    beat: SpotifyAnalysisTimeInterval;
    bar: SpotifyAnalysisTimeInterval;
    change: SpotifyAnalysisResult;
}

export interface AudioAnalysisDiscriminator {
    (states: Parameters<AudioAnalysisCallback>[0]): Parameters<AudioAnalysisCallback>[0][0];
}

export interface AudioAnalysisEventsOptions extends AudioAnalysisObserverOptions {
    discriminator?: AudioAnalysisDiscriminator;
}

type DamnitTimeout = ReturnType<typeof setTimeout>;

const events: (keyof AudioAnalysisEvents)[] = [
    "tatum",
    "segment",
    "section",
    "beat",
    "bar"
];

/**
 * Emits events when certain components of the current song are reached
 */
export class AudioAnalysisEvents extends (EventEmitter as TypedEventEmitter<Events>) implements Observer<SpotifySocket> {
    public constructor(options: AudioAnalysisEventsOptions) {
        super();
        
        this.#discriminator = options.discriminator || (states => states[0])

        this.#observer = new AudioAnalysisObserver(states => {
            const [ analysis, state ] = this.#discriminator(states);

            this.#current = analysis;
            this.#playerState = state;

            this.emit("change", this.#current);

            this.killall();

            if (state.is_playing && !state.is_paused) this.reschedule();
        }, options);
    }

    #observer: AudioAnalysisObserver;
    #discriminator: AudioAnalysisDiscriminator;
    #current: SpotifyAnalysisResult | null = null;
    #playerState: SpotifyPlayerState | null = null;
    #pending: Record<keyof this, DamnitTimeout | undefined> = {} as Record<keyof this, DamnitTimeout | undefined>;

    /**
     * De-schedules all pending analysis updates
     * @private
     */
    private killall() {
        events.forEach(key => this.#pending[key] && clearTimeout(this.#pending[key]!));
    }

    /**
     * Schedules analysis updates
     * @private
     */
    private reschedule() {
        events.forEach(key => this.run(key));
    }

    /**
     * Runs an analysis update
     * @param key key of the analysis to update
     */
    public run(key: keyof this) {
        if (this.#pending[key]) this.#pending[key] = clearTimeout(this.#pending[key]!) as undefined;

        const { [key]: interval } = this;

        if (!interval || !SpotifyAnalysisTimeInterval.isInterval(interval)) {
            this.defer(key);
            return;
        };

        this.emit(key as keyof Events, interval);

        this.#pending[key] = setTimeout(() => {
            this.#pending[key] = undefined;
            this.run(key);
        }, this.remainingMSInInterval(interval));
    }

    /**
     * Defers an update for an analysis component
     * @param key key of the analysis to defer
     */
    private defer(key: keyof this) {
        if (this.#pending[key]) this.#pending[key] = clearTimeout(this.#pending[key]!) as undefined;

        this.#pending[key] = setTimeout(() => {
            this.#pending[key] = undefined;
            this.run(key);
        }, 1000);
    }

    /**
     * Returns the remaining milliseconds in a time interval, relative to the current position
     * @param param0 
     * @returns 
     */
    public remainingMSInInterval({ start, duration }: SpotifyAnalysisTimeInterval): number {
        return ((start + duration) - this.position) * 1000;
    }

    public observe(target: SpotifySocket) {
        this.#observer.observe(target);
    }

    public unobserve(target: SpotifySocket) {
        this.#observer.unobserve(target);
    }

    public disconnect() {
        this.#observer.disconnect();
    }

    public get playerState(): SpotifyPlayerState | null {
        return this.#playerState;
    }

    public get current(): SpotifyAnalysisResult | null {
        return this.#current;
    }

    /**
     * Whether the song basically just started
     */
    private get isCloseToStart(): boolean {
        return this.position < 2;
    }

    /**
     * Current tatum
     */
    public get tatum(): SpotifyAnalysisTimeInterval | null {
        if (!this.#current) return null;

        if (this.isCloseToStart) return this.#current.tatums[0];

        return this.#current.tatums.find(({ start }) => start < this.position) || null;
    }

    /**
     * Index of the current segment
     */
    private get segmentIndex(): number {
        if (!this.#current) return -1;

        if (this.isCloseToStart) return 0;

        return this.#current.segments.findIndex(({ start }) => start < this.position);
    }

    /**
     * Current segment
     */
    public get segment(): SpotifyAnalysisSegment | null {
        return this.#current?.segments[this.segmentIndex] || null;
    }

    /**
     * Next segment
     */
    public get nextSegment(): SpotifyAnalysisSegment | null {
        return this.#current?.segments[this.segmentIndex - 1] || null;
    }

    /**
     * Segment after next segment
     */
    public get secondNextSegment(): SpotifyAnalysisSegment | null {
        return this.#current?.segments[this.segmentIndex - 2] || null;
    }

    /**
     * Current section
     */
    public get section(): SpotifyAnalysisSection | null {
        if (!this.#current) return null;

        if (this.isCloseToStart) return this.#current.sections[0];

        return this.#current.sections.find(({ start }) => start < this.position) || null;
    }

    /**
     * Current beat
     */
    public get beat(): SpotifyAnalysisTimeInterval | null {
        return this.#current?.beats.find(({ start }) => start < this.position) || null;
    }

    /**
     * Current bar
     */
    public get bar(): SpotifyAnalysisTimeInterval | null {
        if (!this.#current) return null;

        if (this.isCloseToStart) return this.#current.bars[0];

        return this.#current.bars.find(({ start }) => start >= this.position) || null;
    }

    /**
     * Current track position
     */
    public get position(): number {
        if (!this.#playerState) return NaN;
        return playerStatePosition(this.#playerState);
    }
}