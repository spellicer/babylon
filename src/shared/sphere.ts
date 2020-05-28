import { Vector3 } from "@babylonjs/core/Maths/math";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PhysicsImpostor } from "@babylonjs/core/Physics";
import { Observable, Subject } from "rxjs";
import { filter, pluck, tap } from "rxjs/operators";

export type ThreeTuple = [number, number, number];
export interface ISphereData {
    id: string;
    position: ThreeTuple;
    color?: ThreeTuple;
}

export class Sphere {
    constructor(public mesh: AbstractMesh, inWorker$: Subject<ISphereData>, outWorker$: Observable<ISphereData>) {
        this.mesh.physicsImpostor = new PhysicsImpostor(this.mesh.getChildren(mesh => mesh.name === "Armature")[0].getChildren(mesh => mesh.name === "Cylinder")[0] as AbstractMesh, PhysicsImpostor.SphereImpostor, { mass: 10, ignoreParent: true }, this.mesh.getScene());
        outWorker$.pipe(
            filter(sphereData => sphereData.id === this.mesh.id),
            pluck("position"),
            // tap(() => this.mesh.physicsImpostor?.applyImpulse(new Vector3(1, 0, 1), this.mesh.getAbsolutePosition())),
        ).subscribe();
        console.log(this.mesh);
        inWorker$.next({ id: this.mesh.id, position: this.mesh.position.asArray() as ThreeTuple });
    }
}