import { AbstractMesh, Color3, MeshBuilder, Scene, SceneLoader, SceneSerializer, StandardMaterial, Vector3 } from "babylonjs";
import { from, of } from "rxjs";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { Game, IMeshDoc } from "./game";
import { uuidv4 } from "./utility";

export interface ISphereData {
    id: string;
    position: Vector3;
}

export class Sphere {
    static moveAction(position: Vector3) {
        position.x++;
        position.z++;
    }
    mesh?: AbstractMesh;
    doc?: IMeshDoc;
    constructor(private game: Game, docOrPosition: IMeshDoc | Vector3) {
        const mesh$ = docOrPosition instanceof Vector3
            ? of(this.createSphere(game.scene, docOrPosition)).pipe(
                map(mesh => <[AbstractMesh, IMeshDoc]>[mesh, SceneSerializer.SerializeMesh(mesh)]),
                tap(([mesh, doc]) => doc._id = mesh.name),
                tap(([mesh, doc]) => this.doc = doc),
                map(([mesh, doc]) => mesh),
            )
            : of(docOrPosition).pipe(
                tap(doc => this.doc = doc),
                flatMap(doc => from(SceneLoader.ImportMeshAsync(doc._id, `data:application/json,${JSON.stringify(doc)}`, "", game.scene, undefined, ".babylon"))),
                filter(importmesh => importmesh && importmesh.meshes && importmesh.meshes.length > 0),
                map(importmesh => importmesh.meshes[0]),
            );
        mesh$.pipe(
            filter(mesh => !!mesh),
            tap(mesh => this.mesh = mesh),
            tap(mesh => game.world.getDispatchFor$(mesh.id).pipe(
                tap(position => position.y = this.game.getHeight(position) + 5),
                tap(position => this.mesh?.position.copyFrom(position)),
            ).subscribe()),
            tap(mesh => this.game.world.registerPosition(mesh.id, mesh.position)),
        ).subscribe();
    }
    private createSphere(scene: Scene, position: Vector3) {
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
}