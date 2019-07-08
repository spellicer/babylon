import { Color3, CubeTexture, DeviceOrientationCamera, Engine, Mesh, MeshBuilder, PointLight, Scene, StandardMaterial, Texture, Vector3, Material, SceneLoader } from "babylonjs";
import { AdvancedDynamicTexture, Control, Rectangle, TextBlock, Button } from "babylonjs-gui";
import "babylonjs-loaders";
let advancedTexture: AdvancedDynamicTexture;
const IMIN = -512;
const IMAX = 512;
const JMIN = -512;
const JMAX = 512;
const XMAX = -84.2873442391304;
const XMIN = -84.3743007608696;
const ZMAX = 33.7710719608696;
const ZMIN = 33.6841154391304;
const canvas = <HTMLCanvasElement>document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);
let camera: DeviceOrientationCamera;
function createScene(): Scene {
    var scene = new Scene(engine);

    advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("ui1");
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
    advancedTexture.addControl(button);

    // Ground
    var groundMaterial = new StandardMaterial("ground", scene);
    groundMaterial.diffuseTexture = new Texture("terrain.png", scene);

    const ground = Mesh.CreateGroundFromHeightMap("ground", "terrain.png", 1024, 1024, 1024, 230, 327, scene, false);
    ground.material = groundMaterial;

    // Parameters : name, position, scene
    camera = new DeviceOrientationCamera("DevOr_camera", Vector3.Zero(), scene);

    // Sets the sensitivity of the camera to movement and rotation
    camera.angularSensibility = 10;

    // Attach the camera to the canvas
    camera.attachControl(canvas, true);

    button.onPointerClickObservable.add(() => {
        const material = new StandardMaterial("sphereMat", scene);
        material.alpha = 1;
        material.diffuseColor = new Color3(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 4, segments: 32 }, scene);
        sphere.material = material;
        sphere.position.copyFrom(camera.position);
    });

    // Skybox
    var skybox = Mesh.CreateBox("skyBox", 800.0, scene);
    var skyboxMaterial = new StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new CubeTexture("skybox", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxMaterial.specularColor = new Color3(0, 0, 0);
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;

    // Light
    var spot = new PointLight("spot", new Vector3(0, 400, 10), scene);
    spot.diffuse = new Color3(1, 1, 1);
    spot.specular = new Color3(0, 0, 0);

    //Sphere to see the light's position
    const sunMat = new StandardMaterial("sun", scene);
    sunMat.emissiveColor = new Color3(1, 1, 0);
    const sun = Mesh.CreateSphere("sun", 10, 4, scene);
    sun.material = sunMat;
    sun.position = spot.position;

    scene.registerBeforeRender(function () {
        camera.position.y = ground.getHeightAtCoordinates(camera.position.x, camera.position.z) + 5 || 300;
        locationText.text = `${camera.position.x.toFixed(6)}, ${camera.position.y.toFixed(6)}, ${camera.position.z.toFixed(6)}`;
        const mesh = scene.getMeshByName("__root__");
        if(mesh !== null) {
            mesh.position.y = ground.getHeightAtCoordinates(mesh.position.x, mesh.position.z) + 2;
        }
    });
    SceneLoader.ImportMesh(["root"], "litterbug/eb6955c383465998397b08af01000e0e/", "scene.glb", scene);
    return scene;
}
const scene = createScene();
scene.executeWhenReady(() => {
    navigator.geolocation.watchPosition(
        moveTo => {
            camera.position.x = (moveTo.coords.longitude - XMIN) / (XMAX - XMIN) * (IMAX - IMIN) + IMIN;
            camera.position.z = (moveTo.coords.latitude - ZMIN) / (ZMAX - ZMIN) * (JMAX - JMIN) + JMIN;
        },
        undefined,
        {
            enableHighAccuracy: true,
            maximumAge: 500
        });
});
engine.runRenderLoop(() => {
    scene.render();
});