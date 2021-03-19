export interface Observer<T> {
    observe(target: T): void;
    unobserve(target: T): void;
    disconnect(): void;
}