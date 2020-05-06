import PouchDB from 'pouchdb';
import { concat, from, fromEvent, merge, Observable, partition, Subject } from 'rxjs';
import { concatAll, filter, flatMap, map, pluck, tap } from 'rxjs/operators';
export class Pouch<T> {
    private localDB: PouchDB.Database<T>;
    private replication: PouchDB.Replication.Sync<T>;
    outImport$: Observable<T>;
    outDelete$: Observable<string>;
    inPut$ = new Subject<T>();
    constructor(localDB: string, remoteDB: string) {
        this.localDB = new PouchDB(localDB);
        this.replication = this.localDB.sync(remoteDB, {
            live: true,
            retry: true
        });
        const replicationChanges$ = fromEvent<PouchDB.Replication.SyncResult<T>>(this.replication, "change");
        const remoteDoc$ = replicationChanges$.pipe(
            filter(event => event.direction === "pull"),
            pluck("change", "docs"),
            map(docs => docs.filter(doc => !doc._id.startsWith("_design"))),
            concatAll(),
        );
        const [remoteImports$, remoteDeletes$] = partition(
            remoteDoc$,
            doc => !(<any>doc)._deleted
        );
        const localDoc$ = from(this.localDB.allDocs()).pipe(
            pluck("rows"),
            map(docs => docs.filter(doc => !doc.id.startsWith("_design"))),
            map(rows => rows.map(row => row.id).map(id => this.localDB.get(id))),
            flatMap(fetches => merge(...fetches)),
        );
        this.outImport$ = concat(localDoc$, remoteImports$);
        this.outDelete$ = remoteDeletes$.pipe(pluck("_id"));
        this.inPut$.pipe(
            tap(doc => this.localDB.put(doc)),
        ).subscribe();
    }
}