import { fromEvent } from "rxjs";
import { tap, map } from "rxjs/operators";
import { Vector3 } from "babylonjs";

const ctx: Worker = self as any;

export interface ISphereData {
    id: string;
    position: Vector3;
}
const spheres: ISphereData[] = [];

// Respond to message from parent thread
fromEvent<MessageEvent>(ctx, "message").pipe(
    map(event => event.data),
    tap(data => spheres.push(data)),
).subscribe();

setInterval(() => {
    spheres.forEach(sphere => {
        sphere.position.x++;
        sphere.position.z++;
        ctx.postMessage(sphere);
    })
}, 1000);