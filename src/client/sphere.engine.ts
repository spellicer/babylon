import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import "@babylonjs/loaders/glTF";
import { fromEvent, merge, Subject } from "rxjs";
import { map, pluck, share, tap } from "rxjs/operators";
import { Ground } from "./ground";
import { Scene } from "./scene";
import { ISphereData, Sphere } from "./sphere";
import { uuidv4 } from "./utility";
import { WebSocketAdapter } from "./web.socket.adapter";
export class SphereEngine {
    static startWorker(worker: Worker) {
        const sphereMap = new Map<string, Vector3>();
        worker.addEventListener("message", event => {
            sphereMap.set(event.data.id, event.data.position);
        });

        setInterval(() => {
            sphereMap.forEach((value, key, map) => {
                value.x++;
                value.z++;
                worker.postMessage({ id: key, position: value });
            });
        }, 1000);
    }
    inCreateSphereAt$ = new Subject<Vector3>();
    constructor(worker: Worker, webSocket: WebSocketAdapter, scene: Scene, private ground: Ground) {
        const outWorker$ = fromEvent(worker, "message").pipe(
            pluck<Event, ISphereData>("data"),
            share(),
        );
        const inWorker$ = new Subject<ISphereData>()
        inWorker$.subscribe(message => worker.postMessage(message));
        const created$ = this.inCreateSphereAt$.pipe(
            map(position => ({
                id: uuidv4(),
                position: position,
                color: new Color3(Math.random() * 2, Math.random() * 2, Math.random() * 2),
            })),
        );
        const imported$ = webSocket.outObject$.pipe(
            map(message => ({
                id: message.id,
                position: new Vector3(...message.position),
                color: new Color3(...message.color),
            })),
        );
        merge(created$, imported$).pipe(
            tap(doc => this.fixPosition(doc.position)),
            map(doc => new Sphere(doc, scene, inWorker$, outWorker$)),
        ).subscribe();
        webSocket.outString$.pipe(
            tap(id => console.debug(`deleting ${id}`)),
            map(id => scene.getMeshByName(id)),
            tap(mesh => mesh?.dispose()),
        ).subscribe();
        webSocket.outEvent$.pipe(
            tap(() => webSocket.inString$.next("hey")),
        ).subscribe();
    }
    private fixPosition(position: Vector3) {
        position.y = this.ground.getHeightAtCoordinates(position.x, position.z) + 10;
        return position;
    }
}