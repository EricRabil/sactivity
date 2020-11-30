import SpotifyClient, { AnalysisResult, AnalysisSection, AnalysisSegment, AnalysisTimeInterval } from "./SpotifyClient";
import { EventEmitter } from "events";

export declare interface SpotifyTrackAnalyzer {
    on(event: 'tatum', listener: (tatum: AnalysisTimeInterval) => any): this;
    on(event: 'segment', listener: (segment: AnalysisSegment) => any): this;
    on(event: 'section', listener: (section: AnalysisSection) => any): this;
    on(event: 'beat', listener: (beat: AnalysisTimeInterval) => any): this;
    on(event: 'bar', listener: (bar: AnalysisTimeInterval) => any): this;
    on(event: 'change', listener: (analyzer: SpotifyTrackAnalyzer) => any): this;
    on(event: string, listener: Function): this;
}

export class SpotifyTrackAnalyzer extends EventEmitter {
    public metadata: AnalysisResult | null = null;
    private bars: AnalysisTimeInterval[] = [];
    private beats: AnalysisTimeInterval[] = [];
    private tatums: AnalysisTimeInterval[] = [];
    private sections: AnalysisSection[] = [];
    private segments: AnalysisSegment[] = [];

    public constructor(private client: SpotifyClient, private token?: string) {
        super();

        client.on("trackID", async id => {
            this.metadata = await client.analyze(id, this.token);
            
            this.lookahead();

            if (this.metadata) {
                const { bars, beats, tatums, sections, segments } = this.metadata;
                this.bars = bars.slice().reverse();
                this.beats = beats.slice().reverse();
                this.tatums = tatums.slice().reverse();
                this.sections = sections.slice().reverse();
                this.segments = segments.slice().reverse();
            }

            this.update();
        });

        client.on("position", () => this.update());
        client.on("playing", () => this.update());
        client.on("resumed", () => this.update());
        client.on("stopped", () => this.killall());
        client.on("paused", () => this.killall());
    }

    private lookaheadIndex = 0;
    /**
     * Preloads upcoming tracks to analyze for instant measurements
     */
    private async lookahead() {
        this.lookaheadIndex += 1;
        const current = this.lookaheadIndex;

        for (let track of this.client.playerState.next_tracks.slice(0, 5)) {
            if (this.lookaheadIndex !== current) return;
            await this.client.analyze(track.uri.split(":")[2], this.token);
        }
    }

    updateTimer: NodeJS.Timeout | null = null;
    private update() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = null;
        }

        this.emit("change", this);

        this.updateTimer = setTimeout(() => {
            if (this.client.playerState.is_playing) this.reschedule();
            else this.killall();
        }, 50);
    }

    private killall() {
        ([
            "tatum",
            "segment",
            "section",
            "beat",
            "bar"
        ] as unknown as (keyof this)[]).forEach((key) => this.pending[key] && clearTimeout(this.pending[key]!));
    }

    private reschedule() {
        ([
            "tatum",
            "segment",
            "section",
            "beat",
            "bar"
        ] as unknown as (keyof this)[]).forEach(key => this.run(key));
    }

    private pending: Record<keyof this, NodeJS.Timeout | undefined> = {} as unknown as Record<keyof this, NodeJS.Timeout | undefined>;

    private run(key: keyof this) {
        if (this.pending[key]) this.pending[key] = clearTimeout(this.pending[key]!) as undefined;

        const { [key]: interval } = this;

        if (!interval || !AnalysisTimeInterval.isInterval(interval)) {
            this.defer(key);
            return;
        };

        this.emit(key as string, interval);

        this.pending[key] = setTimeout(() => {
            this.pending[key] = undefined;
            this.run(key);
        }, this.remainingMSInInterval(interval));
    }

    private defer(key: keyof this) {
        if (this.pending[key]) this.pending[key] = clearTimeout(this.pending[key]!) as undefined;

        this.pending[key] = setTimeout(() => {
            this.pending[key] = undefined;
            this.run(key);
        }, 1000);
    }

    public remainingMSInInterval({ start, duration }: AnalysisTimeInterval): number {
        return ((start + duration) - this.position) * 1000;
    }

    private get isCloseToStart(): boolean {
        return this.position < 2;
    }

    public get tatum(): AnalysisTimeInterval | null {
        if (!this.metadata) return null;

        if (this.isCloseToStart) return this.metadata.tatums[0];

        return this.tatums.find(({ start }) => start < this.position) || null;
    }

    private get segmentIndex(): number {
        if (!this.metadata) return -1;

        if (this.isCloseToStart) return 0;

        return this.segments.findIndex(({ start }) => start < this.position);
    }

    public get segment(): AnalysisSegment | null {
        return this.segments[this.segmentIndex] || null;
    }

    public get nextSegment(): AnalysisSegment | null {
        return this.segments[this.segmentIndex - 1] || null;
    }

    public get secondNextSegment(): AnalysisSegment | null {
        return this.segments[this.segmentIndex - 2] || null;
    }

    public get section(): AnalysisSection | null {
        if (!this.metadata) return null;

        if (this.isCloseToStart) return this.metadata.sections[0];

        return this.sections.find(({ start }) => start < this.position) || null;
    }

    public get beat(): AnalysisTimeInterval | null {
        if (!this.metadata) return null;

        return this.beats.find(({ start }) => start < this.position) || null;
    }

    public get bar(): AnalysisTimeInterval | null {
        if (!this.metadata) return null;

        if (this.isCloseToStart) return this.metadata.bars[0];

        return this.bars.find(({ start }) => start >= this.position) || null;
    }

    public get position(): number {
        return this.client.position / 1000;
    }
}