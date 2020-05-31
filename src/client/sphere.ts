import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PhysicsImpostor } from "@babylonjs/core/Physics";
import { combineLatest, from, merge, Observable, partition, Subject } from "rxjs";
import { filter, map, share, tap } from "rxjs/operators";
import { Scene } from "./scene";

export interface ISphereData {
    id: string;
    position: Vector3;
    color: Color3;
}

export class Sphere {
    constructor(doc: ISphereData, scene: Scene, inWorker$: Subject<ISphereData>, outWorker$: Observable<ISphereData>) {
        const import$ = from(SceneLoader.ImportMeshAsync("", "", "alien.glb", scene)).pipe(
            tap(importmesh => console.log(importmesh)),
            map(importmesh => ({
                importmesh: importmesh, material: Object.assign(new StandardMaterial(`${doc.id}-material`, scene), {
                    alpha: 1,
                    diffuseColor: doc.color,
                })
            })),
            tap(meshmaterial => meshmaterial.importmesh.meshes.forEach(mesh => mesh.material = meshmaterial.material)),
            map(meshmaterial => meshmaterial.importmesh),
            tap(importmesh => importmesh.meshes.filter(mesh => mesh.id === "__root__").forEach(mesh => mesh.position.copyFrom(doc.position))),
            tap(importmesh => importmesh.meshes.filter(mesh => mesh.id === "__root__").forEach(mesh => mesh.name = mesh.id = doc.id)),
            map(importmesh => importmesh.meshes.find(mesh => mesh.id === doc.id) as AbstractMesh),
            tap(mesh => mesh.physicsImpostor = new PhysicsImpostor(mesh.getChildren(child => child.name === "Armature")[0].getChildren(child => child.name === "Cylinder")[0] as AbstractMesh, PhysicsImpostor.SphereImpostor, { mass: 10, ignoreParent: true }, mesh.getScene())),
            share(),
        );
        const [intersected$, notintersected$] = partition(import$, mesh => scene.intersects(mesh) && false);
        merge(
            intersected$.pipe(
                tap(mesh => mesh.dispose()),
                map(mesh => undefined),
            ),
            notintersected$,
        ).subscribe();
        combineLatest(notintersected$, outWorker$).pipe(
            filter(([mesh, sphereData]) => sphereData.id === doc.id),
            map(([mesh, sphereData]) => sphereData.position),
            // tap(() => this.mesh.physicsImpostor?.applyImpulse(new Vector3(1, 0, 1), this.mesh.getAbsolutePosition())),
        ).subscribe();
        notintersected$.pipe(
            map(mesh => ({ id: mesh.id, position: mesh.position, color: (mesh.material as StandardMaterial).diffuseColor })),
        ).subscribe(inWorker$);
    }
}