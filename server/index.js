const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const { time } = require("console");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

// Serve static frontend (built React app)
app.use(express.static(path.join(__dirname, "../client/dist")));

function broadcastUserList(room) {
    const users = Array.from(rooms.get(room) || []);
    const msg = JSON.stringify({ type: "users", rooms, users });

    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
}

wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (data) => {
        let parsed;
        try {
            parsed = JSON.parse(data);
        } catch {
            return;
        }

        const { type, username, room, text } = parsed;

        if (type === "join") {
            // record in ws and rooms map
            ws.username = username;
            ws.currentRoom = room;
            if (!rooms.has(room)) rooms.set(room, new Set());
            rooms.get(room).add(username);
            return broadcastUserList(room);
        }

        if (type === "leave") {
            const prev = room;
            if (rooms.has(prev)) {
                rooms.get(prev).delete(username);
                broadcastUserList(prev);
            }
            return;
        }

        // Chat message
        if (type === "chat") {
            if (!username || !text || !room) return;
            const out = JSON.stringify({
                type: "chat",
                username,
                text,
                room,
                timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            });
            for (const client of wss.clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(out);
                }
            }
        }
    });

    ws.on("close", () => {
        // remove from its room on disconnect
        const { username, currentRoom } = ws;
        if (username && currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(username);
            broadcastUserList(currentRoom);
        }
        console.log("Client disconnected");
    });
});

const PORT = 4000;
server.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`)
);
