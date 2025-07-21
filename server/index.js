const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static frontend (built React app)
app.use(express.static(path.join(__dirname, "../client/dist")));

wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (message) => {
        try {
            const parsed = JSON.parse(message);

            if (!parsed.username || !parsed.text) {
                console.error("Invalid message format:", parsed);
                return;
            }

            const messageText = JSON.stringify({
                username: parsed.username,
                text: parsed.text,
                timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            });

            // Broadcast to all clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(messageText);
                }
            });
        } catch (err) {
            console.error("Error processing message:", err);
            return;
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

const PORT = 4000;
server.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`)
);
