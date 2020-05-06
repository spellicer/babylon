import { CanvasGenerator, Color3, GroundMesh, StandardMaterial, Texture, Tools, VertexData, Vector3 } from "babylonjs";
import { Scene } from "./scene";
import { Subject, Observable } from "rxjs";
import { map, pluck, tap } from "rxjs/operators";
const IMIN = -512;
const IMAX = 512;
const JMIN = -512;
const JMAX = 512;
const XMAX = -84.2873442391304;
const XMIN = -84.3743007608696;
const ZMAX = 33.7710719608696;
const ZMIN = 33.6841154391304;
export class Ground extends GroundMesh {
    inCoords$ = new Subject<Position>();
    outPosition$: Observable<Vector3>;
    constructor(scene: Scene, onready: () => void) {
        super("ground", scene);
        const url = "terrain.png";
        const width = 1024;
        const height = 1024;
        const subdivisions = 512;
        const minHeight = 230;
        const maxHeight = 250 || 327;
        const updatable = false;
        const colorFilter = new Color3(0.5, 0.5, 0.5) || new Color3(0.3, 0.59, 0.11);
        this._subdivisionsX = subdivisions;
        this._subdivisionsY = subdivisions;
        this._width = width;
        this._height = height;
        this._maxX = this._width / 2.0;
        this._maxZ = this._height / 2.0;
        this._minX = -this._maxX;
        this._minZ = -this._maxZ;
        this.checkCollisions = true;

        this._setReady(false);
        const material = new StandardMaterial(this.name, scene);
        material.alpha = 1;
        material.diffuseColor = Color3.Gray();
        material.freeze();
        this.material = material;
        Tools.LoadImage(
            url,
            (img: HTMLImageElement | ImageBitmap) => {
                const bufferWidth = img.width;
                const bufferHeight = img.height;

                // Getting height map data
                const canvas = CanvasGenerator.CreateCanvas(bufferWidth, bufferHeight);
                const context = canvas.getContext("2d");
                if (context) {
                    context.drawImage(img, 0, 0);
                    // Create VertexData from map data
                    // Cast is due to wrong definition in lib.d.ts from ts 1.3 - https://github.com/Microsoft/TypeScript/issues/949
                    var buffer = <Uint8Array>(<any>context.getImageData(0, 0, bufferWidth, bufferHeight).data);
                    var vertexData = VertexData.CreateGroundFromHeightMap({
                        width: width, height: height,
                        subdivisions: subdivisions,
                        minHeight: minHeight, maxHeight: maxHeight, colorFilter: colorFilter,
                        buffer: buffer, bufferWidth: bufferWidth, bufferHeight: bufferHeight,
                        alphaFilter: 0.0
                    });
                    vertexData.applyToMesh(this, updatable);
                }
                console.log("Ground ready");
                this._setReady(true);
                onready();
            },
            () => { },
            scene.offlineProvider
        );
        this.outPosition$ = this.inCoords$.pipe(
            pluck("coords"),
            map(coords => [this.getXFromLongitude(coords.longitude), this.getYFromLatitude(coords.latitude)]),
            map(([x, y]) => new Vector3(x, this.getHeightAtCoordinates(x, y) + 2 || 400, y)),
            tap(console.log),
        );
    }
    private getXFromLongitude(longitude: number) {
        return (longitude - XMIN) / (XMAX - XMIN) * (IMAX - IMIN) + IMIN;
    }
    private getYFromLatitude(latitude: number) {
        return (latitude - ZMIN) / (ZMAX - ZMIN) * (JMAX - JMIN) + JMIN;
    }
}