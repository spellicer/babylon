import { DeviceOrientationCamera, Vector3 } from "babylonjs";
import { fromEventPattern, Observable, Subject } from "rxjs";
import { map } from "rxjs/operators";
import { Scene } from "./scene";

export class Camera extends DeviceOrientationCamera {
    inPosition$ = new Subject<Vector3>();
    inCreateSphere$ = new Subject<void>();
    outCreateSphereAt$: Observable<Vector3>;
    outMoved$: Observable<string>;
    constructor(scene: Scene, position: Vector3) {
        super("DevOr_camera", position, scene);
        this.ellipsoid = new Vector3(1, 1, 1);
        this.checkCollisions = true;
        this.applyGravity = true;
        // Sets the sensitivity of the camera to movement and rotation
        this.angularSensibility = 1000;
        this.outCreateSphereAt$ = this.inCreateSphere$.pipe(
            map(() => this.position),
        );
        this.outMoved$ = fromEventPattern(cb => this.onViewMatrixChangedObservable.add(cb)).pipe(
            map(() => this.getPositionString()),
        );
        this.inPosition$.subscribe(position => this.position = position);
    }
    getPositionString() {
        return `${this.position.x.toFixed(6)}, ${this.position.y.toFixed(6)}, ${this.position.z.toFixed(6)}`;
    }
}