import { useEffect, useState } from "react";
import { Outlet, useParams, useNavigate, Navigate } from "react-router-dom";
import ProgressLink from "../components/ProgressLink";
import { UserBurger, UserSideDrawer } from "../components/UserSideDrawer";
import { useUsers } from "../contexts/UsersContext";
import Logo from "../assets/TWC_Logo_Horiztonal_Black_Gold.png";
import { useAuth } from "../contexts/AuthContext";

export default function UserLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const { users } = useUsers();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Find the current user
  const currentUser = users.find((u) => u.id === id);

  // Secondary guard: if logged-in user ID doesn't match URL, redirect to their own dashboard
  useEffect(() => {
    if (!user || !id) return;
    if (user.id !== id) {
      navigate(`/user/${user.id}/dashboard`, { replace: true });
    }
  }, [user, id, navigate]);

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }
  if (id && user.id !== id) {
    return <Navigate to={`/user/${user.id}/dashboard`} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ───── Top bar ───── */}
      <header className="flex items-center sm:h-16 px-4 shadow-sm bg-white sticky top-0 z-30">
        {/* hamburger */}
        <UserBurger onClick={() => setDrawerOpen(true)} />

        {/* title */}
        <div className="ml-4">
          <ProgressLink to="/">
            <img
              src={Logo}
              alt="TWC logo"
              className="h-16 sm:h-20 md:h-24 w-auto"
            />
          </ProgressLink>
        </div>
      </header>

      {/* ───── Slide-in drawer ───── */}
      <UserSideDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)}
        user={currentUser}
        userId={id}
      />

      {/* ───── Nested page content ───── */}
      <main className="w-full">
        <Outlet /> {/* React-Router swaps pages here */}
      </main>
    </div>
  );
} 