"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FaChartPie,
  FaBook,
  FaTags,
  FaFileImport,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaChevronRight,
  FaSun,
  FaMoon,
  FaUser,
  FaTimes,
} from "react-icons/fa";
import Swal from "sweetalert2";

const menuItems = [
  { label: "نظرة عامة", href: "/admin", icon: FaChartPie },
  { label: "إدارة الكتب", href: "/admin/books", icon: FaBook },
  { label: "إدارة التصنيفات", href: "/admin/categories", icon: FaTags },
  { label: "استيراد الكتب", href: "/admin/import", icon: FaFileImport },
  { label: "الإعدادات", href: "/admin/settings", icon: FaCog },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminName, setAdminName] = useState("المسؤول");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load preferences on mount
  useEffect(() => {
    // 1. Sidebar collapse state
    const savedCollapse = localStorage.getItem("admin_sidebar_collapsed");
    setCollapsed(savedCollapse === "true");

    // 2. Theme initialization
    const storedTheme = localStorage.getItem("theme");
    if (
      storedTheme === "dark" ||
      (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }

    // 3. Get admin profile details
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAdminName(data.data.name);
        } else {
          // Redirect to login if unauthorized
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("admin_sidebar_collapsed", String(newState));
  };

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "تسجيل الخروج",
      text: "هل أنت متأكد من رغبتك في مغادرة لوحة التحكم؟",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "نعم، خروج",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#d4af37",
      cancelButtonColor: "#6c757d",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        const data = await res.json();
        if (res.ok && data.success) {
          Swal.fire({
            icon: "success",
            title: "تم الخروج بنجاح",
            timer: 1500,
            showConfirmButton: false,
          }).then(() => {
            router.push("/login");
            router.refresh();
          });
        }
      } catch (err) {
        Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع" });
      }
    }
  };



  // Helper to map links to breadcrumbs
  const getBreadcrumbs = () => {
    if (pathname === "/admin") return ["الرئيسية", "نظرة عامة"];
    if (pathname.startsWith("/admin/books")) return ["الرئيسية", "إدارة الكتب"];
    if (pathname.startsWith("/admin/categories")) return ["الرئيسية", "إدارة التصنيفات"];
    if (pathname.startsWith("/admin/import")) return ["الرئيسية", "استيراد الكتب"];
    if (pathname.startsWith("/admin/settings")) return ["الرئيسية", "الإعدادات"];
    return ["الرئيسية"];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300 text-right">
      
      {/* 1. Sidebar - Fixed on desktop, Drawer on mobile */}
      <aside
        className={`bg-card-bg border-l border-border-color shrink-0 flex flex-col justify-between transition-all duration-300 z-40 ${
          collapsed ? "w-16" : "w-64"
        } ${
          mobileOpen
            ? "fixed inset-y-0 right-0 w-64 shadow-2xl block"
            : "hidden md:flex"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-color/50 h-16 overflow-hidden">
            {/* Logo always visible - transitions scale/opacity */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
              <img
                src="/images/logo.webp"
                alt="لوجو"
                className="w-8 h-8 rounded-full object-cover border border-primary/30 shrink-0 transition-all duration-300"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span
                className={`font-extrabold text-xs text-foreground select-none whitespace-nowrap transition-all duration-300 overflow-hidden ${
                  collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                لوحة التحكم - دار ابن الجراح
              </span>
            </div>

            {/* Collapse Trigger (Desktop Only) */}
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded hover:bg-foreground/5 text-foreground/75 cursor-pointer shrink-0 transition-all duration-300"
            >
              <FaChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : "rotate-0"}`} />
            </button>

            {/* Mobile close trigger */}
            {mobileOpen && (
              <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden p-1.5 rounded hover:bg-foreground/5 text-foreground shrink-0"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-white gold-glow"
                      : "text-foreground/80 hover:bg-foreground/5 hover:text-primary"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout Action */}
        <div className="p-2 border-t border-border-color/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
            title={collapsed ? "تسجيل الخروج" : undefined}
          >
            <FaSignOutAlt className="w-4 h-4 shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* 2. Main Content Wrapper */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Header toolbar */}
        <header className="bg-card-bg border-b border-border-color h-16 px-4 md:px-6 flex items-center justify-between z-20 shrink-0 transition-colors duration-300">
          
          {/* Breadcrumbs and mobile bars */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-full hover:bg-foreground/5 text-foreground"
            >
              <FaBars className="w-5 h-5" />
            </button>

            {/* Breadcrumbs display */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-foreground/55 select-none">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb}>
                  {idx > 0 && <span className="text-foreground/30">/</span>}
                  <span className={idx === breadcrumbs.length - 1 ? "text-primary font-bold" : ""}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* User profile & Actions */}
          <div className="flex items-center gap-4">
            
            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-foreground/5 text-foreground transition-all cursor-pointer"
              title={theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"}
            >
              {theme === "light" ? (
                <FaMoon className="w-4 h-4 text-indigo-900" />
              ) : (
                <FaSun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {/* Admin Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-border-color">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                <FaUser className="w-3.5 h-3.5" />
              </div>
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-foreground truncate max-w-[100px]">
                  {adminName}
                </span>
                <span className="text-[9px] text-foreground/50">مسؤول النظام</span>
              </div>
            </div>

            {/* Back to public site button */}
            <Link
              href="/"
              className="text-xs font-bold text-primary border border-primary/20 bg-primary/5 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all"
            >
              الموقع العام
            </Link>

          </div>

        </header>

        {/* 3. Panel Content Router view */}
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">
          {children}
        </div>

      </div>

    </div>
  );
}
export type SidebarMenuItemType = typeof menuItems[number];
