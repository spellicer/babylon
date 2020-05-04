import { Camera, Color3, CubeTexture, DeviceOrientationCamera, Engine, GroundMesh, Mesh, MeshBuilder, PointLight, Scene, StandardMaterial, Texture, Vector3 } from "babylonjs";
import { AdvancedDynamicTexture, Button, Control, Rectangle, TextBlock } from "babylonjs-gui";
import { Observable, Subject } from "rxjs";
import { filter, map, tap } from "rxjs/operators";
import { Sphere } from "./sphere";
import { World } from "./world";

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
    private addedMeshes$ = new Subject<IMeshDoc>();
    private ground: GroundMesh;
    toPut$ = this.addedMeshes$ as Observable<IMeshDoc>;
    toImport$ = new Subject<IMeshDoc>();
    toDelete$ = new Subject<string>();
    resize$ = new Subject<Event>();
    moveTo$ = new Subject<Position>();
    camera: Camera;
    scene: Scene;
    constructor(canvas: HTMLCanvasElement, public world: World) {
        const engine = new Engine(canvas, true);
        this.resize$.pipe(
            tap(_ => engine.resize()),
        ).subscribe();
        const scene = this.scene = this.createScene(engine);
        this.ground = this.createGround(scene);
        const camera = this.camera = this.createCamera(scene, canvas);
        this.createUI(camera);
        this.toImport$.pipe(
            filter(doc => doc && !!doc.meshes && !!doc._id),
            tap(doc => new Sphere(this, doc)),
        ).subscribe();
        this.toDelete$.pipe(
            tap(id => console.debug(`deleting ${id}`)),
            map(id => scene.getMeshByName(id)),
            filter(mesh => !!mesh),
            tap(mesh => mesh?.dispose()),
        ).subscribe();
        this.moveTo$.pipe(
            tap(position => camera.position.x = (position.coords.longitude - XMIN) / (XMAX - XMIN) * (IMAX - IMIN) + IMIN),
            tap(position => camera.position.z = (position.coords.latitude - ZMIN) / (ZMAX - ZMIN) * (JMAX - JMIN) + JMIN),
        ).subscribe();
        engine.displayLoadingUI();
        scene.executeWhenReady(() => {
            engine.hideLoadingUI();
            engine.runRenderLoop(() => {
                scene.render();
            });
        });
    }
    getHeight(position: Vector3) {
        return this.ground?.getHeightAtCoordinates(position.x, position.z) || 295;
    }
    private createCamera(scene: Scene, canvas: HTMLCanvasElement) {
        const camera = new DeviceOrientationCamera("DevOr_camera", Vector3.Zero(), scene);
        // Sets the sensitivity of the camera to movement and rotation
        camera.angularSensibility = 10;
        // Attach the camera to the canvas
        camera.attachControl(canvas, true);
        camera.onViewMatrixChangedObservable.add(() => {
            camera.position.y = (this.getHeight(camera.position) || 295) + 5;
        });
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

        return scene;
    }
    private createGround(scene: Scene) {
        const ground = MeshBuilder.CreateGroundFromHeightMap(
            "ground",
            "terrain.png",
            { width: 1024, height: 1024, subdivisions: 1024, minHeight: 230, maxHeight: 327, updatable: true },
            scene
        )
        var groundMaterial = new StandardMaterial("ground", scene);
        groundMaterial.diffuseTexture = new Texture("terrain.png", scene);
        groundMaterial.freeze();
        ground.material = groundMaterial;
        return ground;
    }
    private createUI(camera: Camera) {
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
        camera.onViewMatrixChangedObservable.add(() => {
            locationText.text = `${camera.position.x.toFixed(6)}, ${camera.position.y.toFixed(6)}, ${camera.position.z.toFixed(6)}`;
        });

        const button = Button.CreateSimpleButton("button", "sphere");
        button.width = "33%";
        button.height = "5%";
        button.top = "45%";
        button.zIndex = 10;
        button.color = "white";
        button.onPointerClickObservable.add(() => this.addedMeshes$.next(new Sphere(this, this.camera.position).doc));
        advancedTexture.addControl(button);
    }
}