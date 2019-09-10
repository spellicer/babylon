addEventListener('message', event => {
    const response = `worker response to ${event.data}`;
    event.ports[0].postMessage(response);
});
