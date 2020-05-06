import { Color3, CubeTexture, Engine, GroundMesh, Mesh, MeshBuilder, PointLight, Scene as BabylonScene, SceneLoader, StandardMaterial, Texture, Vector3 } from "babylonjs";
import { from, merge, Observable, Subject } from "rxjs";
import { filter, flatMap, map, tap, share } from "rxjs/operators";
import { Sphere } from "./sphere";
import { Ground } from "./ground";
export interface IMeshDoc {
    _id: string;
    _deleted?: boolean;
    meshes: any[];
}
export class Scene extends BabylonScene {
    outPut$: Observable<IMeshDoc>;
    inCreateSphereAt$ = new Subject<Vector3>();
    inImport$ = new Subject<IMeshDoc>();
    inDelete$ = new Subject<string>();
    constructor(engine: Engine) {
        super(engine);
        this.collisionsEnabled = true;
        this.gravity = new Vector3(0, -9.81, 0);
        // Skybox
        const skybox = Mesh.CreateBox("skyBox", 1024, this);
        const skyboxMaterial = new StandardMaterial("skyBox", this);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture("skybox", this);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skyboxMaterial.disableLighting = true;
        skyboxMaterial.freeze();
        skybox.material = skyboxMaterial;

        // Light
        var spot = new PointLight("spot", new Vector3(0, 400, 10), this);
        spot.diffuse = new Color3(1, 1, 1);
        spot.specular = new Color3(0, 0, 0);

        //Sphere to see the light's position
        const sunMat = new StandardMaterial("sun", this);
        sunMat.emissiveColor = new Color3(1, 1, 0);
        sunMat.freeze();
        const sun = Mesh.CreateSphere("sun", 10, 4, this);
        sun.material = sunMat;
        sun.position = spot.position;

        const newMeshes$ = this.inCreateSphereAt$.pipe(
            map(position => Sphere.factory(this, position)),
            share(),
        );
        this.outPut$ = newMeshes$.pipe(
            map(mesh => Sphere.serialize(mesh)),
        );
        const loadedMeshes$ = this.inImport$.pipe(
            filter(doc => doc && !!doc.meshes && !!doc._id),
            flatMap(doc => from(SceneLoader.ImportMeshAsync(doc._id, `data:application/json,${JSON.stringify(doc)}`, "", this, undefined, ".babylon"))),
            filter(importmesh => importmesh && importmesh.meshes && importmesh.meshes.length > 0),
            map(importmesh => importmesh.meshes[0]),
        );
        merge(loadedMeshes$, newMeshes$).pipe(
            map(mesh => new Sphere(mesh)),
        ).subscribe();
        this.inDelete$.pipe(
            tap(id => console.debug(`deleting ${id}`)),
            map(id => this.getMeshByName(id)),
            tap(mesh => mesh?.dispose()),
        ).subscribe();
    }
}