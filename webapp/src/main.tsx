import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./index.css";

/* -------- public pages -------- */
import Landing       from "./pages/Landing";
import SignIn        from "./pages/SignIn";
import ResetPassword from "./pages/ResetPassword";
import ContactAdmin  from "./pages/ContactAdmin";

/* -------- user layout & pages -------- */
import UserLayout    from "./pages/UserLayout";
import UserDashboardPage from "./pages/user/Dashboard";
import UserOrders    from "./pages/user/Orders";
import UserInventory from "./pages/user/Inventory";
import UserSupport   from "./pages/user/Support";
import UserSettings  from "./pages/user/Settings";
import DeliveryTimeSelection from "./pages/user/DeliveryTimeSelection";
import Payment from "./pages/user/Payment";
import OrderSuccess from "./pages/user/OrderSuccess";

/* -------- admin layout & pages -------- */
import AdminLayout from "./pages/AdminLayout";
import Dashboard   from "./pages/admin/Dashboard";
import Users       from "./pages/admin/Users";
import UserDetail  from "./pages/admin/UserDetail";
import Orders      from "./pages/admin/Orders";
import Inventory   from "./pages/admin/Inventory";
import Support     from "./pages/admin/Support";
import AdminSettings from "./pages/admin/Settings";
import Analytics   from "./pages/admin/Analytics";

/* -------- context providers -------- */
import { UsersProvider } from "./contexts/UsersContext";
import { AuthProvider }  from "./contexts/AuthContext";
import { NavigationProgressProvider } from "./contexts/NavigationProgressContext";

/* -------- components -------- */
import NavigationProgressBar from "./components/NavigationProgressBar";
import ProtectedRoute from "./components/ProtectedRoute";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <UsersProvider>         {/* keeps user list in localStorage */}
      <AuthProvider>        {/* current logged-in user in memory */}
        <BrowserRouter>
          <NavigationProgressProvider>
            <NavigationProgressBar />
            <Routes>
              {/* public routes */}
              <Route path="/"          element={<Landing />} />
              <Route path="/sign-in"   element={<SignIn />} />
              <Route path="/contact-admin" element={<ContactAdmin />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />

              {/* user area */}
              <Route path="/user/:id" element={
                <ProtectedRoute allowOwnUserOnly={true}>
                  <UserLayout />
                </ProtectedRoute>
              }>
                <Route index            element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<UserDashboardPage />} />
                <Route path="orders"    element={<UserOrders />} />
                <Route path="inventory" element={<UserInventory />} />
                <Route path="support"   element={<UserSupport />} />
                <Route path="settings"  element={<UserSettings />} />
                <Route path="delivery-time" element={<DeliveryTimeSelection />} />
                <Route path="payment"   element={<Payment />} />
                <Route path="order-success" element={<OrderSuccess />} />
              </Route>

              {/* admin area */}
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index            element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="users"     element={<Users />} />
                <Route path="users/:id" element={<UserDetail />} />
                <Route path="orders"    element={<Orders />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="support"   element={<Support />} />
                <Route path="settings"  element={<AdminSettings />} />
              </Route>

              {/* any unknown path → home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NavigationProgressProvider>
        </BrowserRouter>
      </AuthProvider>
    </UsersProvider>
  </React.StrictMode>
);

