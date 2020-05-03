import { Camera, Color3, CubeTexture, DeviceOrientationCamera, Engine, Mesh, MeshBuilder, PointLight, Scene, SceneLoader, SceneSerializer, StandardMaterial, Texture, Vector3, AbstractMesh } from "babylonjs";
import { AdvancedDynamicTexture, Button, Control, Rectangle, TextBlock } from "babylonjs-gui";
import { Observable, Subject, from, fromEvent } from "rxjs";
import { filter, map, tap, flatMap } from "rxjs/operators";
import World from "worker-loader!./world";
import { uuidv4 } from "./utility";
import { ISphereData } from "./world";

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
export class Game {
    private world: World;
    private addedMeshes$ = new Subject<IMeshDoc>();
    toPut$ = this.addedMeshes$ as Observable<IMeshDoc>;
    toImport$ = new Subject<IMeshDoc>();
    toDelete$ = new Subject<string>();
    resize$ = new Subject<Event>();
    moveTo$ = new Subject<Coordinates>();
    constructor(private canvas: HTMLCanvasElement) {
        this.world = new World();
        const engine = new Engine(canvas, true);
        const scene = this.createScene(engine);
        const ground = this.createGround(scene);
        const camera = this.createCamera(scene, canvas);
        const locationText = this.createUI(scene, camera);
        scene.registerBeforeRender(() => {
            camera.position.y = ground.getHeightAtCoordinates(camera.position.x, camera.position.z) + 5 || 300;
            locationText.text = `${camera.position.x.toFixed(6)}, ${camera.position.y.toFixed(6)}, ${camera.position.z.toFixed(6)}`;
        });
        fromEvent<MessageEvent>(this.world, "message").pipe(
            map(event => event.data),
            map((data: ISphereData) => <[AbstractMesh, Vector3]>[scene.getMeshByID(data.id), data.position]),
            tap(([sphere, position]) => position.y = ground.getHeightAtCoordinates(position.x, position.z) + 5),
            tap(([sphere, position]) => sphere.position.copyFrom(position)),
        ).subscribe();
        this.toImport$.pipe(
            filter(doc => doc && !!doc.meshes && !!doc._id),
            flatMap(doc => from(SceneLoader.ImportMeshAsync(doc._id, `data:application/json,${JSON.stringify(doc)}`, "", scene, undefined, ".babylon"))),
            filter(importmesh => importmesh && importmesh.meshes && importmesh.meshes.length > 0),
            map(importmesh => importmesh.meshes[0]),
            tap(mesh => this.wireSphere(mesh)),
        ).subscribe();
        this.toDelete$.pipe(
            tap(id => console.debug(`deleting ${id}`)),
            map(id => scene.getMeshByName(id)),
            filter(mesh => !!mesh),
            tap(mesh => mesh?.dispose()),
        ).subscribe();
        this.resize$.pipe(
            tap(_ => engine.resize()),
        ).subscribe();
        this.moveTo$.pipe(
            tap(coords => camera.position.x = (coords.longitude - XMIN) / (XMAX - XMIN) * (IMAX - IMIN) + IMIN),
            tap(coords => camera.position.z = (coords.latitude - ZMIN) / (ZMAX - ZMIN) * (JMAX - JMIN) + JMIN),
        ).subscribe();
    }
    private wireSphere(sphere: AbstractMesh) {
        this.world.postMessage({
            id: sphere.id,
            position: sphere.position,
        });
    }
    private addSphere(scene: Scene, camera: Camera) {
        const material = new StandardMaterial("sphereMat", scene);
        material.alpha = 1;
        material.diffuseColor = new Color3(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        material.freeze();
        const id = uuidv4();
        const sphere = MeshBuilder.CreateSphere(id, { diameter: 4, segments: 32 }, scene);
        sphere.material = material;
        sphere.position.copyFrom(camera.position);
        this.wireSphere(sphere);
        const sphereDoc = SceneSerializer.SerializeMesh(sphere);
        sphereDoc._id = sphere.name;
        this.addedMeshes$.next(sphereDoc);
    }
    private createCamera(scene: Scene, canvas: HTMLCanvasElement) {
        const camera = new DeviceOrientationCamera("DevOr_camera", Vector3.Zero(), scene);
        // Sets the sensitivity of the camera to movement and rotation
        camera.angularSensibility = 10;
        // Attach the camera to the canvas
        camera.attachControl(canvas, true);
        return camera;
    }
    private createScene(engine: Engine) {
        const scene = new Scene(engine);
        // Skybox
        const skybox = Mesh.CreateBox("skyBox", 800.0, scene);
        const skyboxMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture("skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skyboxMaterial.disableLighting = true;
        skyboxMaterial.freeze();
        skybox.material = skyboxMaterial;

        // Light
        var spot = new PointLight("spot", new Vector3(0, 400, 10), scene);
        spot.diffuse = new Color3(1, 1, 1);
        spot.specular = new Color3(0, 0, 0);

        //Sphere to see the light's position
        const sunMat = new StandardMaterial("sun", scene);
        sunMat.emissiveColor = new Color3(1, 1, 0);
        sunMat.freeze();
        const sun = Mesh.CreateSphere("sun", 10, 4, scene);
        sun.material = sunMat;
        sun.position = spot.position;

        scene.executeWhenReady(() => {
            engine.runRenderLoop(() => {
                scene.render();
            });
        });
        return scene;
    }
    private createGround(scene: Scene) {
        const ground = MeshBuilder.CreateGroundFromHeightMap(
            "ground",
            "terrain.png",
            { width: 1024, height: 1024, subdivisions: 1024, minHeight: 230, maxHeight: 327, updatable: true },
            scene
        )
        // Ground
        var groundMaterial = new StandardMaterial("ground", scene);
        groundMaterial.diffuseTexture = new Texture("terrain.png", scene);
        groundMaterial.freeze();
        ground.material = groundMaterial;
        return ground;
    }
    private createUI(scene: Scene, camera: Camera) {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("ui1");
        const label: Rectangle = new Rectangle("location");
        label.background = "black";
        label.height = "100px";
        label.alpha = 0.5;
        label.width = "700px";
        label.cornerRadius = 20;
        label.thickness = 1;
        label.linkOffsetY = 30;
        label.top = "5%";
        label.zIndex = 5;
        label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        advancedTexture.addControl(label);

        const locationText = new TextBlock();
        locationText.fontSize = 30;
        locationText.color = "white";
        label.addControl(locationText);

        const button = Button.CreateSimpleButton("button", "sphere");
        button.width = "33%";
        button.height = "5%";
        button.top = "45%";
        button.zIndex = 10;
        button.color = "white";
        button.onPointerClickObservable.add(() => this.addSphere(scene, camera));
        advancedTexture.addControl(button);

        return locationText;
    }
}