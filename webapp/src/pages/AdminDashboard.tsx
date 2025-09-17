import { Outlet } from "react-router-dom";
import { useState } from "react";
import { SideDrawer, Burger } from "../components/SideDrawer";

export default function AdminDashboard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* top bar */}
      <header className="flex items-center h-16 px-4 shadow-sm bg-white">
        <Burger onClick={() => setOpen(true)} />
        <h1 className="ml-4 text-2xl font-bold">Admin Dashboard</h1>
      </header>

      {/* drawer */}
      <SideDrawer open={open} onClose={() => setOpen(false)} />

      {/* nested pages render here */}
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}



