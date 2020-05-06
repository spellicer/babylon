import { Engine, Vector3 } from "babylonjs";
import { fromEvent, fromEventPattern } from "rxjs";
import { Workbox } from "workbox-window";
import SphereWorker from "worker-loader!./sphere.worker";
import { Camera } from "./camera";
import { Ground } from "./ground";
import { Pouch } from "./pouch";
import { IMeshDoc, Scene } from "./scene";
import { Sphere } from "./sphere";
import { UI } from "./ui";
const GEOLOCATIONOPTS = {
    enableHighAccuracy: true,
    maximumAge: 500,
    timeout: 5000,
};
const LOCALDB = "litterbug";
const REMOTEDB = `${window.location}/litterbug`;
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const resize$ = fromEvent(window, "resize");
    const watchPosition$ = fromEventPattern<Position>(cb => navigator.geolocation.watchPosition(position => cb, console.log, GEOLOCATIONOPTS));
    const pouchDB = new Pouch<IMeshDoc>(LOCALDB, REMOTEDB);
    const engine = new Engine(canvas);
    engine.displayLoadingUI();
    resize$.subscribe(_ => engine.resize());
    const scene = new Scene(engine);
    const ui = new UI();
    const ground = new Ground(scene, () => {
        Sphere.wireWorker(new SphereWorker(), ground);
        const camera = new Camera(scene, new Vector3(0, ground.getHeightAtCoordinates(0, 0) + 2 || 400, 0));
        camera.attachControl(canvas, true);
        scene.outPut$.subscribe(pouchDB.inPut$);
        pouchDB.outImport$.subscribe(scene.inImport$);
        pouchDB.outDelete$.subscribe(scene.inDelete$);
        camera.outMoved$.subscribe(ui.inLocationText$);
        camera.outCreateSphereAt$.subscribe(scene.inCreateSphereAt$);
        ui.outCreateButton$.subscribe(camera.inCreateSphere$);
        ground.outPosition$.subscribe(camera.inPosition$);
        watchPosition$.subscribe(ground.inCoords$);
        scene.executeWhenReady(() => {
            engine.hideLoadingUI();
            engine.runRenderLoop(() => {
                scene.render();
            });
        });
    });
});
if ("serviceWorker" in navigator && process.env.NODE_ENV !== "development") {
    const wb = new Workbox("/sw.js");
    wb.addEventListener("message", (event) => {
        console.debug(event);
        if (event.data.type === "CACHE_UPDATED") {
            const { updatedURL } = event.data.payload;

            console.log(`A newer version of ${updatedURL} is available!`);
        }
    });
    wb.register();
    const swVersion = wb.messageSW({ type: "SKIP_WAITING" });
    swVersion.then(message => {
        console.log("Service Worker version:", message);
    });
}