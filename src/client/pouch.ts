import { fromEvent, Observable, partition, Subject } from 'rxjs';
import { map, share, tap } from 'rxjs/operators';
export class Pouch<T> {
    private replication: WebSocket;
    outImport$: Observable<T>;
    outDelete$: Observable<string>;
    inPut$ = new Subject<T>();
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
        [this.outImport$, this.outDelete$] = partition(replicationChanges$, data => typeof (data) !== "string");
        this.inPut$.pipe(
            tap(doc => this.replication.send(JSON.stringify(doc))),
        ).subscribe();
        fromEvent(this.replication, "open").pipe(
            tap(() => this.replication.send("hey")),
        ).subscribe();
    }
}