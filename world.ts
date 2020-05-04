import { Vector3 } from "babylonjs";
import { fromEvent, Observable } from "rxjs";
import { filter, map } from "rxjs/operators";
import Worker from "worker-loader!./world.worker";
import { ISphereData } from "./sphere";
export class World {
    worker: Worker;
    private dispatch$: Observable<ISphereData>;
    constructor() {
        this.worker = new Worker();
        this.dispatch$ = fromEvent(this.worker, "message").pipe(
            map(event => (<MessageEvent>event).data),
        );
    }
    getDispatchFor$(id: string) {
        return this.dispatch$.pipe(
            filter(sphereData => sphereData.id === id),
            map(sphereData => sphereData.position),
        );
    }
    registerPosition(id: string, position: Vector3) {
        this.worker.postMessage({ id, position });
    }
}