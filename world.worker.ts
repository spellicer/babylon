import { Vector3 } from "babylonjs";
import { Sphere } from "./sphere";

const ctx: Worker = self as any;
const sphereMap = new Map<string, Vector3>();

ctx.addEventListener("message", event => {
    sphereMap.set(event.data.id, event.data.position);
});

setInterval(() => {
    sphereMap.forEach((value, key, map) => {
        Sphere.moveAction(value);
        ctx.postMessage({ id: key, position: value });
    });
}, 1000);