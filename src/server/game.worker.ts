import { fromEvent } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { MessagePort, parentPort } from 'worker_threads';

const gameObjects = [] as any[];
function addObject(sphere: any) {
    const distances = gameObjects
        .map(object => Math.sqrt(Math.pow(sphere.position[0] - object.position[0], 2) + Math.pow(sphere.position[2] - object.position[2], 2)))
        .filter(dist => dist <= 2);
    if(distances.length === 0) {
        gameObjects.push(sphere);
        parentPort?.postMessage(sphere);
    }
}

if (parentPort) {
    fromEvent<MessagePort[]>(parentPort, "message").pipe(
        map(event => event[0]),
        tap(gameAndDb => gameAndDb.postMessage("ready")),
        switchMap(gameAndDb => fromEvent<any>(gameAndDb, "message")),
        tap(addObject),
    ).subscribe();
}

