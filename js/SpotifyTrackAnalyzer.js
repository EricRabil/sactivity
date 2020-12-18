"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyTrackAnalyzer = void 0;
const types_1 = require("./types");
const events_1 = require("events");
class SpotifyTrackAnalyzer extends events_1.EventEmitter {
    constructor(client, token) {
        super();
        this.client = client;
        this.token = token;
        this.metadata = null;
        this.bars = [];
        this.beats = [];
        this.tatums = [];
        this.sections = [];
        this.segments = [];
        this.lookaheadIndex = 0;
        this.updateTimer = null;
        this.pending = {};
        client.on("trackID", async (id) => {
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
    /**
     * Preloads upcoming tracks to analyze for instant measurements
     */
    async lookahead() {
        this.lookaheadIndex += 1;
        const current = this.lookaheadIndex;
        await this.client.analyzeIfNeeded(this.client.playerState.next_tracks.filter(({ uri }) => uri !== "spotify:delimiter").slice(0, 5).map(({ uri }) => uri.split(":")[2]), this.token);
    }
    update() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = null;
        }
        this.emit("change", this);
        this.updateTimer = setTimeout(() => {
            if (this.client.playerState.is_playing)
                this.reschedule();
            else
                this.killall();
        }, 50);
    }
    killall() {
        [
            "tatum",
            "segment",
            "section",
            "beat",
            "bar"
        ].forEach((key) => this.pending[key] && clearTimeout(this.pending[key]));
    }
    reschedule() {
        [
            "tatum",
            "segment",
            "section",
            "beat",
            "bar"
        ].forEach(key => this.run(key));
    }
    run(key) {
        if (this.pending[key])
            this.pending[key] = clearTimeout(this.pending[key]);
        const { [key]: interval } = this;
        if (!interval || !types_1.AnalysisTimeInterval.isInterval(interval)) {
            this.defer(key);
            return;
        }
        ;
        this.emit(key, interval);
        this.pending[key] = setTimeout(() => {
            this.pending[key] = undefined;
            this.run(key);
        }, this.remainingMSInInterval(interval));
    }
    defer(key) {
        if (this.pending[key])
            this.pending[key] = clearTimeout(this.pending[key]);
        this.pending[key] = setTimeout(() => {
            this.pending[key] = undefined;
            this.run(key);
        }, 1000);
    }
    remainingMSInInterval({ start, duration }) {
        return ((start + duration) - this.position) * 1000;
    }
    get isCloseToStart() {
        return this.position < 2;
    }
    get tatum() {
        if (!this.metadata)
            return null;
        if (this.isCloseToStart)
            return this.metadata.tatums[0];
        return this.tatums.find(({ start }) => start < this.position) || null;
    }
    get segmentIndex() {
        if (!this.metadata)
            return -1;
        if (this.isCloseToStart)
            return 0;
        return this.segments.findIndex(({ start }) => start < this.position);
    }
    get segment() {
        return this.segments[this.segmentIndex] || null;
    }
    get nextSegment() {
        return this.segments[this.segmentIndex - 1] || null;
    }
    get secondNextSegment() {
        return this.segments[this.segmentIndex - 2] || null;
    }
    get section() {
        if (!this.metadata)
            return null;
        if (this.isCloseToStart)
            return this.metadata.sections[0];
        return this.sections.find(({ start }) => start < this.position) || null;
    }
    get beat() {
        if (!this.metadata)
            return null;
        return this.beats.find(({ start }) => start < this.position) || null;
    }
    get bar() {
        if (!this.metadata)
            return null;
        if (this.isCloseToStart)
            return this.metadata.bars[0];
        return this.bars.find(({ start }) => start >= this.position) || null;
    }
    get position() {
        return this.client.position / 1000;
    }
}
exports.SpotifyTrackAnalyzer = SpotifyTrackAnalyzer;
