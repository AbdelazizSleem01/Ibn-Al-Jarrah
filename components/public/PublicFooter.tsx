"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import WhatsappButton from "./WhatsappButton";

interface PublicFooterProps {
  settings?: any;
}

export default function PublicFooter({ settings }: PublicFooterProps) {
  const pathname = usePathname();

  // Hide public footer and whatsapp button on admin and login pages
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/login")) {
    return null;
  }

  const whatsappNum = settings?.whatsapp || "201272942243";

  return (
    <>
      <WhatsappButton phone={whatsappNum} message="السلام عليكم، أريد الاستفسار عن أحد الكتب." />
      <Footer settings={settings} />
    </>
  );
}
