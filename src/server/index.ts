import express from 'express';
import expressWs from 'express-ws';
import proxy from 'express-http-proxy';
const app = expressWs(express()).app;
//serve static files, 'public/index.html' will be served as '/'
app.use(express.static('dist/client'));
app.use('/litterbug', proxy('http://magnemite11.spellicer.me'));
// websocket handler
app.ws('/websocket', function (ws, req) {
    ws.on('message', function (msg) {
        ws.send(msg);
    });
    ws.on('error', function(msg) {
        console.log(msg);
    })
});

app.listen(9090);