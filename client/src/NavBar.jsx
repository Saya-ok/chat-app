function NavBar({ rooms, currentRoom, onSelect }) {
    return (
        <div className="room-bar">
            <h3>Rooms</h3>
            <ul>
                {rooms.map((room) => (
                    <li key={room}>
                        <button
                            onClick={() => onSelect(room)}
                            className={`room-button ${
                                currentRoom === room ? "active" : ""
                            }`}
                        >
                            <span>#{room}</span>
                        </button>
                    </li>
                ))}
            </ul>
            <button className="edit-user-button">Edit User</button>
        </div>
    );
}

export default NavBar;
