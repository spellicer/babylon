import { Engine } from "@babylonjs/core/Engines";
import "@babylonjs/core/Loading/loadingScreen";
import { fromEvent, fromEventPattern } from "rxjs";
import { Workbox } from "workbox-window";
import SphereWorker from "worker-loader!./sphere.worker";
import { ISphereData } from "./sphere";
import { Camera } from "./camera";
import { Ground } from "./ground";
import { WebSocketAdapter } from "./web.socket.adapter";
import { Scene } from "./scene";
import { SphereEngine } from "./sphere.engine";
import { UI } from "./ui";
const GEOLOCATIONOPTS = {
    enableHighAccuracy: true,
    maximumAge: 500,
    timeout: 5000,
};
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const resize$ = fromEvent(window, "resize");
    const watchPosition$ = fromEventPattern<Position>(cb => navigator.geolocation.watchPosition(cb, console.log, GEOLOCATIONOPTS));
    SphereEngine.wireWorker(new SphereWorker());
    const engine = new Engine(canvas);
    engine.displayLoadingUI();
    resize$.subscribe(_ => engine.resize());
    const scene = new Scene(engine);
    const ui = new UI();
    const ground = new Ground(scene, () => {
        const camera = new Camera(scene, position => ground.getHeightAtCoordinates(position.x, position.z));
        camera.attachControl(canvas, true);
        const pouchDB = new WebSocketAdapter<ISphereData>(`ws://${window.location.hostname}:${window.location.port}/websocket`);
        const sphereEngine = new SphereEngine(scene, ground);
        sphereEngine.outPut$.subscribe(pouchDB.inPut$);
        pouchDB.outImport$.subscribe(sphereEngine.inImport$);
        pouchDB.outDelete$.subscribe(sphereEngine.inDelete$);
        camera.outMoved$.subscribe(ui.inLocationText$);
        camera.outCreateSphereAt$.subscribe(sphereEngine.inCreateSphereAt$);
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