import { fromEvent, Observable, partition, Subject, merge } from 'rxjs';
import { map, share, tap } from 'rxjs/operators';
export class WebSocketAdapter {
    private replication: WebSocket;
    outEvent$: Observable<void>;
    outObject$: Observable<any>;
    outString$: Observable<string>;
    inObject$ = new Subject<any>();
    inString$ = new Subject<string>();
    constructor(url: string) {
        this.replication = new WebSocket(url);
        const replicationChanges$ = fromEvent(this.replication, "message").pipe(
            map(event => {
                try {
                    return JSON.parse((event as any).data);
                } catch (e) {
                    return (event as any).data;
                }
            }),
            share(),
        );
        [this.outObject$, this.outString$] = partition(replicationChanges$, data => typeof (data) !== "string");
        this.outEvent$ = fromEvent(this.replication, "open").pipe(
            map(() => { }),
        );
        merge(
            this.inObject$.pipe(
                tap(doc => this.replication.send(JSON.stringify(doc))),
            ),
            this.inString$.pipe(
                tap(doc => this.replication.send(doc)),
            )
        ).subscribe();
    }
}