import { Color3, CubeTexture, Engine, GroundMesh, Mesh, MeshBuilder, PointLight, Scene as BabylonScene, SceneLoader, StandardMaterial, Texture, Vector3 } from "babylonjs";
import { from, merge, Observable, Subject } from "rxjs";
import { filter, flatMap, map, tap, share } from "rxjs/operators";
import { Sphere } from "./sphere";
const IMIN = -512;
const IMAX = 512;
const JMIN = -512;
const JMAX = 512;
const XMAX = -84.2873442391304;
const XMIN = -84.3743007608696;
const ZMAX = 33.7710719608696;
const ZMIN = 33.6841154391304;
export interface IMeshDoc {
    _id: string;
    _deleted?: boolean;
    meshes: any[];
}
export class Scene extends BabylonScene {
    private ground: GroundMesh;
    outPut$: Observable<IMeshDoc>;
    inCreateSphereAt$ = new Subject<Vector3>();
    inImport$ = new Subject<IMeshDoc>();
    inDelete$ = new Subject<string>();
    constructor(engine: Engine) {
        super(engine);
        // Skybox
        const skybox = Mesh.CreateBox("skyBox", 800.0, this);
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

        // Ground
        this.ground = MeshBuilder.CreateGroundFromHeightMap(
            "ground",
            "terrain.png",
            { width: 1024, height: 1024, subdivisions: 1024, minHeight: 230, maxHeight: 327, updatable: true },
            this
        )
        var groundMaterial = new StandardMaterial("ground", this);
        groundMaterial.diffuseTexture = new Texture("terrain.png", this);
        groundMaterial.freeze();
        this.ground.material = groundMaterial;
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
            map(mesh => new Sphere(mesh, position => this.getHeightAtCoordinates(position))),
        ).subscribe();
        this.inDelete$.pipe(
            tap(id => console.debug(`deleting ${id}`)),
            map(id => this.getMeshByName(id)),
            tap(mesh => mesh?.dispose()),
        ).subscribe();
    }
    getHeightAtCoordinates(position: Vector3) {
        return this.ground.getHeightAtCoordinates(position.x, position.z) || 295;
    }
    getXFromLongitude(longitude: number) {
        return (longitude - XMIN) / (XMAX - XMIN) * (IMAX - IMIN) + IMIN;
    }
    getYFromLatitude(latitude: number) {
        return (latitude - ZMIN) / (ZMAX - ZMIN) * (JMAX - JMIN) + JMIN;
    }
}