import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import ProgressLink from "../components/ProgressLink";
import { Burger, SideDrawer } from "../components/SideDrawer";
import Logo from "../assets/TWC_Logo_Horiztonal_Black_Gold.png";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, isLoading } = useAuth();

  // Hard block render until auth resolved
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to={`/user/${user.id}/dashboard`} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ───── Top bar ───── */}
      <header className="flex items-center h-14 sm:h-16 px-4 shadow-sm bg-white sticky top-0 z-30">
        {/* hamburger */}
        <Burger onClick={() => setDrawerOpen(true)} />

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
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* ───── Nested page content ───── */}
      <main className="w-full">
        <Outlet /> {/* React-Router swaps pages here */}
      </main>
    </div>
  );
}
