import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useUsers, type User } from "../contexts/UsersContext";
import { supabase } from "../lib/supabase";

export default function UserDashboard() {
  const { id } = useParams<{ id: string }>();
  const { users } = useUsers();

  /* try context first */
  const [user, setUser] = useState<User | null>(
    () => users.find((u) => u.id === id) ?? null
  );

  /* if not found, fetch from Supabase once */
  useEffect(() => {
    if (user || !id) return;

    supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }: { data: User | null }) => setUser(data));
  }, [id, user]);

  if (!user) return <p className="p-8">User not found.</p>;

  /* ---------- normal dashboard UI ---------- */
  return (
    <div className="p-8 space-y-6">
      <Link to="/admin/users" className="text-sm text-gray-500">
        &larr;&nbsp;back
      </Link>

      <h2 className="text-3xl font-bold">{user.name}</h2>

      <ul className="space-y-1 text-gray-700">
        <li>
          <strong>Key:</strong> {user.id}
        </li>
        <li>
          <strong>Address:</strong> {user.address}
        </li>
        <li>
          <strong>Username:</strong> {user.username}
        </li>
      </ul>

      <p className="text-gray-500">
        (Build order history, stats, etc. here.)
      </p>
    </div>
  );
}

