import { useState } from "react";

function UsernamePrompt({ onSubmit }) {
    const [name, setName] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed) {
            onSubmit(trimmed);
        }
    };

    return (
        <div className="username-prompt">
            <h2>Welcome to Chat</h2>
            <form className="username-form" onSubmit={handleSubmit}>
                <input
                    className="username-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                    maxLength={50}
                />
                <button
                    type="submit"
                    className="username-submit"
                    disabled={!name.trim()}
                >
                    Join Chat
                </button>
            </form>
        </div>
    );
}

export default UsernamePrompt;
