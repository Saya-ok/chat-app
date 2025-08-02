import React from "react";
import { useState } from "react";

function handleEditUser(e, name, email, password) {
    e.preventDefault();
    // Add logic to update user info, e.g., API call
    console.log("Edited user:", { name, email, password });
}

const EditUser = () => {
    return (
        <div className="edit-user">
            <h2>Edit User</h2>
            <form>
                <div>
                    <label htmlFor="name">Name:</label>
                    <input type="text" id="name" name="name" />
                </div>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" />
                </div>
                <button type="submit">Save Changes</button>
            </form>
        </div>
    );
};

export default EditUser;
