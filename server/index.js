const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();
const VALID_ROOMS = ["general", "random", "tech"]; // Prevent invalid rooms

// Serve static frontend (built React app)
app.use(express.static(path.join(__dirname, "../client/dist")));

// Utility functions
function isValidRoom(room) {
    return VALID_ROOMS.includes(room);
}

function isValidUsername(username) {
    return (
        username &&
        typeof username === "string" &&
        username.trim().length > 0 &&
        username.length <= 50
    ); // Prevent extremely long usernames
}

function sanitizeMessage(text) {
    return text.trim().substring(0, 1000); // Limit message length
}

function broadcastUserList(room) {
    if (!isValidRoom(room)) return;

    const users = Array.from(rooms.get(room) || []);
    const message = JSON.stringify({
        type: "users",
        room,
        users,
    });

    let sentCount = 0;
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
                sentCount++;
            } catch (error) {
                console.warn("Failed to send user list to client:", error);
            }
        }
    }

    console.log(
        `📢 Broadcasted user list for ${room} to ${sentCount} clients. Users: [${users.join(
            ", "
        )}]`
    );
}

function removeUserFromRoom(username, room) {
    if (!rooms.has(room)) return false;

    const wasRemoved = rooms.get(room).delete(username);
    if (wasRemoved) {
        console.log(`➖ ${username} removed from ${room}`);
        broadcastUserList(room);
    }
    return wasRemoved;
}

function addUserToRoom(username, room) {
    if (!isValidRoom(room) || !isValidUsername(username)) return false;

    if (!rooms.has(room)) {
        rooms.set(room, new Set());
    }

    rooms.get(room).add(username);
    console.log(`➕ ${username} joined ${room}`);
    broadcastUserList(room);
    return true;
}

function cleanupUser(ws) {
    const { username, rooms: userRooms } = ws;
    if (!username || !userRooms) return;

    console.log(`🧹 Cleaning up user ${username} from ${userRooms.size} rooms`);

    for (const room of userRooms) {
        removeUserFromRoom(username, room);
    }
}

wss.on("connection", (ws) => {
    console.log("🔗 New client connected");
    ws.rooms = new Set(); // Track all rooms this user has joined
    ws.isAlive = true;

    ws.on("pong", () => {
        ws.isAlive = true;
    });

    ws.on("message", (data) => {
        let type, username, room, text;

        try {
            const parsed = JSON.parse(data);
            ({ type, username, room, text } = parsed);
        } catch (error) {
            console.warn("📨 Invalid message format:", error);
            return;
        }

        // Validate common fields
        if (!type || !isValidUsername(username)) {
            console.warn(
                "❌ Invalid message: missing or invalid type/username"
            );
            return;
        }

        switch (type) {
            case "join":
                if (!isValidRoom(room)) {
                    console.warn(`❌ Invalid room: ${room}`);
                    return;
                }

                ws.username = username;
                ws.currentRoom = room;
                ws.rooms.add(room);
                addUserToRoom(username, room);
                break;

            case "leave":
                if (!isValidRoom(room)) {
                    console.warn(`❌ Invalid room for leave: ${room}`);
                    return;
                }

                if (ws.rooms.has(room)) {
                    ws.rooms.delete(room);
                    removeUserFromRoom(username, room);
                }
                break;

            case "chat":
                if (!isValidRoom(room)) {
                    console.warn(`❌ Invalid room for chat: ${room}`);
                    return;
                }

                if (!text || typeof text !== "string") {
                    console.warn(
                        "❌ Invalid chat message: missing or invalid text"
                    );
                    return;
                }

                const sanitizedText = sanitizeMessage(text);
                if (!sanitizedText) return;

                const chatMessage = JSON.stringify({
                    type: "chat",
                    username,
                    text: sanitizedText,
                    room,
                    timestamp: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                });

                console.log(
                    `💬 ${username} in ${room}: ${sanitizedText.substring(
                        0,
                        50
                    )}${sanitizedText.length > 50 ? "..." : ""}`
                );

                let sentCount = 0;
                for (const client of wss.clients) {
                    if (client.readyState === WebSocket.OPEN) {
                        try {
                            client.send(chatMessage);
                            sentCount++;
                        } catch (error) {
                            console.warn(
                                "Failed to send chat message to client:",
                                error
                            );
                        }
                    }
                }
                console.log(`📤 Chat message sent to ${sentCount} clients`);
                break;

            default:
                console.warn(`❓ Unknown message type: ${type}`);
        }
    });

    ws.on("close", () => {
        cleanupUser(ws);
        console.log("🔌 Client disconnected");
    });

    ws.on("error", (error) => {
        console.error("⚠️ WebSocket error:", error);
        cleanupUser(ws);
    });
});

// Health check for WebSocket connections
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log("💀 Terminating inactive connection");
            cleanupUser(ws);
            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // Check every 30 seconds

wss.on("close", () => {
    clearInterval(interval);
});

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("🛑 Shutting down server...");
    clearInterval(interval);
    wss.close(() => {
        server.close(() => {
            console.log("👋 Server closed");
            process.exit(0);
        });
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Available rooms: ${VALID_ROOMS.join(", ")}`);
});
