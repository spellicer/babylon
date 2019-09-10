import { Workbox } from "workbox-window";
import { Game, IMeshDoc } from "./game";
import { Pouch } from './pouch';
const LOCALDB = "litterbug";
const REMOTEDB = `${window.location}/litterbug`;
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game(<HTMLCanvasElement>document.getElementById("renderCanvas"));
    const pouchDB = new Pouch<IMeshDoc>(LOCALDB, REMOTEDB);
    game.subscribeImportMeshDoc(pouchDB.toImport$);
    game.subscribeDeleteMeshById(pouchDB.toDelete$);
    pouchDB.subscribe(game.addedMeshes$);
    navigator.geolocation.watchPosition(
        moveTo => {
            game.moveTo(moveTo.coords);
        },
        undefined,
        {
            enableHighAccuracy: true,
            maximumAge: 500
        }
    );
    window.addEventListener('resize', () => {
        game.resize();
    });
});

if ('serviceWorker' in navigator) {
    console.log('registering service worker');
    const wb = new Workbox("./sw.js");
    wb.addEventListener("message", (event) => {
        console.log(event);
    });
    wb.addEventListener('activated', (event) => {
        console.log("Service worker activated");
    });
    wb.register()
        .then(() => {
            console.log('Service worker registered!');
        })
        .catch((err) => {
            console.log(err);
        });
    wb.messageSW("a message").then(console.log);
}