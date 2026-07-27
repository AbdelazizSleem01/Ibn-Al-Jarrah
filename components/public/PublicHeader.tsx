"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

interface PublicHeaderProps {
  settings?: any;
}

export default function PublicHeader({ settings }: PublicHeaderProps) {
  const pathname = usePathname();

  // Hide public navbar on admin and login pages
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/login")) {
    return null;
  }

  return <Navbar settings={settings} />;
}
