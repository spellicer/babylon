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
    const wb = new Workbox('/sw.js');
    wb.addEventListener('message', (event) => {
        console.debug(event);
        if (event.data.type === 'CACHE_UPDATED') {
            const { updatedURL } = event.data.payload;

            console.log(`A newer version of ${updatedURL} is available!`);
        }
    });
    wb.register();
    const swVersion = wb.messageSW({ type: 'SKIP_WAITING' });
    swVersion.then(message => {
        console.log('Service Worker version:', message);
    });
}