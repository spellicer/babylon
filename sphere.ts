import { AbstractMesh, Color3, MeshBuilder, PhysicsImpostor, SceneSerializer, StandardMaterial, Vector3 } from "babylonjs";
import { fromEvent, Observable, Subject } from "rxjs";
import { filter, pluck, tap, share } from "rxjs/operators";
import { Scene } from "./scene";
import { uuidv4 } from "./utility";

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
                console.log("from worker", key);
                worker.postMessage({ id: key, position: value });
            });
        }, 1000);
    }
    static wireWorker(worker: Worker) {
        Sphere.outWorker$ = fromEvent(worker, "message").pipe(
            pluck<Event, ISphereData>("data"),
            share(),
        );
        Sphere.inWorker$ = new Subject<ISphereData>()
        Sphere.inWorker$.subscribe(message => worker.postMessage(message));
    }
    static serialize(mesh: AbstractMesh) {
        const doc = SceneSerializer.SerializeMesh(mesh);
        doc._id = mesh.name;
        return doc;
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
    constructor(public mesh: AbstractMesh) {
        this.mesh.physicsImpostor = new PhysicsImpostor(this.mesh, PhysicsImpostor.SphereImpostor, { mass: 5 }, this.mesh.getScene());
        Sphere.outWorker$.pipe(
            filter(sphereData => sphereData.id === this.mesh.id),
            tap(sphereData => console.log("from main", sphereData.id)),
            pluck("position"),
            tap(() => this.mesh.physicsImpostor?.applyImpulse(new Vector3(5, 0, 5), this.mesh.getAbsolutePosition())),
        ).subscribe();
        Sphere.inWorker$.next({ id: this.mesh.id, position: this.mesh.position });
    }
}