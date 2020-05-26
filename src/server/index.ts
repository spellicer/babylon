import express from 'express';
import proxy from 'express-http-proxy';
import expressWs from 'express-ws';
import { fromEvent } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { MessageChannel, Worker } from 'worker_threads';

const dbWorker = new Worker('./dist/server/db.worker.js');
const gameWorker = new Worker('./dist/server/game.worker.js');
const { port1, port2 } = new MessageChannel();
dbWorker.postMessage([port1], [port1]);
gameWorker.postMessage([port2], [port2]);
const gameReplay$ = fromEvent(gameWorker, "message").pipe(
    shareReplay(),
);
gameReplay$.subscribe();
const app = expressWs(express()).app;
//serve static files, 'public/index.html' will be served as '/'
app.use(express.static('dist/client'));
app.use('/litterbug', proxy('http://magnemite11.spellicer.me'));
// websocket handler
app.ws('/websocket', function (ws, req) {
    ws.on("message", msg => {
        gameReplay$.pipe(tap(console.log)).subscribe(sphere => ws.send(JSON.stringify(sphere)));
    });
    ws.on('error', function (msg) {
        console.error(msg);
    });
});

app.listen(9090);