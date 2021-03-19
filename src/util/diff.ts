export type Diffed<T> = T extends object ? {
    [K in keyof T]: T[K] extends object ? Diffed<T[K]> : {
        old: T[K];
        new: T[K];
    };
} : Diff<T>;

export interface Diff<T> {
    old: T | typeof None;
    new: T;
};

export const None = Symbol("None");

function isObject(object: unknown): object is object {
    return typeof object === "object" && object !== null;
}

export function isDifferent<T>(diff: Diff<T>): boolean {
    if (diff.old === None) return true;
    else return diff.old !== diff.new;
}

export function diff<T extends object>(oldObject: T | null, newObject: T): Diffed<T> {
    const diffed: Partial<Diffed<T>> = {};

    for (const key in newObject) {
        const value = newObject[key];
        const oldValue = (typeof oldObject === "object" && oldObject !== null) ? oldObject[key] : None;

        if (isObject(value)) {
            (diffed as unknown as Record<string, unknown>)[key] = diff(isObject(oldValue) ? oldValue : null, value) as Diffed<T[typeof key]>;
        } else {
            (diffed as unknown as Record<string, unknown>)[key] = {
                old: oldValue,
                new: value
            };
        }
    }

    return diffed as Diffed<T>;
}