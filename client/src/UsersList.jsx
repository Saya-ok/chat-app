export default function UsersList({ users }) {
    return (
        <div className="users-list">
            <h4>Online</h4>
            <ul>
                {users.map((u, i) => (
                    <li key={i}>{u}</li>
                ))}
            </ul>
        </div>
    );
}
