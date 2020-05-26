import { AbstractMesh, PhysicsImpostor, Vector3 } from "babylonjs";
import { Observable, Subject } from "rxjs";
import { filter, pluck, tap } from "rxjs/operators";

export interface ISphereData {
    id: string;
    position: Vector3;
}

export class Sphere {
    constructor(public mesh: AbstractMesh, inWorker$: Subject<ISphereData>, outWorker$: Observable<ISphereData>) {
        this.mesh.physicsImpostor = new PhysicsImpostor(this.mesh, PhysicsImpostor.SphereImpostor, { mass: 5 }, this.mesh.getScene());
        outWorker$.pipe(
            filter(sphereData => sphereData.id === this.mesh.id),
            // tap(sphereData => console.log("from main", sphereData.id)),
            pluck("position"),
            tap(() => this.mesh.physicsImpostor?.applyImpulse(new Vector3(5, 0, 5), this.mesh.getAbsolutePosition())),
        ).subscribe();
        inWorker$.next({ id: this.mesh.id, position: this.mesh.position });
    }
}