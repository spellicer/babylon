import { AbstractMesh, SceneLoader, Vector3 } from "babylonjs";
import { from, merge, Observable, partition, Subject } from "rxjs";
import { filter, flatMap, map, share, tap } from "rxjs/operators";
import { Ground } from "./ground";
import { Scene } from "./scene";
import { Sphere } from "./sphere";
export interface IMeshDoc {
    _id: string;
    _deleted?: boolean;
    meshes: AbstractMesh[];
}
export class SphereEngine {
    outPut$: Observable<IMeshDoc>;
    inCreateSphereAt$ = new Subject<Vector3>();
    inImport$ = new Subject<IMeshDoc>();
    inDelete$ = new Subject<string>();
    constructor(scene: Scene, private ground: Ground) {
        const created$ = this.inCreateSphereAt$.pipe(
            tap(position => this.fixPosition(position)),
            map(position => Sphere.factory(scene, position)),
            map(mesh => <[AbstractMesh, boolean]>[mesh, scene.intersects(mesh)]),
            share(),
        );
        const [createdBad$, createdGood$] = partition(created$, ([mesh, intersects]) => intersects);
        this.outPut$ = createdGood$.pipe(
            map(([mesh, intersects]) => mesh),
            map(Sphere.serialize),
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
            tap(mesh => new Sphere(mesh)),
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