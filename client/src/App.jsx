import { useEffect, useRef, useState } from "react";

import UsernamePrompt from "./UsernamePrompt.jsx";
import RoomBar from "./RoomBar.jsx";

function App() {
    const [username, setUsername] = useState(
        () => localStorage.getItem("username") || ""
    );
    const roomList = ["general", "random", "tech"];
    const [currentRoom, setCurrentRoom] = useState("general");
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem(`chatMessages_${currentRoom}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [input, setInput] = useState("");
    const ws = useRef(null);
    const prompted = useRef(false);

    const bottomRef = useRef(null);
    const chatContainerRef = useRef(null);
    const [isScrolledUp, setIsScrolledUp] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(`chatMessages_${currentRoom}`);
        setMessages(saved ? JSON.parse(saved) : []);
    }, [currentRoom]);

    useEffect(() => {
        if (!prompted.current) {
            if (!username) return;

            // Set up WebSocket connection
            const socket = new WebSocket("ws://localhost:4000");
            ws.current = socket;

            socket.onopen = () => {
                console.log("✅ WebSocket connection established");
            };

            socket.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    setMessages((prev) => {
                        const updated = [...prev, parsed];
                        localStorage.setItem(
                            `chatMessages_${currentRoom}`,
                            JSON.stringify(updated)
                        );
                        return updated;
                    });
                } catch (err) {
                    console.error("❌ Failed to parse message:", err);
                }
            };

            socket.onerror = (error) => {
                console.error("⚠️ WebSocket error:", error);
            };

            socket.onclose = () => {
                console.log("🔌 WebSocket connection closed");
            };
        }

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [username]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        if (
            input.trim() &&
            ws.current &&
            ws.current.readyState === WebSocket.OPEN
        ) {
            const payload = {
                username,
                text: input.trim(),
            };
            ws.current.send(JSON.stringify(payload));
            setInput("");
        } else {
            console.warn("WebSocket not ready. Message not sent.");
        }
    };

    if (!username) {
        return <UsernamePrompt onSubmit={setUsername} />;
    }

    return (
        <div className="chat-app dark">
            {/* Top Bar */}
            <RoomBar
                className="room-bar"
                rooms={roomList}
                currentRoom={currentRoom}
                onSelect={setCurrentRoom}
            />

            {/* Main Chat Area */}
            <div className="chat-main">
                <h1 className="chat-room-name">#{currentRoom}</h1>
                <p className="chat-status">
                    {ws.current?.readyState === 1
                        ? "🟢 Connected"
                        : "🔴 Not connected"}
                </p>

                <div className="chat-messages" ref={chatContainerRef}>
                    {messages.map((msg, i) => (
                        <div className="chat-message" key={i}>
                            <strong>{msg.username}</strong> [{msg.timestamp}]:{" "}
                            {msg.text}
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                <div className="chat-input-group">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message"
                        className="chat-input"
                    />
                    <button onClick={sendMessage} className="chat-send">
                        Send
                    </button>
                    <button
                        onClick={() => {
                            setMessages([]);
                            localStorage.removeItem(
                                `chatMessages_${currentRoom}`
                            );
                        }}
                        className="chat-clear"
                    >
                        Clear Chat
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
