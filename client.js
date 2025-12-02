const WebSocket = require('ws');
const readline = require('readline');

const address = process.argv[2] || 'localhost:8080';
console.log("Connecting to: ws://" + address);

const ws = new WebSocket('ws://' + address);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const typeTexts = {
    "J": "[+]",
    "S": "[SYS]",
    "M": "[MSG]",
    "N": "[NICK]",
    "L": "[-]"
}

let nickname = null;
const users = {};

function sendMessage(type, content) {
    ws.send(type + content);
}

function promptMessage() {
    rl.question("> ", (msg) => {
        if (msg.trim().length > 0) {
            if (msg.startsWith("/")) {
                let command = msg.split(" ")[0].slice(1);
                switch (command) {
                    case "help":
                        let commands = "";
                        commands += "Commands:\n";
                        commands += "/help - shows this message\n";
                        commands += "/nick <nickname> - changes your nickname\n";
                        commands += "/exit - closes the client\n";
                        commands += "/list - lists all connected users\n";

                        const lines = commands.split("\n").filter(l => l.trim().length > 0);

                        for (let i = 0; i < lines.length; i++) {
                            const prefix =
                                i === 0 ? "┌ " :
                                    i === lines.length - 1 ? "└ " :
                                        "├ ";

                            console.log(prefix + lines[i]);
                        }
                        break;
                    case "nick":
                        nickname = msg.split(" ")[1];
                        sendMessage("N", nickname);
                        break;
                    case "exit":
                        ws.close();
                        process.exit(0);
                        break;
                    case "list":
                        const userLines = Object.entries(users).map(([ip, nick]) =>
                            nick ? `${ip}/${nick}` : ip
                        );

                        const allLines = [
                            `${userLines.length} users online:`,
                            ...userLines
                        ];

                        for (let i = 0; i < allLines.length; i++) {
                            const prefix =
                                i === 0 ? "┌ " :
                                    i === allLines.length - 1 ? "└ " :
                                        "├ ";
                            console.log(prefix + allLines[i]);
                        }
                        break;
                    default:
                        console.log("Unknown command: " + command);
                        break;
                }
            } else {
                sendMessage("M", msg.trim());
            }
        }
        promptMessage();
    });
}

ws.on('message', (data) => {
    const raw = data.toString();
    const [timestamp, sender, type, ...contentParts] = raw.split("|");
    const content = contentParts.join("|");

    function fromTimestamp(ts) {
        const newZero = new Date('2026-01-01T00:00:00Z').getTime();
        return new Date(newZero + ts * 1000);
    }

    const timeStr = fromTimestamp(timestamp).toLocaleTimeString('en-GB');

    switch (type) {
        case "J":
            users[sender] = null;
            console.log(`${timeStr} ${typeTexts[type]} ${sender}`);
            break;
        case "L":
            delete users[sender];
            console.log(`${timeStr} ${typeTexts[type]} ${sender}`);
            break;
        case "S":
            console.log(`${timeStr} ${typeTexts[type]} ${content}`);
            break;
        case "M":
            let senderStr = users[sender] ?  sender + "/" + users[sender] : sender;
            console.log(`${timeStr} ${typeTexts[type]} ${senderStr}: ${content}`);
            break;
        case "N":
            users[sender] = content;
            console.log(`${timeStr} ${typeTexts[type]} ${sender} >>> ${sender}/${users[sender]}`);
            break;
    }
});

ws.on('open', () => {
    console.log("Connected to MiniChat server.");
    promptMessage();
});

ws.on('close', () => {
    console.log("Disconnected from server.");
    process.exit(0);
});

ws.on('error', (err) => {
    console.error("WebSocket error:", err);
});
