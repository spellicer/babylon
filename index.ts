import { bindCallback, fromEvent } from "rxjs";
import { Workbox } from "workbox-window";
import { Game, IMeshDoc } from "./game";
import { Pouch } from "./pouch";
import { World } from "./world";
const LOCALDB = "litterbug";
const REMOTEDB = `${window.location}/litterbug`;
window.addEventListener("DOMContentLoaded", () => {
    const world = new World();
    const game = new Game(<HTMLCanvasElement>document.getElementById("renderCanvas"));
    const pouchDB = new Pouch<IMeshDoc>(LOCALDB, REMOTEDB);
    const resize$ = fromEvent(window, "resize");
    const watchPosition$ = bindCallback((cb: PositionCallback) => {
        navigator.geolocation.watchPosition(cb, undefined, {
            enableHighAccuracy: true,
            maximumAge: 500
        });
    })();
    pouchDB.outImport$.subscribe(game.inImport$);
    pouchDB.outDelete$.subscribe(game.inDelete$);
    game.outPut$.subscribe(pouchDB.inPut$);
    game.outRegister$.subscribe(world.inRegister$);
    resize$.subscribe(game.inResize$);
    watchPosition$.subscribe(game.inMoveTo$);
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