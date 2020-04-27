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
    wb.addEventListener('controlling', (event) => {
        console.log(event);
        const message = new MessageChannel();
        message.port1.onmessage = (event) => {
            console.log(event);
        }
        wb.messageSW(message);
    });
    wb.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_UPDATED') {
            const { updatedURL } = event.data.payload;

            console.log(`A newer version of ${updatedURL} is available!`);
        }
    });
    wb.register();
    const swVersion = wb.messageSW({ type: 'GET_VERSION' });
    swVersion.then(message => {
        console.log('Service Worker version:', message);
    });
}