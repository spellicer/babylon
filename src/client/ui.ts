import { AdvancedDynamicTexture, Button, Control, Rectangle, TextBlock } from "@babylonjs/gui";
import { fromEventPattern, Observable, Subject } from "rxjs";

export class UI {
    inLocationText$ = new Subject<string>();
    outCreateButton$: Observable<void>;
    constructor() {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("ui1");
        const label: Rectangle = new Rectangle("location");
        label.background = "black";
        label.height = "100px";
        label.alpha = 0.5;
        label.width = "700px";
        label.cornerRadius = 20;
        label.thickness = 1;
        label.linkOffsetY = 30;
        label.top = "5%";
        label.zIndex = 5;
        label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        advancedTexture.addControl(label);

        const locationText = new TextBlock();
        locationText.fontSize = 30;
        locationText.color = "white";
        label.addControl(locationText);
        this.inLocationText$.subscribe(text => locationText.text = text);

        const createButton = Button.CreateSimpleButton("button", "sphere");
        createButton.width = "33%";
        createButton.height = "5%";
        createButton.top = "45%";
        createButton.zIndex = 10;
        createButton.color = "white";
        advancedTexture.addControl(createButton);
        this.outCreateButton$ = fromEventPattern(cb => createButton.onPointerClickObservable.add(cb));
    }
}