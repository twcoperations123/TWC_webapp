// src/pages/UsersIndex.tsx
import { Link } from "react-router-dom";
import { demoUsers } from "../data/users";

export default function UsersIndex() {
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold">All Users</h2>

      <ul className="space-y-2">
        {demoUsers.map((u) => (
          <li key={u.id}>
            <Link
              to={`/user/${u.id}`}
              className="text-emerald-600 hover:underline"
            >
              {u.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
