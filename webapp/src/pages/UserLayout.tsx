import { useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import ProgressLink from "../components/ProgressLink";
import { UserBurger, UserSideDrawer } from "../components/UserSideDrawer";
import { useUsers } from "../contexts/UsersContext";
import Logo from "../assets/TWC_Logo_Horiztonal_Black_Gold.png";

export default function UserLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const { users } = useUsers();

  // Find the current user
  const currentUser = users.find((u) => u.id === id);

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