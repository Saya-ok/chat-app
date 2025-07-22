import { useEffect, useRef, useState } from "react";
import UsernamePrompt from "./UsernamePrompt.jsx";
import RoomBar from "./RoomBar.jsx";
import UsersList from "./UsersList.jsx";

function App() {
    // username + rooms
    const [username, setUsername] = useState(
        () => localStorage.getItem("username") || ""
    );
    const roomList = ["general", "random", "tech"];
    const [currentRoom, setCurrentRoom] = useState("general");
    const currentRoomRef = useRef(currentRoom);

    // chat state + online users
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [input, setInput] = useState("");

    const ws = useRef(null);
    const bottomRef = useRef(null);

    // 1️⃣ Load history & update ref on room change
    useEffect(() => {
        currentRoomRef.current = currentRoom;
        const saved = localStorage.getItem(`chatMessages_${currentRoom}`);
        setMessages(saved ? JSON.parse(saved) : []);

        // inform server of room switch
        if (ws.current?.readyState === WebSocket.OPEN) {
            // leave old room
            ws.current.send(
                JSON.stringify({
                    type: "leave",
                    username,
                    room: currentRoomRef.current,
                })
            );
            // join new
            ws.current.send(
                JSON.stringify({ type: "join", username, room: currentRoom })
            );
        }
    }, [currentRoom, username]);

    // 2️⃣ Connect WebSocket once when we have a username
    useEffect(() => {
        if (!username) return;
        localStorage.setItem("username", username);

        const socket = new WebSocket("ws://localhost:4000");
        ws.current = socket;

        socket.onopen = () => {
            console.log("✅ WS connected");
            // initial join
            socket.send(
                JSON.stringify({ type: "join", username, room: currentRoom })
            );
        };

        socket.onerror = (e) => console.error("⚠️ WS error", e);
        socket.onclose = () => console.log("🔌 WS closed");

        socket.onmessage = ({ data }) => {
            const parsed = JSON.parse(data);

            if (parsed.type === "users") {
                // update online user list for that room
                if (parsed.room === currentRoomRef.current) {
                    setOnlineUsers(parsed.users);
                }
                return;
            }

            if (parsed.type === "chat") {
                // persist
                const key = `chatMessages_${parsed.room}`;
                const store = JSON.parse(localStorage.getItem(key)) || [];
                const updated = [...store, parsed];
                localStorage.setItem(key, JSON.stringify(updated));

                // only show if it’s our room
                if (parsed.room === currentRoomRef.current) {
                    setMessages(updated);
                }
            }
        };

        return () => socket.close();
    }, [username]);

    // 3️⃣ Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // send chat
    const sendMessage = () => {
        if (ws.current?.readyState !== WebSocket.OPEN) return;
        if (!input.trim()) return;

        ws.current.send(
            JSON.stringify({
                type: "chat",
                username,
                text: input.trim(),
                room: currentRoom,
            })
        );
        setInput("");
    };

    if (!username) {
        return <UsernamePrompt onSubmit={setUsername} />;
    }

    return (
        <div className="chat-app dark">
            <RoomBar
                rooms={roomList}
                currentRoom={currentRoom}
                onSelect={setCurrentRoom}
            />

            <div className="chat-main">
                <h1 className="chat-room-name">#{currentRoom}</h1>
                <UsersList users={onlineUsers} />
                <p className="chat-status">
                    {ws.current?.readyState === WebSocket.OPEN
                        ? "🟢 Connected"
                        : "🔴 Disconnected"}
                </p>

                <div className="chat-messages">
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
                        className="chat-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message…"
                    />
                    <button className="chat-send" onClick={sendMessage}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
