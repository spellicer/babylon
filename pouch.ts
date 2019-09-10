import PouchDB from 'pouchdb';
import { concat, from, fromEvent, merge, Observable, partition, Subscription } from 'rxjs';
import { concatAll, filter, flatMap, map, pluck } from 'rxjs/operators';
export class Pouch<T> {
    toImport$: Observable<T>;
    toDelete$: Observable<string>;
    private localDB: PouchDB.Database<T>;
    private replication: PouchDB.Replication.Sync<T>;
    constructor(localDB: string, remoteDB: string) {
        this.localDB = new PouchDB(localDB);
        this.replication = this.localDB.sync(remoteDB, {
            live: true,
            retry: true
        });
        const replicationChanges$ = <Observable<PouchDB.Replication.SyncResult<T>>>fromEvent(this.replication, "change");
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
        this.toImport$ = concat(localDoc$, remoteImports$);
        this.toDelete$ = remoteDeletes$.pipe(pluck("id"));
    }
    subscribe(toPut$: Observable<T>): Subscription {
        return toPut$.subscribe(doc => {
            this.localDB.put(doc);
        });
    }
}