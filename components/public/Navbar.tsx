"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaSun,
  FaMoon,
  FaBars,
  FaTimes,
  FaUserShield,
  FaHome,
  FaBookOpen,
  FaEnvelope,
  FaTruck,
} from "react-icons/fa";
import { toggleThemeWithNoFlash } from "@/lib/utils/theme";

interface NavbarProps {
  settings?: {
    title: string;
    logo?: {
      secureUrl?: string;
    };
  };
}

export default function Navbar({ settings }: NavbarProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Load theme
  useEffect(() => {
    // Theme initialization
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
  }, []);

  const toggleTheme = () => {
    toggleThemeWithNoFlash(setTheme);
  };

  const navLinks = [
    { label: "الرئيسية", href: "/", icon: <FaHome className="text-[16px]" /> },
    { label: "الكتب", href: "/books", icon: <FaBookOpen className="text-[16px]" /> },
    { label: "تواصل معنا", href: "/#contact", icon: <FaEnvelope className="text-[16px]" /> },
    { label: "تتبع طلبك", href: "/track", icon: <FaTruck className="text-[16px]" /> },
  ];

  const brandName = settings?.title || "مؤسسة دار ابن الجراح ";
  const logoUrl = settings?.logo?.secureUrl || "/images/logo.webp";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-color bg-card-bg/95 backdrop-blur-md transition-colors duration-150">
      <div className=" mx-auto px-8 py-4 flex items-center justify-between">

        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-12 h-12 overflow-hidden rounded-full border border-primary/30 flex items-center justify-center bg-foreground/5 shrink-0 shadow-sm">
            <img
              src={logoUrl}
              alt="شعار المؤسسة"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
                const parent = (e.target as HTMLElement).parentElement;
                if (parent && !parent.querySelector(".text-primary")) {
                  const fallback = document.createElement("span");
                  fallback.className = "text-primary font-extrabold text-lg";
                  fallback.innerText = "دار";
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <span className="hidden md:inline text-sm md:text-base font-bold text-foreground tracking-tight leading-tight transition-colors">
            {brandName}
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center gap-1.5 font-medium pb-1 transition-colors duration-150 ${isActive
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-foreground/75 hover:text-primary"
                  }`}
              >
                <span className={isActive ? "text-primary text-lg" : "text-foreground/50"} >{link.icon}</span>
                {link.label}
              </Link>
            );
          })}

        </nav>

        {/* Action Buttons: Currency Selector, Dark Mode & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">

          {/* Instant CSS-Driven Theme Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            className="relative p-2.5 rounded-full border-2 border-border-color bg-card-bg hover:border-primary/60 cursor-pointer transition-colors duration-150 group shadow-sm"
            aria-label="تبديل الوضع الليلي والنهاري"
            title={theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"}
          >
            <span className="transition-transform duration-200 block group-hover:rotate-12">
              {theme === "dark" ? (
                <FaSun className="w-4 h-4 text-amber-400" />
              ) : (
                <FaMoon className="w-4 h-4 text-slate-700" />
              )}
            </span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2.5 rounded-full hover:bg-foreground/5 text-foreground md:hidden cursor-pointer border border-border-color/60 transition-all"
            aria-label="قائمة الهاتف"
          >
            {isOpen ? <FaTimes className="w-4 h-4" /> : <FaBars className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border-color bg-card-bg transition-all duration-300">
          <div className="px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 py-3 px-3 rounded-xl text-base transition-all ${pathname === link.href
                  ? "text-primary font-bold bg-primary/5 border-r-4 border-primary"
                  : "text-foreground/80 hover:text-primary hover:bg-foreground/5"
                  }`}
              >
                <span className={pathname === link.href ? "text-primary" : "text-foreground/40"}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}

          </div>
        </div>
      )}
    </header>
  );
}
