const http = require('http');
const WebSocket = require('ws');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const nicknames = new Map();

wss.on("connection", (socket, req) => {
    const ip = req.socket.remoteAddress.replace("::ffff:", "");

    const timestamp = Math.floor(Date.now() / 1000);
    broadcast(`${timestamp}|[SYS]|M|+ ${nicknames.get(ip) ? nicknames.get(ip) + "/" + ip : ip} joined`);

    socket.on("message", (data) => {
        const raw = data.toString();
        const type = raw[0];
        const content = raw.slice(1);
        const timestamp = Math.floor(Date.now() / 1000);
        const nick = nicknames.get(ip);
        const from = nick ? `${ip}/${nick}` : ip;

        if (type === "N") {
            nicknames.set(ip, content);
            const sysMsg = `${timestamp}|SYS|N|${ip} set name to ${content}`;
            broadcast(sysMsg);
        } else if (type === "M") {
            const msg = `${timestamp}|${from}|M|${content}`;
            broadcast(msg);
        }
    });

    socket.on("close", () => {
        const timestamp = Math.floor(Date.now() / 1000);
        broadcast(`${timestamp}|[SYS]|M|${nicknames.get(ip) ? nicknames.get(ip) + "/" + ip : ip} left`);
        nicknames.delete(ip);
    });
});

function broadcast(msg) {
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
    console.log(msg);
}

server.listen(8080, () => {
    console.log("MiniChat WebSocket server started on ws://localhost:8080");
});
