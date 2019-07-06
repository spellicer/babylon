import { AbstractMesh, ArcRotateCamera, Color3, CubeTexture, Engine, Mesh, PointLight, Scene, StandardMaterial, Texture, Vector3, MeshBuilder, DeviceOrientationCamera } from "babylonjs";
import { AdvancedDynamicTexture, Control, Rectangle, TextBlock } from "babylonjs-gui";
let advancedTexture: AdvancedDynamicTexture;
// const location = new Vector3(-84.3308225, 0, 33.7275937);
const location = new Vector3(0, 0, 0);
function init(): void {
    if (!advancedTexture) {
        advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("ui1");
    }
}
function addLocationToMesh(mesh: AbstractMesh): TextBlock {
    if (!advancedTexture) {
        init();
    }
    let label: Rectangle = new Rectangle("location for " + mesh.name);
    label.background = "black";
    label.height = "100px";
    label.alpha = 0.5;
    label.width = "700px";
    label.cornerRadius = 20;
    label.thickness = 1;
    label.linkOffsetY = 30;
    label.top = "20%";
    label.zIndex = 5;
    label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(label);

    const text = new TextBlock();
    text.fontSize = 30;
    text.color = "white";
    label.addControl(text);
    return text;
}
function addLabelToMesh(mesh: AbstractMesh): TextBlock {
    if (!advancedTexture) {
        init();
    }
    let label: Rectangle = new Rectangle("label for " + mesh.name);
    label.background = "black";
    label.height = "100px";
    label.alpha = 0.5;
    label.width = "400px";
    label.cornerRadius = 20;
    label.thickness = 1;
    label.linkOffsetY = 30;
    label.top = "10%";
    label.zIndex = 5;
    label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(label);

    const text = new TextBlock();
    text.fontSize = 30;
    text.color = "white";
    label.addControl(text);
    return text;
}
const canvas = <HTMLCanvasElement>document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);
function createScene(): Scene {
    var scene = new Scene(engine);

    // Ground
    var groundMaterial = new StandardMaterial("ground", scene);
    groundMaterial.diffuseTexture = new Texture("textures/terrain.png", scene);

    var ground = Mesh.CreateGroundFromHeightMap("ground", "textures/terrain.png", 1024, 1024, 1024, 230, 327, scene, false);
    ground.material = groundMaterial;

    const IMIN = -512;
    const IMAX = 512;
    const JMIN = -512;
    const JMAX = 512;
    const XMAX = -84.2873442391304;
    const XMIN = -84.3743007608696;
    const ZMAX = 33.7710719608696;
    const ZMIN = 33.6841154391304;
    const position = new Vector3();

    const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 1, segments: 32 }, scene);
    const labelText = addLabelToMesh(sphere);
    const locationText = addLocationToMesh(sphere);

    // Parameters : name, position, scene
    var camera = new DeviceOrientationCamera("DevOr_camera", sphere.position, scene);

    // Sets the sensitivity of the camera to movement and rotation
    camera.angularSensibility = 10;

    // Attach the camera to the canvas
    camera.attachControl(canvas, true);

    // Skybox
    var skybox = Mesh.CreateBox("skyBox", 800.0, scene);
    var skyboxMaterial = new StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new CubeTexture("textures/skybox", scene);
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
        position.x = (location.x - XMIN)/(XMAX-XMIN)*(IMAX-IMIN)+IMIN;
        position.z = (location.z - ZMIN)/(ZMAX-ZMIN)*(JMAX-JMIN)+JMIN;
        position.y = location.y = ground.getHeightAtCoordinates(position.x, position.z)+5;
        locationText.text = `${position.x.toFixed(6)}, ${position.y.toFixed(6)}, ${position.z.toFixed(6)}`;
        sphere.position = position;
        camera.position = sphere.position;
    });
    return scene;
}
setInterval(()=> {
    navigator.geolocation.getCurrentPosition(position=> {
        location.x = position.coords.longitude;
        location.z = position.coords.latitude;
    })
}, 1000);
const scene = createScene();
engine.runRenderLoop(() => {
    scene.render();
});