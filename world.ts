const ctx: Worker = self as any;

// Respond to message from parent thread
ctx.addEventListener("message", (event) => console.log(event));

setInterval(() => {
}, 1000);