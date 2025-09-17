import { useEffect, useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { AdminSettingsService } from "../services/adminSettingsService";
import ProgressLink from "./ProgressLink";

/* HAMBURGER */
export function Burger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open menu"
      className="p-3 rounded-lg hover:bg-gray-100 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}

/* DRAWER */
export function SideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [profileImage, setProfileImage] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("Admin User");

  /* close on Esc */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  // Load profile settings from Supabase admin settings
  useEffect(() => {
    const loadProfileSettings = async () => {
      try {
        const settings = await AdminSettingsService.getSettings();
        setProfileImage(settings.profileImage || "");
        setDisplayName(settings.displayName || "Admin User");
      } catch (error) {
        console.error('Failed to load profile settings from Supabase:', error);
        // Fallback to defaults if settings can't be loaded
        setProfileImage("");
        setDisplayName("Admin User");
      }
    };

    loadProfileSettings();

    // Listen for custom event when admin settings are updated
    const handleAdminSettingsUpdate = (e: any) => {
      if (e.detail) {
        if (e.detail.profileImage !== undefined) {
          setProfileImage(e.detail.profileImage);
        }
        if (e.detail.displayName !== undefined) {
          setDisplayName(e.detail.displayName || "Admin User");
        }
      }
    };

    window.addEventListener('adminSettingsUpdated', handleAdminSettingsUpdate);
    
    return () => {
      window.removeEventListener('adminSettingsUpdated', handleAdminSettingsUpdate);
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 transition-opacity z-40 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <nav
        className={`fixed top-0 left-0 h-full w-72 sm:w-80 max-w-[85vw] bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          open ? "translate-x-0" : "-translate-x-full"
        } flex flex-col pt-4 sm:pt-6 pb-safe-bottom`}
      >


        {/* Profile Section */}
        <div className="px-6 pb-6 border-b border-gray-200 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">A</span>
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{displayName}</p>
              <p className="text-sm text-gray-500">Administrator</p>
            </div>
          </div>
        </div>

                <ul className="px-4 sm:px-6 text-base sm:text-lg font-medium space-y-1">
          <li>
            <ProgressLink 
              to="/admin/dashboard" 
              onClick={onClose} 
              className="block py-3 px-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors touch-manipulation min-h-[48px] flex items-center"
            >
              Dashboard
            </ProgressLink>
          </li>
          <li>
            <ProgressLink 
              to="/admin/users" 
              onClick={onClose} 
              className="block py-3 px-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors touch-manipulation min-h-[48px] flex items-center"
            >
              Manage Users
            </ProgressLink>
          </li>
          <li>
            <ProgressLink 
              to="/admin/orders" 
              onClick={onClose} 
              className="block py-3 px-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors touch-manipulation min-h-[48px] flex items-center"
            >
              Manage Orders
            </ProgressLink>
          </li>
          <li>
            <ProgressLink 
              to="/admin/inventory" 
              onClick={onClose} 
              className="block py-3 px-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors touch-manipulation min-h-[48px] flex items-center"
            >
              Inventory
            </ProgressLink>
          </li>
          <li>
            <ProgressLink 
              to="/admin/analytics" 
              onClick={onClose} 
              className="block py-3 px-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors touch-manipulation min-h-[48px] flex items-center"
            >
              Analytics
            </ProgressLink>
          </li>
          <li>
            <ProgressLink 
              to="/admin/support" 
              onClick={onClose} 
              className="block py-3 px-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors touch-manipulation min-h-[48px] flex items-center"
            >
              Support
            </ProgressLink>
          </li>
          <li>
            <ProgressLink 
              to="/admin/settings" 
              onClick={onClose} 
              className="block py-3 px-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors touch-manipulation min-h-[48px] flex items-center"
            >
              Settings
            </ProgressLink>
          </li>
        </ul>

        {/* Sign Out Button */}
        <div className="mt-auto px-4 sm:px-6 pb-4 sm:pb-6">
          <ProgressLink 
            to="/" 
            onClick={onClose}
            className="flex items-center space-x-2 py-3 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors touch-manipulation min-h-[48px]"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </ProgressLink>
        </div>
      </nav>
    </>
  );
}

