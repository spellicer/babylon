import { DeviceOrientationCamera, Vector3 } from "babylonjs";
import { fromEventPattern, Observable, Subject } from "rxjs";
import { map, pluck, tap } from "rxjs/operators";
import { Scene } from "./scene";

export class Camera extends DeviceOrientationCamera {
    inMoveTo$ = new Subject<Position>();
    inCreateSphere$ = new Subject<void>();
    outCreateSphereAt$: Observable<Vector3>;
    outMoved$: Observable<string>;
    constructor(scene: Scene) {
        super("DevOr_camera", Vector3.Zero(), scene);
        // Sets the sensitivity of the camera to movement and rotation
        this.angularSensibility = 10;
        this.outCreateSphereAt$ = this.inCreateSphere$.pipe(
            map(() => this.position),
        );
        this.outMoved$ = fromEventPattern(cb => this.onViewMatrixChangedObservable.add(cb)).pipe(
            tap(() => this.position.y = scene.getHeightAtCoordinates(this.position) + 5),
            map(() => this.getPositionString()),
        );
        this.inMoveTo$.pipe(
            pluck("coords"),
            tap(coords => this.position.x = scene.getXFromLongitude(coords.longitude)),
            tap(coords => this.position.z = scene.getYFromLatitude(coords.latitude)),
        ).subscribe();
    }
    getPositionString() {
        return `${this.position.x.toFixed(6)}, ${this.position.y.toFixed(6)}, ${this.position.z.toFixed(6)}`;
    }
}