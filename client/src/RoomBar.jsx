function RoomBar({ rooms, currentRoom, onSelect }) {
    return (
        <div className="room-bar">
            <h3>Rooms</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
                {rooms.map((room) => (
                    <li
                        key={room}
                        onClick={() => onSelect(room)}
                        className="room-button"
                    >
                        #{room}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default RoomBar;
