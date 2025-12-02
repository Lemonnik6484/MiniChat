const WebSocket = require('ws');
const readline = require('readline');

const ws = new WebSocket('ws://localhost:8080');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let nickname = null;

function sendMessage(type, content) {
    ws.send(type + content);
}

function promptNickname() {
    rl.question("Enter your nickname: ", (name) => {
        nickname = name.trim();
        if (nickname.length > 0) {
            sendMessage("N", nickname);
            promptMessage();
        } else {
            promptNickname();
        }
    });
}

function promptMessage() {
    rl.question("", (msg) => {
        if (msg.trim().length > 0) {
            sendMessage("M", msg.trim());
        }
        promptMessage();
    });
}

ws.on('message', (data) => {
    const raw = data.toString();
    const [timestamp, from, type, ...contentParts] = raw.split("|");
    const content = contentParts.join("|");

    const timeStr = new Date(parseInt(timestamp) * 1000).toLocaleTimeString();

    if (type === "M") {
        console.log(`[${timeStr}] ${from}: ${content}`);
    } else if (type === "N") {
        console.log(`[${timeStr}] ${content}`);
    }
});

ws.on('open', () => {
    console.log("Connected to MiniChat server.");
    promptNickname();
});

ws.on('close', () => {
    console.log("Disconnected from server.");
    process.exit(0);
});

ws.on('error', (err) => {
    console.error("WebSocket error:", err);
});
