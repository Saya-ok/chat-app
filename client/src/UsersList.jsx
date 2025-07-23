export default function UsersList({ users }) {
    if (!users.length) {
        return (
            <div className="users-list">
                <h4>
                    <span className="status-indicator connecting"></span>
                    Loading users...
                </h4>
            </div>
        );
    }

    return (
        <div className="users-list">
            <h4>
                <span className="status-indicator"></span>
                Online ({users.length})
            </h4>
            <ul>
                {users.map((user, i) => (
                    <li key={i}>{user}</li>
                ))}
            </ul>
        </div>
    );
}
