"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CurrencyCode = "EGP" | "LYD" | "USD";

export interface BookPrices {
  egp?: number;
  lyd?: number;
  usd?: number;
  wholesale?: number;
  profitMargin?: number;
}

export interface FormattedPrice {
  amount: number | null;
  currency: CurrencyCode;
  symbol: string;
  label: string;
  formatted: string;
  isFallback?: boolean;
}

interface CurrencyContextType {
  currency: CurrencyCode;
  countryCode: string;
  isManual: boolean;
  setCurrency: (code: CurrencyCode) => void;
  resetToAuto: () => void;
  formatBookPrice: (prices?: BookPrices, overrideCurrency?: CurrencyCode) => FormattedPrice;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = "user_currency_preference";

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>("EGP");
  const [countryCode, setCountryCode] = useState<string>("EG");
  const [isManual, setIsManual] = useState<boolean>(false);

  // Initialize currency detection and local storage state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "EGP" || stored === "LYD" || stored === "USD") {
        setCurrencyState(stored as CurrencyCode);
        setIsManual(true);
        return;
      }
    } catch {
      // Ignore localStorage errors
    }

    // Auto detect location via API
    fetch("/api/geo")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.currency) {
          setCurrencyState(data.currency as CurrencyCode);
          if (data.countryCode) {
            setCountryCode(data.countryCode);
          }
        }
      })
      .catch(() => {
        // Default to EGP on network error
        setCurrencyState("EGP");
      });
  }, []);

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    setIsManual(true);
    try {
      localStorage.setItem(STORAGE_KEY, newCurrency);
    } catch {
      // Ignore localStorage errors
    }
  };

  const resetToAuto = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
    setIsManual(false);
    fetch("/api/geo")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.currency) {
          setCurrencyState(data.currency as CurrencyCode);
          if (data.countryCode) {
            setCountryCode(data.countryCode);
          }
        }
      })
      .catch(() => setCurrencyState("EGP"));
  };

  /**
   * Universal Price Formatting Logic with Automatic Country Fallbacks
   */
  const formatBookPrice = useCallback(
    (prices?: BookPrices, overrideCurrency?: CurrencyCode): FormattedPrice => {
      const targetCurrency = overrideCurrency || currency;

      if (!prices) {
        return {
          amount: null,
          currency: targetCurrency,
          symbol: "",
          label: "",
          formatted: "سعر غير محدد",
        };
      }

      // Rule 1: International Visitors / USD Target
      if (targetCurrency === "USD") {
        if (prices.usd !== undefined && prices.usd !== null && prices.usd > 0) {
          return {
            amount: prices.usd,
            currency: "USD",
            symbol: "$",
            label: "دولار أمريكي",
            formatted: `$${prices.usd}`,
            isFallback: false,
          };
        }
        // Fallback rule for USD: If no USD price available, fall back to EGP (Egyptian Pound)
        if (prices.egp !== undefined && prices.egp !== null && prices.egp > 0) {
          return {
            amount: prices.egp,
            currency: "EGP",
            symbol: "ج.م",
            label: "جنيه مصري",
            formatted: `${prices.egp} ج.م`,
            isFallback: true,
          };
        }
        // Fallback 2 to LYD if available
        if (prices.lyd !== undefined && prices.lyd !== null && prices.lyd > 0) {
          return {
            amount: prices.lyd,
            currency: "LYD",
            symbol: "د.ل",
            label: "دينار ليبي",
            formatted: `${prices.lyd} د.ل`,
            isFallback: true,
          };
        }
      }

      // Rule 2: Egypt Visitors / EGP Target
      if (targetCurrency === "EGP") {
        if (prices.egp !== undefined && prices.egp !== null && prices.egp > 0) {
          return {
            amount: prices.egp,
            currency: "EGP",
            symbol: "ج.م",
            label: "جنيه مصري",
            formatted: `${prices.egp} ج.م`,
            isFallback: false,
          };
        }
        if (prices.usd !== undefined && prices.usd !== null && prices.usd > 0) {
          return {
            amount: prices.usd,
            currency: "USD",
            symbol: "$",
            label: "دولار أمريكي",
            formatted: `$${prices.usd}`,
            isFallback: true,
          };
        }
        if (prices.lyd !== undefined && prices.lyd !== null && prices.lyd > 0) {
          return {
            amount: prices.lyd,
            currency: "LYD",
            symbol: "د.ل",
            label: "دينار ليبي",
            formatted: `${prices.lyd} د.ل`,
            isFallback: true,
          };
        }
      }

      // Rule 3: Libya Visitors / LYD Target
      if (targetCurrency === "LYD") {
        if (prices.lyd !== undefined && prices.lyd !== null && prices.lyd > 0) {
          return {
            amount: prices.lyd,
            currency: "LYD",
            symbol: "د.ل",
            label: "دينار ليبي",
            formatted: `${prices.lyd} د.ل`,
            isFallback: false,
          };
        }
        if (prices.egp !== undefined && prices.egp !== null && prices.egp > 0) {
          return {
            amount: prices.egp,
            currency: "EGP",
            symbol: "ج.م",
            label: "جنيه مصري",
            formatted: `${prices.egp} ج.م`,
            isFallback: true,
          };
        }
        if (prices.usd !== undefined && prices.usd !== null && prices.usd > 0) {
          return {
            amount: prices.usd,
            currency: "USD",
            symbol: "$",
            label: "دولار أمريكي",
            formatted: `$${prices.usd}`,
            isFallback: true,
          };
        }
      }

      return {
        amount: null,
        currency: targetCurrency,
        symbol: "",
        label: "",
        formatted: "سعر غير محدد",
      };
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        countryCode,
        isManual,
        setCurrency,
        resetToAuto,
        formatBookPrice,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
