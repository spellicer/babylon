import Nano from 'nano';
import { fromEvent } from 'rxjs';
import { filter, flatMap, map, reduce, take, tap } from 'rxjs/operators';
import { Readable } from 'stream';
import { MessagePort, parentPort } from 'worker_threads';
import fromStream from '../utility/fromStream';

async function openDB(dbAndGame: MessagePort, url: string, dbName: string) {
    const server = Nano(url);
    const db = server.db.use(dbName);
    const doc1 = await db.list({ include_docs: true, start_key_doc_id: '0', end_key_doc_id: '9' });
    const doc2 = await db.list({ include_docs: true, start_key_doc_id: 'a', end_key_doc_id: 'z' });
    const responses = [doc1, doc2];

    responses.forEach(docs => {
        docs.rows.forEach(doc => {
            dbAndGame.postMessage({ id: doc.id, position: (<any>doc.doc).meshes[0].position });
        });
    });
}
function streamDB(url: string, dbName: string) {
    const server = Nano(url);
    const db = server.db.use(dbName);
    return <any>db.listAsStream({ include_docs: true }) as Readable;
}
if (parentPort) {
    fromEvent<MessagePort[]>(parentPort, "message").pipe(
        map(event => event[0]),
        flatMap(gameAndDb => fromEvent(gameAndDb, "message").pipe(map(message => ({ message, gameAndDb })))),
        take(1),
        filter(event => event.message === "ready"),
        map(event => event.gameAndDb),
        flatMap(gameAndDb => fromStream<Uint8Array>(streamDB("http://magnemite11.spellicer.me", "litterbug")).pipe(map(data => ({ gameAndDb, data })))),
        reduce((acc, event) => ({ gameAndDb: event.gameAndDb, data: acc.data + event.data.toString() }), { gameAndDb: parentPort, data: "" }),
        map(event => ({ gameAndDb: event.gameAndDb, data: JSON.parse(event.data) })),
        map(event => ({ gameAndDb: event.gameAndDb, data: event.data.rows })),
        map(event => ({ gameAndDb: event.gameAndDb, data: event.data.filter((row: any) => row.doc?.meshes?.length > 0) })),
        map(event => ({ gameAndDb: event.gameAndDb, data: event.data.map((row: any) => ({ id: row.id, position: row.doc.meshes[0].position, color: row.doc.materials[0].diffuse })) })),
        tap(event => event.data.forEach((data: any) => event.gameAndDb.postMessage(data))),
    ).subscribe();
}
