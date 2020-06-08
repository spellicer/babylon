import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PhysicsImpostor } from "@babylonjs/core/Physics";
import { from, Subject } from "rxjs";
import { map, share, tap } from "rxjs/operators";
import { Ground } from "./ground";
import { Scene } from "./scene";

export interface ISphereData {
    id: string;
    position: Vector3;
    color: Color3;
}

export class Sphere {
    constructor(doc: ISphereData, ground: Ground, inWorker$: Subject<ISphereData>) {
        const scene = ground.getScene() as Scene;
        doc.position.y = ground.getHeightAtCoordinates(doc.position.x, doc.position.z);
        const import$ = from(SceneLoader.ImportMeshAsync("", "", "alien.glb", scene)).pipe(
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
            tap(mesh => mesh.physicsImpostor = new PhysicsImpostor(mesh.getChildren(child => child.name === "Armature")[0].getChildren(child => child.name === "Cylinder").pop() as AbstractMesh, PhysicsImpostor.SphereImpostor, { mass: 10, ignoreParent: true }, mesh.getScene())),
            share(),
        );
        import$.pipe(
            map(mesh => ({ id: mesh.id, position: mesh.position, color: (mesh.material as StandardMaterial).diffuseColor })),
        ).subscribe(data => inWorker$.next(data));
    }
}