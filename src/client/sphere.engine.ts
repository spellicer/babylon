import { AbstractMesh, SceneLoader, Vector3, SceneSerializer, StandardMaterial, Color3, MeshBuilder } from "babylonjs";
import { from, merge, Observable, partition, Subject, fromEvent } from "rxjs";
import { filter, flatMap, map, share, tap, pluck } from "rxjs/operators";
import { Ground } from "./ground";
import { Scene } from "./scene";
import { Sphere, ISphereData } from "../shared/sphere";
import { uuidv4 } from "./utility";
export interface IMeshDoc {
    _id: string;
    _deleted?: boolean;
    meshes: AbstractMesh[];
}
export class SphereEngine {
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
                // console.log("from worker", key);
                worker.postMessage({ id: key, position: value });
            });
        }, 1000);
    }
    static wireWorker(worker: Worker) {
        SphereEngine.outWorker$ = fromEvent(worker, "message").pipe(
            pluck<Event, ISphereData>("data"),
            share(),
        );
        SphereEngine.inWorker$ = new Subject<ISphereData>()
        SphereEngine.inWorker$.subscribe(message => worker.postMessage(message));
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
    outPut$: Observable<IMeshDoc>;
    inCreateSphereAt$ = new Subject<Vector3>();
    inImport$ = new Subject<IMeshDoc>();
    inDelete$ = new Subject<string>();
    constructor(scene: Scene, private ground: Ground) {
        const created$ = this.inCreateSphereAt$.pipe(
            tap(position => this.fixPosition(position)),
            map(position => SphereEngine.factory(scene, position)),
            map(mesh => <[AbstractMesh, boolean]>[mesh, scene.intersects(mesh)]),
            share(),
        );
        const [createdBad$, createdGood$] = partition(created$, ([mesh, intersects]) => intersects);
        this.outPut$ = createdGood$.pipe(
            map(([mesh, intersects]) => mesh),
            map(SphereEngine.serialize),
        );
        const imported$ = this.inImport$.pipe(
            filter(doc => doc && !!doc.meshes && !!doc._id),
            flatMap(doc => from(SceneLoader.ImportMeshAsync(doc._id, `data:application/json,${JSON.stringify(doc)}`, "", scene, undefined, ".babylon"))),
            filter(importmesh => importmesh && importmesh.meshes && importmesh.meshes.length > 0),
            map(importmesh => importmesh.meshes[0]),
            tap(mesh => this.fixPosition(mesh.position)),
            map(mesh => <[AbstractMesh, boolean]>[mesh, scene.intersects(mesh)]),
            share(),
        );
        const [importBad$, importGood$] = partition(imported$, ([mesh, intersects]) => intersects);
        merge(createdGood$, importGood$).pipe(
            map(([mesh, intersects]) => mesh),
            tap(mesh => new Sphere(mesh, SphereEngine.inWorker$, SphereEngine.outWorker$)),
        ).subscribe();
        merge(createdBad$, importBad$).subscribe(([mesh, intersects]) => mesh.dispose());
        this.inDelete$.pipe(
            tap(id => console.debug(`deleting ${id}`)),
            map(id => scene.getMeshByName(id)),
            tap(mesh => mesh?.dispose()),
        ).subscribe();
    }
    private fixPosition(position: Vector3) {
        position.y = this.ground.getHeightAtCoordinates(position.x, position.z) + 3;
        return position;
    }
}