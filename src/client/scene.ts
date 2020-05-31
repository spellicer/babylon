import { Engine } from "@babylonjs/core/Engines";
import { PointLight } from "@babylonjs/core/Lights";
import { StandardMaterial } from "@babylonjs/core/Materials";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { CannonJSPlugin } from "@babylonjs/core/Physics";
import "@babylonjs/core/Physics/physicsEngineComponent";
import { Scene as BabylonScene } from "@babylonjs/core/scene";

export class Scene extends BabylonScene {
    constructor(engine: Engine) {
        super(engine);
        this.collisionsEnabled = true;
        this.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin());
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
    }
    intersects(aMesh: AbstractMesh) {
        for (let mesh of this.meshes) {
            if (aMesh.id !== mesh.id && aMesh.intersectsMesh(mesh) && ["ground", "skyBox", "sun"].indexOf(mesh.id) < 0) {
                // console.log("intersections", aMesh.id, mesh.id);
                return true;
            }
        }
        return false;
    }
}