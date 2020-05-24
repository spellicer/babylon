import { Sphere } from "./sphere";

const ctx: Worker = self as any;
Sphere.startWorker(ctx);
