import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import "@babylonjs/loaders/glTF";
import { fromEvent, merge, partition, Subject } from "rxjs";
import { map, pluck, share, tap } from "rxjs/operators";
import { Ground } from "./ground";
import { Scene } from "./scene";
import { ISphereData, Sphere } from "./sphere";
import { uuidv4 } from "./utility";
import { WebSocketAdapter } from "./web.socket.adapter";
export interface IWorkerCommand {
    command: "start" | "sphereData";
}
export interface IStartCommand extends IWorkerCommand {
    command: "start";
    url: string;
}
export interface ISphereCommand extends IWorkerCommand {
    command: "sphereData";
    sphere: ISphereData;
}
export class SphereEngine {
    static startWorker(worker: Worker) {
        let webSocket: WebSocketAdapter;
        const sphereMap = new Map<string, Vector3>();
        worker.addEventListener("message", event => {
            const data = event.data as IWorkerCommand;
            console.log(JSON.stringify(data));
            switch (data.command) {
                case "start":
                    const start = data as IStartCommand;
                    webSocket = new WebSocketAdapter(start.url);
                    webSocket.outEvent$.subscribe(() => {
                        webSocket.outString$.subscribe(id => worker.postMessage(id));
                        webSocket.outObject$.subscribe(sphereData => worker.postMessage(sphereData));
                        webSocket.inString$.next("hey");
                    });
                    break;
                case "sphereData":
                    const sphereCommand = data as ISphereCommand;
                    sphereMap.set(sphereCommand.sphere.id, sphereCommand.sphere.position);
                    break;
            }
        });
    }
    inCreateSphereAt$ = new Subject<Vector3>();
    constructor(worker: Worker, url: string, scene: Scene, ground: Ground) {
        const outWorker$ = fromEvent(worker, "message").pipe(
            pluck<Event, ISphereData | string>("data"),
        );
        const inWorker$ = new Subject<ISphereData>()
        inWorker$.pipe(
            map(sphereData => ({ command: "sphereData", sphere: sphereData })),
        ).subscribe(message => worker.postMessage(message));
        const created$ = this.inCreateSphereAt$.pipe(
            map(position => ({
                id: uuidv4(),
                position: position,
                color: new Color3(Math.random() * 2, Math.random() * 2, Math.random() * 2),
            })),
        );
        const [strings$, objects$] = partition(outWorker$, data => typeof data === "string");
        const imported$ = objects$.pipe(
            map(message => message as any),
            map(message => ({
                id: message.id,
                position: new Vector3(...message.position),
                color: new Color3(...message.color),
            })),
        );
        merge(created$, imported$).pipe(
            map(doc => new Sphere(doc, ground, inWorker$)),
        ).subscribe();
        strings$.pipe(
            tap(id => console.debug(`deleting ${id}`)),
            map(id => scene.getMeshByName(id as string)),
            tap(mesh => mesh?.dispose()),
        ).subscribe();
        worker.postMessage({ command: "start", url: url });
    }
}