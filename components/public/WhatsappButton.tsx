"use client";

import React, { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

interface WhatsappButtonProps {
  phone?: string;
  message?: string;
}

export default function WhatsappButton({ phone, message }: WhatsappButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const whatsappNumber = phone || "201272942243";
  const initialText = message || "السلام عليكم، أريد الاستفسار عن أحد الكتب.";
  const encodedText = encodeURIComponent(initialText);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedText}`;

  return (
    <div className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-40 flex items-center gap-2">
      {/* Tooltip */}
      <div
        className={`bg-card-bg text-foreground text-xs font-bold px-3 py-2 rounded-lg border border-border-color shadow-lg transition-all duration-300 transform origin-left ${
          showTooltip ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-2 scale-90 pointer-events-none"
        }`}
      >
        تواصل معنا عبر واتساب
      </div>

      {/* Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-11 h-11 md:w-14 md:h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-green-500/30 hover:scale-105 active:scale-95 transition-all duration-300 gold-glow cursor-pointer"
        aria-label="تواصل معنا عبر واتساب"
      >
        <FaWhatsapp className="w-6 h-6 md:w-8 md:h-8" />
      </a>
    </div>
  );
}
