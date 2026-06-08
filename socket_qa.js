const io = require("/Users/titiwat/Downloads/AnimeAgentSquad/node_modules/.pnpm/socket.io-client@4.8.3/node_modules/socket.io-client/build/cjs/index.js");
const http = require("http");

const socket = io("http://localhost:3001/runs");
const events = [];

socket.on("run.started", (data) => {
  events.push({ event: "run.started", payload: data });
  console.log("EVENT:run.started", JSON.stringify(data));
});
socket.on("run.completed", (data) => {
  events.push({ event: "run.completed", payload: data });
  console.log("EVENT:run.completed", JSON.stringify(data));
});
socket.on("run.failed", (data) => {
  events.push({ event: "run.failed", payload: data });
  console.log("EVENT:run.failed", JSON.stringify(data));
});
socket.on("run.cancelled", (data) => {
  events.push({ event: "run.cancelled", payload: data });
  console.log("EVENT:run.cancelled", JSON.stringify(data));
});

socket.on("connect", () => {
  console.log("SOCKET_CONNECTED");

  const req1 = http.request("http://localhost:3001/api/tasks/t-008/start", { method: "POST" }, (res) => {
    let body = "";
    res.on("data", (c) => body += c);
    res.on("end", () => {
      const run = JSON.parse(body);
      console.log("REST:started", run.id);

      setTimeout(() => {
        const req2 = http.request(`http://localhost:3001/api/runs/${run.id}/complete`, { method: "PATCH" }, (res2) => {
          let body2 = "";
          res2.on("data", (c) => body2 += c);
          res2.on("end", () => {
            const completed = JSON.parse(body2);
            console.log("REST:completed", completed.id, completed.status);
          });
        });
        req2.end();
      }, 500);
    });
  });
  req1.end();
});

setTimeout(() => {
  console.log("\n--- REPORT ---");
  const started = events.filter((e) => e.event === "run.started");
  const completed = events.filter((e) => e.event === "run.completed");
  console.log("run.started events:", started.length);
  if (started.length > 0) {
    console.log("  payload.run exists:", !!started[0].payload.run);
    console.log("  payload.run.id:", started[0].payload.run.id);
    console.log("  payload.run.status:", started[0].payload.run.status);
  }
  console.log("run.completed events:", completed.length);
  if (completed.length > 0) {
    console.log("  payload.run exists:", !!completed[0].payload.run);
    console.log("  payload.run.id:", completed[0].payload.run.id);
    console.log("  payload.run.status:", completed[0].payload.run.status);
  }
  console.log("PASS_" + (started.length > 0 && completed.length > 0 ? "YES" : "NO"));
  socket.disconnect();
  process.exit(0);
}, 4000);
