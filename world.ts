import { fromEvent, Subject } from "rxjs";
import { filter, map, pluck, tap } from "rxjs/operators";
import Worker from "worker-loader!./world.worker";
import { Sphere } from "./sphere";
export class World {
    private worker: Worker;
    inRegister$ = new Subject<Sphere>();
    constructor() {
        this.worker = new Worker();
        const dispatch$ = fromEvent(this.worker, "message").pipe(
            map(event => (<MessageEvent>event).data),
        );
        this.inRegister$.pipe(
            tap(sphere => dispatch$.pipe(
                filter(sphereData => sphereData.id === sphere.mesh.id),
                pluck("position"),
            ).subscribe(sphere.inMoveTo$)),
            tap(sphere => this.worker.postMessage({ id: sphere.mesh.id, position: sphere.mesh.position })),
        ).subscribe();
    }
}