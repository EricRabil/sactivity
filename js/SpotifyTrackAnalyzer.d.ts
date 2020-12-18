/// <reference types="node" />
import SpotifyClient from "./SpotifyClient";
import { AnalysisResult, AnalysisSection, AnalysisSegment, AnalysisTimeInterval } from "./types";
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
export declare class SpotifyTrackAnalyzer extends EventEmitter {
    private client;
    private token?;
    metadata: AnalysisResult | null;
    private bars;
    private beats;
    private tatums;
    private sections;
    private segments;
    constructor(client: SpotifyClient, token?: string | undefined);
    private lookaheadIndex;
    /**
     * Preloads upcoming tracks to analyze for instant measurements
     */
    private lookahead;
    updateTimer: NodeJS.Timeout | null;
    private update;
    private killall;
    private reschedule;
    private pending;
    private run;
    private defer;
    remainingMSInInterval({ start, duration }: AnalysisTimeInterval): number;
    private get isCloseToStart();
    get tatum(): AnalysisTimeInterval | null;
    private get segmentIndex();
    get segment(): AnalysisSegment | null;
    get nextSegment(): AnalysisSegment | null;
    get secondNextSegment(): AnalysisSegment | null;
    get section(): AnalysisSection | null;
    get beat(): AnalysisTimeInterval | null;
    get bar(): AnalysisTimeInterval | null;
    get position(): number;
}
