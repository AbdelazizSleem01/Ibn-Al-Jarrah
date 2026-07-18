"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaLock, FaEnvelope, FaEye, FaEyeSlash, FaHome } from "react-icons/fa";
import Swal from "sweetalert2";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const redirectPath = searchParams.get("redirect") || "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "البريد الإلكتروني مطلوب";
    if (!password) newErrors.password = "كلمة المرور مطلوبة";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "تم تسجيل الدخول بنجاح",
          text: "مرحباً بك في لوحة تحكم دار ابن الجراح",
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
          timer: 2000,
        }).then(() => {
          router.push(redirectPath);
          router.refresh();
        });
      } else {
        if (data.errors) {
          setErrors(data.errors);
        }
        
        Swal.fire({
          icon: "error",
          title: "فشل تسجيل الدخول",
          text: data.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة",
          confirmButtonText: "محاولة أخرى",
          confirmButtonColor: "#d4af37",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "خطأ في الاتصال",
        text: "تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالشبكة والتحقق مجدداً.",
        confirmButtonText: "موافق",
        confirmButtonColor: "#d4af37",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card-bg py-8 px-4 sm:px-10 border border-border-color rounded-2xl shadow-xl transition-colors duration-300">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Email Field */}
        <div className="flex flex-col gap-1.5 text-right">
          <label htmlFor="email" className="text-xs font-bold text-foreground/80">
            البريد الإلكتروني
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full bg-foreground/[0.02] border rounded-lg py-2.5 pl-3 pr-9 text-xs focus:outline-none transition-colors ${
                errors.email ? "border-red-500 focus:border-red-500" : "border-border-color focus:border-primary/50"
              }`}
              placeholder="admin@daraljarrah.com"
              disabled={loading}
            />
            <FaEnvelope className="absolute top-1/2 right-3 -translate-y-1/2 text-foreground/45 text-xs" />
          </div>
          {errors.email && (
            <span className="text-[10px] text-red-500 font-semibold">{errors.email}</span>
          )}
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5 text-right">
          <label htmlFor="password" className="text-xs font-bold text-foreground/80">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-foreground/[0.02] border rounded-lg py-2.5 pl-9 pr-9 text-xs focus:outline-none transition-colors ${
                errors.password ? "border-red-500 focus:border-red-500" : "border-border-color focus:border-primary/50"
              }`}
              placeholder="••••••••"
              disabled={loading}
            />
            <FaLock className="absolute top-1/2 right-3 -translate-y-1/2 text-foreground/45 text-xs" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-foreground/45 hover:text-primary transition-colors cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <FaEyeSlash className="w-3.5 h-3.5" /> : <FaEye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {errors.password && (
            <span className="text-[10px] text-red-500 font-semibold">{errors.password}</span>
          )}
        </div>

        {/* Remember Me Box */}
        <div className="flex items-center justify-between text-right">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground/80 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-border-color text-primary focus:ring-primary accent-primary"
              disabled={loading}
            />
            <span>تذكرني على هذا الجهاز</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-sm transition-all shadow-md gold-glow active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جاري تسجيل الدخول...
            </>
          ) : (
            "تسجيل الدخول"
          )}
        </button>

      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      
      {/* Home Redirect Button */}
      <Link
        href="/"
        className="absolute top-6 right-6 flex items-center gap-2 text-xs md:text-sm bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border-color px-4 py-2.5 rounded-full font-bold transition-all shadow-sm cursor-pointer"
      >
        <FaHome />
        <span>الرئيسية</span>
      </Link>

      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-1/4 -z-10 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 w-72 h-72 rounded-full bg-indigo-500/5 blur-3xl" />

      {/* Login Box Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-xl md:text-2xl font-black text-foreground transition-colors leading-tight">
          تسجيل دخول الإدارة
        </h2>
        <p className="mt-2 text-xs text-foreground/60 max-w">
          لوحة تحكم مؤسسة دار ابن الجراح العالمية للنشر والتوزيع
        </p>
      </div>

      {/* Login Box Card wrapped in Suspense */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Suspense fallback={
          <div className="bg-card-bg border border-border-color rounded-2xl p-10 shadow-xl flex items-center justify-center min-h-[300px]">
            <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
      
    </div>
  );
}
