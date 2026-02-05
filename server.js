const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let users = {}

/*{
    "J": "[JOIN]",
    "S": "[SYS]",
    "M": "[MSG]",
    "N": "[NICK]",
    "L": "[LEAVE]"
}*/

wss.on("connection", (socket, req) => {
    const ip = req.socket.remoteAddress.replace("::ffff:", "");

    broadcast("J", ip, ""); // Join message
    users[ip] = null;

    socket.on("message", (data) => { // Message handler
        const raw = data.toString();
        const type = raw[0];
        const content = raw.slice(1);

        switch (type) {
            case "M": // Message
                broadcast("M", ip, content);
                break;
            case "N": // Nickname change
                users[ip] = content;
                saveusers();
                broadcast("N", ip, content);
                break;
        }
    });

    socket.on("close", () => {
        broadcast("L", ip, ""); // Leave message
        delete users[ip];
    });
});

function getTimestamp() {
    const newZero = new Date('2026-01-01T00:00:00Z').getTime();
    return Math.floor((Date.now() - newZero) / 1000);
}

function broadcast(type, sender, content) {
    const timestamp = getTimestamp();
    let msg = `${timestamp}|${sender}|${type}|${content}`;
    
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
    console.log(msg);
}

function sendTo(ip, type, content) {
    const timestamp = getTimestamp();
    let msg = `${timestamp}|${ip}|${type}|${content}`;

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.url.includes(ip)) {
            client.send(msg);
        }
    });
}

function saveusers() {
    fs.writeFileSync("users.json", JSON.stringify(users));
}

function loadusers() {
    fs.readFile("users.json", (err, data) => {
        if (err) {
            if (err.code === "ENOENT") {
                fs.writeFileSync("users.json", "{}");
                console.log("Created users.json file.");
            }
            console.error("Error loading users:", err);
            return;
        }

        users = JSON.parse(data.toString());
        console.log("Loaded " + users.length + " users." );
    })
}

server.listen(9090, () => {
    console.log("MiniChat Server WebSocket started on ws://localhost:9090");
    loadusers();
});
