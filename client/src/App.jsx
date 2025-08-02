import { useEffect, useRef, useState, useCallback } from "react";
import UsernamePrompt from "./UsernamePrompt.jsx";
import NavBar from "./NavBar.jsx";
import UsersList from "./UsersList.jsx";

function App() {
    // username + rooms
    const [username, setUsername] = useState(
        () => localStorage.getItem("username") || ""
    );
    const roomList = ["general", "random", "tech"];
    const [currentRoom, setCurrentRoom] = useState("general");
    const [connectionStatus, setConnectionStatus] = useState("disconnected");

    // chat state + online users
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [input, setInput] = useState("");

    const ws = useRef(null);
    const bottomRef = useRef(null);
    const previousRoom = useRef("general");

    // Load messages for current room
    const loadRoomMessages = useCallback((room) => {
        try {
            const saved = localStorage.getItem(`chatMessages_${room}`);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn(`Failed to load messages for room ${room}:`, error);
            return [];
        }
    }, []);

    // Save message to localStorage
    const saveMessage = useCallback(
        (message) => {
            try {
                const { room } = message;
                const key = `chatMessages_${room}`;
                const existing = loadRoomMessages(room);
                const updated = [...existing, message];
                localStorage.setItem(key, JSON.stringify(updated));
                return updated;
            } catch (error) {
                console.warn("Failed to save message:", error);
                return null;
            }
        },
        [loadRoomMessages]
    );

    // Send WebSocket message safely
    const sendWSMessage = useCallback((message) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
            return true;
        }
        return false;
    }, []);

    // Handle room changes
    useEffect(() => {
        const prevRoom = previousRoom.current;
        previousRoom.current = currentRoom;

        // Load messages for new room
        setMessages(loadRoomMessages(currentRoom));

        // Clear users list while switching (UX improvement)
        setOnlineUsers([]);

        // Handle room switching via WebSocket
        if (username && prevRoom !== currentRoom) {
            // Leave previous room
            sendWSMessage({
                type: "leave",
                username,
                room: prevRoom,
            });

            // Join new room
            sendWSMessage({
                type: "join",
                username,
                room: currentRoom,
            });
        }
    }, [currentRoom, username, loadRoomMessages, sendWSMessage]);

    // WebSocket connection management
    useEffect(() => {
        if (!username) return;

        localStorage.setItem("username", username);

        const connectWebSocket = () => {
            const socket = new WebSocket("ws://localhost:4000");
            ws.current = socket;

            socket.onopen = () => {
                console.log("✅ WebSocket connected");
                setConnectionStatus("connected");

                // Join current room
                sendWSMessage({
                    type: "join",
                    username,
                    room: currentRoom,
                });
            };

            socket.onclose = () => {
                console.log("🔌 WebSocket closed");
                setConnectionStatus("disconnected");
                setOnlineUsers([]);
            };

            socket.onerror = (error) => {
                console.error("⚠️ WebSocket error:", error);
                setConnectionStatus("error");
            };

            socket.onmessage = ({ data }) => {
                try {
                    const { type, room, users, ...messageData } =
                        JSON.parse(data);

                    if (type === "users") {
                        // Only update users for current room
                        if (room === currentRoom) {
                            setOnlineUsers(users || []);
                        }
                        return;
                    }

                    if (type === "chat") {
                        const fullMessage = { type, room, ...messageData };
                        const updatedMessages = saveMessage(fullMessage);

                        // Only update UI if message is for current room
                        if (room === currentRoom && updatedMessages) {
                            setMessages(updatedMessages);
                        }
                    }
                } catch (error) {
                    console.warn("Failed to parse WebSocket message:", error);
                }
            };
        };

        connectWebSocket();

        // Cleanup on unmount or username change
        return () => {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [username, currentRoom, saveMessage, sendWSMessage]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Send chat message
    const sendMessage = useCallback(() => {
        const trimmedInput = input.trim();
        if (!trimmedInput || connectionStatus !== "connected") return;

        const success = sendWSMessage({
            type: "chat",
            username,
            text: trimmedInput,
            room: currentRoom,
        });

        if (success) {
            setInput("");
        }
    }, [input, connectionStatus, sendWSMessage, username, currentRoom]);

    // Handle Enter key
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        },
        [sendMessage]
    );

    if (!username) {
        return <UsernamePrompt onSubmit={setUsername} />;
    }

    const getStatusDisplay = () => {
        const indicators = {
            connected: { text: "Connected", class: "" },
            error: { text: "Connection Error", class: "error" },
            default: { text: "Connecting...", class: "connecting" },
        };

        const status = indicators[connectionStatus] || indicators.default;

        return (
            <>
                <span className={`status-indicator ${status.class}`}></span>
                {status.text}
            </>
        );
    };

    return (
        <div className="chat-app dark">
            <NavBar
                rooms={roomList}
                currentRoom={currentRoom}
                onSelect={setCurrentRoom}
            />

            <div className="chat-main">
                <h1 className="chat-room-name">#{currentRoom}</h1>
                <UsersList users={onlineUsers} />
                <p className="chat-status">{getStatusDisplay()}</p>

                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="empty-state">
                            Start a conversation! Be the first to say something.
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div
                                className="chat-message"
                                key={`${msg.timestamp}-${i}`}
                            >
                                <strong>{msg.username}</strong>
                                <span className="timestamp">
                                    [{msg.timestamp}]
                                </span>
                                <div className="message-text">{msg.text}</div>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>

                <div className="chat-input-group">
                    <input
                        className="chat-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            connectionStatus === "connected"
                                ? "Type a message…"
                                : "Connecting..."
                        }
                        disabled={connectionStatus !== "connected"}
                    />
                    <button
                        className="chat-send"
                        onClick={sendMessage}
                        disabled={
                            connectionStatus !== "connected" || !input.trim()
                        }
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
