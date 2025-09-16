"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo / Brand */}
          <Link
            href="/dashboard"
            className="text-xl font-bold text-gray-900 hover:text-gray-700 transition"
          >
            Task Manager
          </Link>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <span className="px-5 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg shadow-sm">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
