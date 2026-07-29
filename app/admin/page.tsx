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
  FaShoppingBag,
  FaMoneyBillWave,
  FaChartLine,
  FaBoxOpen,
  FaClock,
  FaTruck,
  FaAward,
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

  // Sales & Orders analytics
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalBooksSold: number;
  totalRevenueEGP: number;
  totalProfitEGP: number;
  recentOrders: any[];
  topSellingItems: any[];
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

  const salesCards = [
    {
      title: "إجمالي المبيعات (الإيرادات)",
      value: `${stats?.totalRevenueEGP ?? 0} ج.م`,
      subText: "إجمالي قيمة الطلبات المحصلة",
      icon: FaMoneyBillWave,
      color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
    },
    {
      title: "إجمالي صافي الأرباح",
      value: `+${stats?.totalProfitEGP ?? 0} ج.م`,
      subText: "الربح المحسوب بعد خصم التكلفة",
      icon: FaChartLine,
      color: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    },
    {
      title: "عدد الكتب المباعة",
      value: `${stats?.totalBooksSold ?? 0} نسخة`,
      subText: "إجمالي عدد المجلدات المباعة",
      icon: FaBoxOpen,
      color: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    },
    {
      title: "إجمالي الطلبات",
      value: stats?.totalOrders ?? 0,
      subText: `${stats?.pendingOrders ?? 0} طلب قيد الانتظار`,
      icon: FaShoppingBag,
      color: "bg-purple-500/15 text-purple-500 border-purple-500/20",
    },
  ];

  const bookCards = [
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
  ];

  return (
    <div className="flex flex-col gap-6 text-right transition-colors duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <FaChartLine className="w-5 h-5" />
        </div>
        <h1 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
          <span>لوحة التحكم ومؤشرات المبيعات</span>
          <span className={`transition-all duration-300 flex items-center justify-center w-6 h-6 ${loading ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </span>
        </h1>
      </div>

      {/* Sales & Financial Overview Section */}
      <div>
        <h2 className="text-sm font-black text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
          <FaMoneyBillWave /> مؤشرات المبيعات والأرباح المالية
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {salesCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-card-bg border border-border-color rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground/75">{card.title}</span>
                  <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground tracking-tight">
                    {loading ? <span className="h-6 w-16 bg-foreground/10 rounded animate-pulse inline-block" /> : card.value}
                  </div>
                  <div className="text-[11px] text-foreground/50 mt-1 font-medium">{card.subText}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Book Catalog Stats Grid */}
      <div>
        <h2 className="text-sm font-black text-foreground/80 mb-3 flex items-center gap-2">
          <FaBook className="text-primary text-xs" /> إحصائيات المفتخر والمخزن
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {bookCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-card-bg border border-border-color rounded-xl p-4 flex flex-col justify-between gap-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground/75 truncate">{card.title}</span>
                  <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${card.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                </div>
                <span className="text-xl font-black text-foreground">
                  {loading ? <span className="h-5 w-10 bg-foreground/10 rounded animate-pulse inline-block" /> : card.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Top Sellers & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Selling Books */}
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border-color pb-3">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <FaAward className="text-amber-500" /> أكثر الكتب مبيعاً (Top Sellers)
            </h3>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-foreground/50">جاري التحميل...</div>
          ) : !stats?.topSellingItems || stats.topSellingItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-foreground/50">لا توجد كتب مباعة بعد</div>
          ) : (
            <div className="divide-y divide-border-color/50 text-xs">
              {stats.topSellingItems.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between hover:bg-muted/30 px-2 rounded-lg transition">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-foreground truncate max-w-[200px]">{item.title}</h4>
                      <span className="text-[10px] text-foreground/50">إجمالي المبيعات: {item.totalSalesValue} ج.م</span>
                    </div>
                  </div>
                  <div className="font-black text-primary bg-primary/10 px-3 py-1 rounded-xl">
                    {item.totalQuantity} مبيعة
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders List */}
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border-color pb-3">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <FaShoppingBag className="text-primary" /> أحدث الطلبات الواردة
            </h3>
            <Link href="/admin/orders" className="text-xs text-primary font-bold hover:underline">
              عرض كل الطلبات &larr;
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-foreground/50">جاري التحميل...</div>
          ) : !stats?.recentOrders || stats.recentOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-foreground/50">لا توجد طلبات واردة بعد</div>
          ) : (
            <div className="divide-y divide-border-color/50 text-xs">
              {stats.recentOrders.map((ord) => (
                <div key={ord._id} className="py-2.5 flex items-center justify-between hover:bg-muted/30 px-2 rounded-lg transition">
                  <div>
                    <div className="font-bold font-mono text-primary">{ord.orderNumber}</div>
                    <div className="text-[11px] text-foreground/70">{ord.customerName} ({ord.governorate})</div>
                  </div>
                  <div className="text-left">
                    <div className="font-black text-foreground">{ord.grandTotal} {ord.currency}</div>
                    <span className="text-[10px] font-bold text-amber-500 px-2 py-0.5 rounded bg-amber-500/10 inline-block mt-0.5">
                      {ord.orderStatus === "pending" ? "قيد الانتظار" : ord.orderStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Main Grid: Recent Books List */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm">
          
          <div className="flex items-center justify-between border-b border-border-color pb-4 mb-4">
            <h2 className="font-extrabold text-sm md:text-base text-foreground">
              أحدث الكتب المضافة في المكتبة
            </h2>
            <Link href="/admin/books" className="text-xs text-primary font-bold hover:underline">
              إدارة كل الكتب &larr;
            </Link>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-foreground/[0.01] border-b border-border-color text-foreground/70">
                  <th className="p-3 font-bold">اسم الكتاب</th>
                  <th className="p-3 font-bold">المؤلف</th>
                  <th className="p-3 font-bold">التصنيف</th>
                  <th className="p-3 font-bold">السعر (جنيه)</th>
                  <th className="p-3 font-bold">حالة التوفر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/50">
                {!stats?.recentBooks || stats.recentBooks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-xs text-foreground/50">
                      لا توجد كتب مضافة في قاعدة البيانات حالياً.
                    </td>
                  </tr>
                ) : (
                  stats.recentBooks.map((book) => (
                    <tr key={book._id} className="hover:bg-foreground/[0.01] transition-colors">
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
                          <span className="truncate block">{book.title}</span>
                        </div>
                      </td>
                      <td className="p-3 text-foreground/80">{book.author || "—"}</td>
                      <td className="p-3 text-foreground/70">{book.categoryId?.name || "عام"}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

    </div>
  );
}
