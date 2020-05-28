import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import "@babylonjs/loaders/glTF";
import { from, fromEvent, merge, Observable, partition, Subject } from "rxjs";
import { flatMap, map, pluck, share, tap } from "rxjs/operators";
import { ISphereData, Sphere, ThreeTuple } from "../shared/sphere";
import { Ground } from "./ground";
import { Scene } from "./scene";
import { uuidv4 } from "./utility";
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
        return { id: mesh.id, position: mesh.position.asArray(), color: (mesh.material as StandardMaterial).diffuseColor.asArray() } as ISphereData;
    }
    static factory(scene: Scene, position: Vector3, id?: string, color?: Color3) {
        const meshId = id || uuidv4();
        return from(SceneLoader.ImportMeshAsync("", "", "alien.glb", scene)).pipe(
            tap(importmesh => console.log(importmesh)),
            map(importmesh => ({
                importmesh: importmesh, material: Object.assign(new StandardMaterial(`${meshId}-material`, scene), {
                    alpha: 1,
                    diffuseColor: color || new Color3(Math.random() * 2, Math.random() * 2, Math.random() * 2),
                })
            })),
            tap(meshmaterial => meshmaterial.importmesh.meshes.forEach(mesh => mesh.material = meshmaterial.material)),
            map(meshmaterial => meshmaterial.importmesh),
            tap(importmesh => importmesh.meshes.filter(mesh => mesh.id === "__root__").forEach(mesh => mesh.position.copyFrom(position))),
            tap(importmesh => importmesh.meshes.filter(mesh => mesh.id === "__root__").forEach(mesh => mesh.name = mesh.id = meshId)),
            // tap(importmesh => importmesh.meshes[0].position.copyFrom(position)),
            // tap(importmesh => importmesh.meshes[1].position = Vector3.Zero()),
            map(importmesh => importmesh.meshes.find(mesh => mesh.id === meshId) as AbstractMesh),
        );
    }
    outPut$: Observable<ISphereData>;
    inCreateSphereAt$ = new Subject<Vector3>();
    inImport$ = new Subject<ISphereData>();
    inDelete$ = new Subject<string>();
    constructor(scene: Scene, private ground: Ground) {
        const created$ = this.inCreateSphereAt$.pipe(
            tap(position => this.fixPosition(position)),
            flatMap(position => SphereEngine.factory(scene, position)),
            map(mesh => <[AbstractMesh, boolean]>[mesh, scene.intersects(mesh)]),
            share(),
        );
        const [createdBad$, createdGood$] = partition(created$, ([mesh, intersects]) => intersects);
        this.outPut$ = createdGood$.pipe(
            map(([mesh, intersects]) => mesh),
            map(SphereEngine.serialize),
        );
        const imported$ = this.inImport$.pipe(
            tap(doc => doc.position = this.fixPosition(new Vector3(...doc.position)).asArray() as ThreeTuple),
            flatMap(doc => SphereEngine.factory(scene, new Vector3(...doc.position), doc.id, doc.color ? new Color3(...doc.color) : undefined)),
            map(mesh => <[AbstractMesh, boolean]>[mesh, scene.intersects(mesh)]),
            share(),
        );
        const [importBad$, importGood$] = partition(imported$, ([mesh, intersects]) => false);
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
        position.y = this.ground.getHeightAtCoordinates(position.x, position.z) + 10;
        return position;
    }
}