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
    static inWorker$: Subject<ISphereData>;
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
        Sphere.inWorker$ = new Subject<ISphereData>()
        Sphere.inWorker$.subscribe(message => worker.postMessage(message));
    }
    mesh: AbstractMesh;
    constructor(first: AbstractMesh)
    constructor(first: Scene, position: Vector3)
    constructor(first?: AbstractMesh | Scene, position?: Vector3) {
        if (position && first instanceof Scene) {
            const material = new StandardMaterial("sphereMat", first);
            material.alpha = 1;
            material.diffuseColor = new Color3(Math.random() * 2, Math.random() * 2, Math.random() * 2);
            material.freeze();
            const id = uuidv4();
            const mesh = MeshBuilder.CreateSphere(id, { diameter: 4, segments: 32 }, first);
            mesh.material = material;
            mesh.position.copyFrom(position);
            this.mesh = mesh;
        } else if (first instanceof AbstractMesh) {
            this.mesh = first;
        } else {
            throw (new Error("Invalid Sphere Construction"));
        }
        Sphere.outWorker$.pipe(
            filter(sphereData => sphereData.id === this.mesh.id),
            pluck("position"),
            tap(position => this.mesh.position.copyFrom(position)),
        ).subscribe();
        Sphere.inWorker$.next({ id: this.mesh.id, position: this.mesh.position });
    }
    serialize() {
        const doc = SceneSerializer.SerializeMesh(this.mesh);
        doc._id = this.mesh.name;
        return doc;
    }
}