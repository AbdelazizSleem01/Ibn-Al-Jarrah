"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaBook,
  FaTags,
  FaCheckCircle,
  FaTimesCircle,
  FaStar,
  FaImage,
  FaBookOpen,
} from "react-icons/fa";

interface StatsData {
  totalBooks: number;
  totalCategories: number;
  availableBooks: number;
  unavailableBooks: number;
  featuredBooks: number;
  noImageBooks: number;
  softDeletedBooks: number;
  recentBooks: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cards = [
    {
      title: "إجمالي الكتب",
      value: stats?.totalBooks ?? 0,
      icon: FaBook,
      color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "الكتب المتاحة",
      value: stats?.availableBooks ?? 0,
      icon: FaCheckCircle,
      color: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "الكتب غير المتاحة",
      value: stats?.unavailableBooks ?? 0,
      icon: FaTimesCircle,
      color: "bg-red-500/15 text-red-400 border-red-500/20",
    },
    {
      title: "إجمالي التصنيفات",
      value: stats?.totalCategories ?? 0,
      icon: FaTags,
      color: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    },
    {
      title: "الكتب المميزة",
      value: stats?.featuredBooks ?? 0,
      icon: FaStar,
      color: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    {
      title: "كتب بدون غلاف",
      value: stats?.noImageBooks ?? 0,
      icon: FaImage,
      color: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    },
  ];

  return (
    <div className="flex flex-col gap-6 text-right transition-colors duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
          <span>لوحة التحكم والمؤشرات</span>
          <span className={`transition-all duration-300 flex items-center justify-center w-6 h-6 ${loading ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </span>
        </h1>
        <p className="teexport default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cards = [
    {
      title: "إجمالي الكتب",
      value: stats?.totalBooks ?? 0,
      icon: FaBook,
      color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "الكتب المتاحة",
      value: stats?.availableBooks ?? 0,
      icon: FaCheckCircle,
      color: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "الكتب غير المتاحة",
      value: stats?.unavailableBooks ?? 0,
      icon: FaTimesCircle,
      color: "bg-red-500/15 text-red-400 border-red-500/20",
    },
    {
      title: "إجمالي التصنيفات",
      value: stats?.totalCategories ?? 0,
      icon: FaTags,
      color: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    },
    {
      title: "الكتب المميزة",
      value: stats?.featuredBooks ?? 0,
      icon: FaStar,
      color: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    {
      title: "كتب بدون غلاف",
      value: stats?.noImageBooks ?? 0,
      icon: FaImage,
      color: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6 text-right transition-colors duration-300">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
            <span>لوحة التحكم والمؤشرات</span>
            <span className="w-6 h-6 flex items-center justify-center">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </span>
          </h1>
          <p className="text-xs text-foreground/60 mt-1">نظرة عامة على إحصائيات وعمليات دار ابن الجراح</p>
        </div>

        {/* Stats Cards Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-card-bg border border-border-color rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm h-28"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground/75 truncate">{card.title}</span>
                  <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <span className="h-8 flex items-center">
                  <span className="h-6 w-12 bg-foreground/10 rounded animate-pulse inline-block" />
                </span>
              </div>
            );
          })}
        </div>

        {/* Main Grid: Recent Books List Skeleton */}
        <div className="grid grid-cols-1 gap-6 mt-4">
          <div className="bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm transition-colors duration-300">
            <div className="flex items-center justify-between border-b border-border-color pb-4 mb-4">
              <h2 className="font-extrabold text-sm md:text-base text-foreground">
                أحدث الكتب المضافة
              </h2>
              <span className="text-xs text-primary font-bold hover:underline opacity-50 cursor-not-allowed">
                إدارة كل الكتب &larr;
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs md:text-sm table-fixed">
                <thead>
                  <tr className="bg-foreground/[0.01] border-b border-border-color text-foreground/70">
                    <th className="p-3 font-bold whitespace-nowrap w-[40%]">اسم الكتاب</th>
                    <th className="p-3 font-bold whitespace-nowrap w-[20%]">المؤلف</th>
                    <th className="p-3 font-bold whitespace-nowrap w-[15%]">التصنيف</th>
                    <th className="p-3 font-bold whitespace-nowrap w-[13%]">السعر (جنيه)</th>
                    <th className="p-3 font-bold whitespace-nowrap w-[12%]">حالة التوفر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/50">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse h-[58px]">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-9 rounded bg-foreground/10 shrink-0" />
                          <div className="h-4 bg-foreground/10 rounded w-28 shrink-0" />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="h-4 bg-foreground/10 rounded w-20" />
                      </td>
                      <td className="p-3">
                        <div className="h-4 bg-foreground/10 rounded w-16" />
                      </td>
                      <td className="p-3">
                        <div className="h-4 bg-foreground/10 rounded w-12" />
                      </td>
                      <td className="p-3">
                        <div className="h-4 bg-foreground/10 rounded w-10" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-right transition-colors duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
          <span>لوحة التحكم والمؤشرات</span>
          <span className="w-6 h-6 flex items-center justify-center opacity-0 scale-75 pointer-events-none transition-all duration-300">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </span>
        </h1>
        <p className="text-xs text-foreground/60 mt-1">نظرة عامة على إحصائيات وعمليات دار ابن الجراح</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-card-bg border border-border-color rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 h-28"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground/75 truncate">{card.title}</span>
                <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <span className="h-8 text-2xl font-black text-foreground tracking-tight leading-none flex items-center">
                {card.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Recent Books List */}
      <div className="grid grid-cols-1 gap-6 mt-4">
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm transition-colors duration-300">
          
          <div className="flex items-center justify-between border-b border-border-color pb-4 mb-4">
            <h2 className="font-extrabold text-sm md:text-base text-foreground">
              أحدث الكتب المضافة
            </h2>
            <Link
              href="/admin/books"
              className="text-xs text-primary font-bold hover:underline"
            >
              إدارة كل الكتب &larr;
            </Link>
          </div>

          {!stats?.recentBooks || stats.recentBooks.length === 0 ? (
            <div className="text-center py-12 text-xs text-foreground/50">
              لا توجد كتب مضافة في قاعدة البيانات حالياً.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs md:text-sm table-fixed">
                <thead>
                  <tr className="bg-foreground/[0.01] border-b border-border-color text-foreground/70">
                    <th className="p-3 font-bold whitespace-nowrap w-[40%]">اسم الكتاب</th>
                    <th className="p-3 font-bold whitespace-nowrap w-[20%]">المؤلف</th>
                    <th className="p-3 font-bold whitespace-nowrap w-[15%]">التصنيف</th>
                    <th className="p-3 font-bold whitespace-nowrap w-[13%]">السعر (جنيه)</th>
                    <th className="p-3 font-bold whitespace-nowrap w-[12%]">حالة التوفر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/50">
                  {stats.recentBooks.map((book) => (
                    <tr key={book._id} className="hover:bg-foreground/[0.01] transition-colors h-[58px]">
                      <td className="p-3 font-bold text-foreground">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {book.coverImage?.secureUrl ? (
                            <img
                              src={book.coverImage.secureUrl}
                              alt=""
                              className="w-7 h-9 object-cover rounded shadow-sm border border-border-color shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-9 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-[8px] shadow-sm shrink-0">
                              كتاب
                            </div>
                          )}
                          <span className="truncate block" title={book.title}>{book.title}</span>
                        </div>
                      </td>
                      <td className="p-3 text-foreground/80">
                        <div className="truncate" title={book.author || ""}>{book.author || "—"}</div>
                      </td>
                      <td className="p-3 text-foreground/70">
                        <div className="truncate" title={book.categoryId?.name || ""}>{book.categoryId?.name || "عام"}</div>
                      </td>
                      <td className="p-3 font-bold text-primary">
                        {book.prices?.egp !== undefined ? `${book.prices.egp} ج.م` : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            book.availabilityStatus === "available"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {book.availabilityStatus === "available" ? "متوفر" : "نفد"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
