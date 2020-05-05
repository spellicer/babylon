import { Engine } from "babylonjs";
import { fromEvent, fromEventPattern } from "rxjs";
import { Workbox } from "workbox-window";
import SphereWorker from "worker-loader!./sphere.worker";
import { Camera } from "./camera";
import { Pouch } from "./pouch";
import { IMeshDoc, Scene } from "./scene";
import { Sphere } from "./sphere";
import { UI } from "./ui";
const LOCALDB = "litterbug";
const REMOTEDB = `${window.location}/litterbug`;
window.addEventListener("DOMContentLoaded", () => {
    Sphere.wireWorker(new SphereWorker());
    const resize$ = fromEvent(window, "resize");
    const pouchDB = new Pouch<IMeshDoc>(LOCALDB, REMOTEDB);
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const engine = new Engine(canvas);
    const scene = new Scene(engine);
    const ui = new UI();
    const camera = new Camera(scene);
    // Attach the camera to the canvas
    camera.attachControl(canvas, false);
    const watchPosition$ = fromEventPattern<Position>(cb => {
        navigator.geolocation.watchPosition(cb, undefined, {
            enableHighAccuracy: true,
            maximumAge: 500
        });
    });
    resize$.subscribe(_ => engine.resize());
    pouchDB.outImport$.subscribe(scene.inImport$);
    pouchDB.outDelete$.subscribe(scene.inDelete$);
    scene.outPut$.subscribe(pouchDB.inPut$);
    camera.outMoved$.subscribe(ui.inLocationText$);
    watchPosition$.subscribe(camera.inMoveTo$);
    ui.outCreateButton$.subscribe(camera.inCreateSphere$);
    camera.outCreateSphereAt$.subscribe(scene.inCreateSphereAt$);
    engine.displayLoadingUI();
    scene.executeWhenReady(() => {
        engine.hideLoadingUI();
        engine.runRenderLoop(() => {
            scene.render();
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