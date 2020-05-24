import { DeviceOrientationCamera, Vector3 } from "babylonjs";
import { fromEventPattern, Observable, Subject } from "rxjs";
import { map, tap } from "rxjs/operators";
import { Scene } from "./scene";

export class Camera extends DeviceOrientationCamera {
    inPosition$ = new Subject<Vector3>();
    inCreateSphere$ = new Subject<void>();
    outCreateSphereAt$: Observable<Vector3>;
    outMoved$: Observable<string>;
    constructor(scene: Scene, groundFinder: (position: Vector3) => number) {
        super("DevOr_camera", Vector3.Zero(), scene);
        this.angularSensibility = 1000;
        this.outCreateSphereAt$ = this.inCreateSphere$.pipe(
            map(() => this.position),
        );
        this.outMoved$ = fromEventPattern(cb => scene.onBeforeCameraRenderObservable.add(cb)).pipe(
            map(() => this.position),
            tap(position => position.y = groundFinder(position) + 2),
            map(() => this.getPositionString()),
        );
        this.inPosition$.pipe(
            tap(position => position.y = groundFinder(position) + 2),
            tap(position => this.position = position),
        ).subscribe(position => this.position = position);
    }
    getPositionString() {
        return `${this.position.x.toFixed(6)}, ${this.position.y.toFixed(6)}, ${this.position.z.toFixed(6)}`;
    }
}