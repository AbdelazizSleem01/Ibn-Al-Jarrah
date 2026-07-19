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
} from "react-icons/fa";

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

  const navLinks = [
    { label: "الرئيسية", href: "/", icon: <FaHome className="text-[11px]" /> },
    { label: "الكتب", href: "/books", icon: <FaBookOpen className="text-[11px]" /> },
    { label: "تواصل معنا", href: "/#contact", icon: <FaEnvelope className="text-[11px]" /> },
  ];

  const brandName = settings?.title || "مؤسسة دار ابن الجراح ";
  const logoUrl = settings?.logo?.secureUrl || "/images/logo.webp";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-color bg-card-bg/95 backdrop-blur-md transition-colors duration-300">
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
                className={`flex items-center gap-1.5 text-sm font-medium pb-1 transition-all duration-200 ${isActive
                    ? "text-primary font-bold border-b-2 border-primary"
                    : "text-foreground/75 hover:text-primary"
                  }`}
              >
                <span className={isActive ? "text-primary" : "text-foreground/50"}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
       
        </nav>

        {/* Action Buttons: Dark Mode & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle with styled border ring */}
          <button
            onClick={toggleTheme}
            className={`relative p-2.5 rounded-full border-2 cursor-pointer transition-all duration-300 group
              ${theme === "dark"
                ? "border-amber-400/60 bg-amber-400/5 hover:bg-amber-400/10 hover:border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.15)] hover:shadow-[0_0_16px_rgba(251,191,36,0.25)]"
                : "border-gray-900/70 bg-gray-950/70 hover:bg-gray-900 hover:border-gray-700 shadow-[0_0_10px_rgba(30,27,75,0.3)] hover:shadow-[0_0_16px_rgba(30,27,75,0.45)]"
              }`}
            aria-label="تبديل الوضع الليلي والنهاري"
            title={theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"}
          >
            <span className="transition-transform duration-300 block group-hover:rotate-12">
              {theme === "light" ? (
                <FaMoon className="w-4 h-4 text-white" />
              ) : (
                <FaSun className="w-4 h-4 text-amber-400" />
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
