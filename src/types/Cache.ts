export interface Cache<T> {
    resolve(ids: string[]): Promise<Record<string, T>>;
    store(objects: Record<string, T>): Promise<void>;
}