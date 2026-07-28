"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCurrency, CurrencyCode } from "@/context/CurrencyContext";

const CURRENCIES: { code: CurrencyCode; label: string; flag: string; symbol: string }[] = [
  { code: "EGP", label: "جنيه مصري", flag: "🇪🇬", symbol: "ج.م" },
  { code: "LYD", label: "دينار ليبي", flag: "🇱🇾", symbol: "د.ل" },
  { code: "USD", label: "دولار أمريكي", flag: "🌐", symbol: "$" },
];

export default function CurrencySelector() {
  const { currency, setCurrency, isManual, resetToAuto } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCurrency = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border-color/60 bg-foreground/[0.03] hover:bg-foreground/[0.08] text-foreground text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer"
        title="تغيير العملة المعروضة"
      >
        <span className="text-sm">{activeCurrency.flag}</span>
        <span>{activeCurrency.code}</span>
        <svg
          className={`w-3 h-3 text-foreground/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-44 bg-card-bg border border-border-color rounded-2xl shadow-xl z-50 overflow-hidden text-right animate-fade-in p-1.5">
          <div className="px-3 py-1.5 text-[10px] font-extrabold text-foreground/50 border-b border-border-color/40 flex items-center justify-between">
            <span>اختر العملة</span>
            {isManual && (
              <button
                type="button"
                onClick={() => {
                  resetToAuto();
                  setIsOpen(false);
                }}
                className="text-primary hover:underline font-normal text-[9px] cursor-pointer"
              >
                تلقائي (حسب بلدك)
              </button>
            )}
          </div>

          <div className="flex flex-col gap-0.5 mt-1">
            {CURRENCIES.map((c) => {
              const isSelected = currency === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCurrency(c.code);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-foreground/5 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{c.flag}</span>
                    <span>{c.label}</span>
                  </div>
                  <span className="text-[10px] text-foreground/50 font-mono">{c.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
