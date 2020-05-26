import { SphereEngine } from "./sphere.engine";

const ctx: Worker = self as any;
SphereEngine.startWorker(ctx);
