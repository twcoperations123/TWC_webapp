import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import ProgressLink from "../components/ProgressLink";
import { Burger, SideDrawer } from "../components/SideDrawer";
import Logo from "../assets/TWC_Logo_Horiztonal_Black_Gold.png";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Secondary guard in case routes are accessed directly or hydration mismatches
  useEffect(() => {
    if (isLoading) return; // wait for auth to resolve
    if (!user) {
      navigate("/sign-in", { replace: true });
      return;
    }
    if (user.role !== "admin") {
      navigate(`/user/${user.id}/dashboard`, { replace: true });
    }
  }, [user, isLoading, navigate]);

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
