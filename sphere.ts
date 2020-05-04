import { AbstractMesh, Color3, MeshBuilder, Scene, SceneSerializer, StandardMaterial, Vector3 } from "babylonjs";
import { Subject } from "rxjs";
import { tap } from "rxjs/operators";
import { uuidv4 } from "./utility";

export interface ISphereData {
    id: string;
    position: Vector3;
}

export class Sphere {
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
    static moveAction(position: Vector3) {
        position.x++;
        position.z++;
    }
    inMoveTo$ = new Subject<Vector3>();
    constructor(public mesh: AbstractMesh, private getHeight: (position: Vector3) => number) {
        this.inMoveTo$.pipe(
            tap(position => position.y = this.getHeight(position) + 5),
            tap(position => this.mesh.position.copyFrom(position)),
        ).subscribe();
    }
}