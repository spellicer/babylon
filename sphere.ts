import { AbstractMesh, Color3, MeshBuilder, SceneSerializer, StandardMaterial, Vector3 } from "babylonjs";
import { fromEvent, Observable, Subject } from "rxjs";
import { filter, pluck, tap } from "rxjs/operators";
import { Scene } from "./scene";
import { uuidv4 } from "./utility";
import { Ground } from "./ground";

export interface ISphereData {
    id: string;
    position: Vector3;
}

export class Sphere {
    static outWorker$: Observable<ISphereData>;
    static inWorker$: Subject<Sphere>;
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
    static wireWorker(worker: Worker, ground: Ground) {
        Sphere.outWorker$ = fromEvent(worker, "message").pipe(
            pluck<Event, ISphereData>("data"),
            tap(data => data.position.y = ground.getHeightAtCoordinates(data.position.x, data.position.z) + 2 || 300),
        );
        Sphere.inWorker$ = new Subject<Sphere>()
        Sphere.inWorker$.pipe(
            tap(sphere => worker.postMessage({ id: sphere.mesh.id, position: sphere.mesh.position })),
        ).subscribe();
    }
    static factory(scene: Scene, position: Vector3) {
        const material = new StandardMaterial("sphereMat", scene);
        material.alpha = 1;
        material.diffuseColor = new Color3(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        material.freeze();
        const id = uuidv4();
        const mesh = MeshBuilder.CreateSphere(id, { diameter: 4, segments: 32 }, scene);
        mesh.material = material;
        mesh.position.copyFrom(position);
        return mesh;
    }
    static serialize(mesh: AbstractMesh) {
        const doc = SceneSerializer.SerializeMesh(mesh);
        doc._id = mesh.name;
        return doc;
    }
    constructor(public mesh: AbstractMesh) {
        Sphere.outWorker$.pipe(
            filter(sphereData => sphereData.id === mesh.id),
            pluck("position"),
            tap(position => this.mesh.position.copyFrom(position)),
        ).subscribe();
        Sphere.inWorker$.next(this);
    }
}