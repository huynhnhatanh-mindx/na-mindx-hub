"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import { createClient } from "@/lib/supabase/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      setIsSidebarCollapsed(stored === "true");
    }
  }, []);

  useEffect(() => {
    async function checkRouteAccess() {
      const publicRoutes = [
        "/",
        "/upload",
        "/submissions",
        "/login",
        "/forgot-password",
        "/reset-password",
        "/contact-admin",
      ];

      const isPublic = publicRoutes.some(path => pathname === path || (path !== "/" && pathname.startsWith(path)));
      const localUserStr = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      // 1. Unauthenticated users — block access to non-public routes
      if (!localUserStr && !token && !isPublic) {
        router.replace("/login");
        return;
      }

      // 2. Authenticated users — check Google Drive connection
      if (localUserStr && !pathname.startsWith("/google-setup") && !pathname.startsWith("/login")) {
        try {
          const localUser = JSON.parse(localUserStr);
          const supabase = createClient();

          const searchUsername = localUser.username || localUser.email || "";
          const searchId = localUser.id || localUser._id;

          let profile: any = null;
          if (searchUsername) {
            const { data } = await supabase.from("profiles").select("google_refresh_token, email").eq("username", searchUsername).maybeSingle();
            profile = data;
          }

          if (!profile && searchId && /^[0-9a-fA-F-]{36}$/.test(searchId)) {
            const { data } = await supabase.from("profiles").select("google_refresh_token, email").eq("id", searchId).maybeSingle();
            profile = data;
          }

          // If user logged in but has no google_refresh_token -> Redirect to /google-setup and block routes
          if (!profile || !profile.google_refresh_token || profile.google_refresh_token === "") {
            router.replace("/google-setup");
          }
        } catch (err) {
          console.error("Error checking drive connection:", err);
        }
      }
    }

    checkRouteAccess();
  }, [pathname, router]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const newVal = !prev;
      localStorage.setItem("sidebar-collapsed", String(newVal));
      return newVal;
    });
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <Header
          isCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onToggleMobileSidebar={toggleMobileSidebar}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
