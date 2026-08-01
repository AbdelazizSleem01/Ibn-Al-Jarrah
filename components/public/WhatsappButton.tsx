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
    <div className="fixed bottom-5 left-5 md:bottom-6 md:left-6 z-50 flex items-center pointer-events-auto select-none">
      {/* Tooltip floating cleanly above the button */}
      <div
        className={`absolute bottom-full left-0 mb-3 whitespace-nowrap bg-card-bg text-foreground text-xs font-extrabold px-3.5 py-2 rounded-xl border border-border-color shadow-2xl transition-all duration-300 transform origin-bottom-left ${
          showTooltip ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-90 pointer-events-none"
        }`}
      >
        تواصل معنا عبر واتساب
        <div className="absolute top-full left-4 -mt-1 w-2.5 h-2.5 bg-card-bg border-r border-b border-border-color rotate-45" />
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-12 h-12 md:w-14 md:h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/20 gold-glow cursor-pointer relative group"
        aria-label="تواصل معنا عبر واتساب"
      >
        {/* Pulsing ring indicator */}
        <span className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping pointer-events-none" />
        <FaWhatsapp className="w-7 h-7 md:w-8 md:h-8 fill-current text-white relative z-10" />
      </a>
    </div>
  );
}
