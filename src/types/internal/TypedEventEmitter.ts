import EventEmitter from "eventemitter3";
import StrictEventEmitter from "strict-event-emitter-types/types/src";

export type TypedEventEmitter<T> = {
    new(): StrictEventEmitter<EventEmitter, T>;
};