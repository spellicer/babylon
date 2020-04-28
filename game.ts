import { Color3, CubeTexture, DeviceOrientationCamera, Engine, GroundMesh, Mesh, MeshBuilder, PointLight, Scene, SceneLoader, SceneSerializer, StandardMaterial, Texture, Vector3 } from "babylonjs";
import { AdvancedDynamicTexture, Button, Control, Rectangle, TextBlock } from "babylonjs-gui";
import { Observable, Subject, Subscription } from "rxjs";
import { uuidv4 } from "./utility";

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
    addedMeshes$ = new Subject<any>();
    private x = 0;
    private z = 0;
    private engine: Engine;
    private scene: Scene;
    private ground: GroundMesh;
    private camera: DeviceOrientationCamera;
    private locationText: TextBlock;
    private button: Button;
    constructor(private canvas: HTMLCanvasElement) {
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.ground = MeshBuilder.CreateGroundFromHeightMap(
            "ground",
            "terrain.png",
            { width: 1024, height: 1024, subdivisions: 1024, minHeight: 230, maxHeight: 327, updatable: true },
            this.scene
        );
        this.locationText = new TextBlock();
        this.button = Button.CreateSimpleButton("button", "sphere");
        this.camera = new DeviceOrientationCamera("DevOr_camera", Vector3.Zero(), this.scene);
        // Sets the sensitivity of the camera to movement and rotation
        this.camera.angularSensibility = 10;
        this.createScene();
        this.createGround();
        this.createUI();
        // Attach the camera to the canvas
        this.camera.attachControl(canvas, true);
        this.scene.registerBeforeRender(() => {
            this.camera.position.y = this.ground.getHeightAtCoordinates(this.camera.position.x, this.camera.position.z) + 5 || 300;
            this.locationText.text = `${this.camera.position.x.toFixed(6)}, ${this.camera.position.y.toFixed(6)}, ${this.camera.position.z.toFixed(6)}`;
        });
        this.button.onPointerClickObservable.add(() => this.addSphere());
        this.scene.executeWhenReady(() => {
            this.engine.runRenderLoop(() => {
                this.scene.render();
            });
        });
    }
    public subscribeImportMeshDoc(toImport$: Observable<IMeshDoc>): Subscription {
        return toImport$.subscribe(doc => {
            this.importMeshDoc(doc);
        });
    }
    public subscribeDeleteMeshById(toDelete$: Observable<string>): Subscription {
        return toDelete$.subscribe(id => {
            this.deleteMeshById(id);
        });
    }
    private addSphere() {
        const material = new StandardMaterial("sphereMat", this.scene);
        material.alpha = 1;
        material.diffuseColor = new Color3(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        material.freeze();
        const id = uuidv4();
        const sphere = MeshBuilder.CreateSphere(id, { diameter: 4, segments: 32 }, this.scene);
        sphere.material = material;
        sphere.position.copyFrom(this.camera.position);
        const sphereDoc = SceneSerializer.SerializeMesh(sphere);
        sphereDoc._id = sphere.name;
        this.addedMeshes$.next(sphereDoc);
    }
    private importMeshDoc(doc: IMeshDoc) {
        if (doc.meshes) {
            SceneLoader.ImportMeshAsync(doc._id, `data:application/json,${JSON.stringify(doc)}`, "", this.scene);
        }
    }
    private deleteMeshById(id: string) {
        const mesh = this.scene.getMeshByName(id);
        if (mesh !== null) {
            console.debug(`deleting ${id}`);
            mesh.dispose();
        } else {
            console.debug(`skipping unfound deleted doc ${id}`);
        }
    }
    public resize() {
        this.engine.resize();
    }
    public moveTo(coords: Coordinates) {
        this.camera.position.x = (coords.longitude - XMIN) / (XMAX - XMIN) * (IMAX - IMIN) + IMIN;
        this.camera.position.z = (coords.latitude - ZMIN) / (ZMAX - ZMIN) * (JMAX - JMIN) + JMIN;
    }
    private createScene() {
        // Skybox
        var skybox = Mesh.CreateBox("skyBox", 800.0, this.scene);
        var skyboxMaterial = new StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture("skybox", this.scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skyboxMaterial.disableLighting = true;
        skyboxMaterial.freeze();
        skybox.material = skyboxMaterial;

        // Light
        var spot = new PointLight("spot", new Vector3(0, 400, 10), this.scene);
        spot.diffuse = new Color3(1, 1, 1);
        spot.specular = new Color3(0, 0, 0);

        //Sphere to see the light's position
        const sunMat = new StandardMaterial("sun", this.scene);
        sunMat.emissiveColor = new Color3(1, 1, 0);
        sunMat.freeze();
        const sun = Mesh.CreateSphere("sun", 10, 4, this.scene);
        sun.material = sunMat;
        sun.position = spot.position;
    }
    private createGround() {
        // Ground
        var groundMaterial = new StandardMaterial("ground", this.scene);
        groundMaterial.diffuseTexture = new Texture("terrain.png", this.scene);
        groundMaterial.freeze();
        this.ground.material = groundMaterial;
    }
    private createUI() {
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

        this.locationText.fontSize = 30;
        this.locationText.color = "white";
        label.addControl(this.locationText);

        this.button.width = "33%";
        this.button.height = "5%";
        this.button.top = "45%";
        this.button.zIndex = 10;
        this.button.color = "white";
        advancedTexture.addControl(this.button);
    }
}