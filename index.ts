import { bindCallback, fromEvent } from "rxjs";
import { map, tap } from "rxjs/operators";
import { Workbox } from "workbox-window";
import { Game, IMeshDoc } from "./game";
import { Pouch } from "./pouch";
const LOCALDB = "litterbug";
const REMOTEDB = `${window.location}/litterbug`;
window.addEventListener("DOMContentLoaded", () => {
    const game = new Game(<HTMLCanvasElement>document.getElementById("renderCanvas"));
    const pouchDB = new Pouch<IMeshDoc>(LOCALDB, REMOTEDB);
    const resize$ = fromEvent(window, "resize");
    const watchPosition$ = bindCallback((cb: PositionCallback) => {
        navigator.geolocation.watchPosition(cb, undefined, {
            enableHighAccuracy: true,
            maximumAge: 500
        });
    })().pipe(
        tap(console.log),
        map(position => position.coords),
    );
    pouchDB.toImport$.subscribe(game.toImport$);
    pouchDB.toDelete$.subscribe(game.toDelete$);
    game.toPut$.subscribe(pouchDB.toPut$);
    resize$.subscribe(game.resize$);
    watchPosition$.subscribe(game.moveTo$);
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