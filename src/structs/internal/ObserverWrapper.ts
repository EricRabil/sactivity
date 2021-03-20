import { Observer } from "../../types/Observer";

export class ObserverWrapper<Target> implements Observer<Target> {
    public constructor(observer: Observer<Target>) {
        this.#observer = observer;
    }

    #observer: Observer<Target>;
    
    public observe(target: Target) {
        this.#observer.observe(target);
    }

    public unobserve(target: Target) {
        this.#observer.unobserve(target);
    }

    public disconnect() {
        this.#observer.disconnect();
    }
}