import { useState } from "react";

function UsernamePrompt({ onSubmit }) {
    const [name, setName] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed) {
            localStorage.setItem("username", trimmed);
            onSubmit(trimmed);
        }
    };

    return (
        <div style={{ padding: 40, textAlign: "center" }}>
            <h2>Enter your name</h2>
            <form onSubmit={handleSubmit}>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                />
                <button type="submit" style={{ marginLeft: 10 }}>
                    Join Chat
                </button>
            </form>
        </div>
    );
}

export default UsernamePrompt;
