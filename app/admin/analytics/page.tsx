"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FaChartLine,
  FaChartBar,
  FaMoneyBillWave,
  FaShoppingBag,
  FaBoxOpen,
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaMapMarkerAlt,
  FaBook,
  FaTags,
  FaStar,
  FaChartPie,
  FaArrowUp,
  FaCalendarAlt,
  FaWallet,
  FaEye,
} from "react-icons/fa";

interface AnalyticsData {
  period: string;
  kpis: {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    deliveredOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    totalBooksSold: number;
    avgOrderValue: number;
    deliveryRate: number;
  };
  inventory: {
    totalCatalogBooks: number;
    availableBooks: number;
    unavailableBooks: number;
    totalInventoryValue: number;
  };
  dailyTrend: Array<{
    _id: string;
    revenue: number;
    profit: number;
    ordersCount: number;
  }>;
  orderStatusDistribution: Array<{
    _id: string;
    count: number;
    totalValue: number;
  }>;
  paymentMethodDistribution: Array<{
    _id: string;
    count: number;
    totalValue: number;
  }>;
  governorateSales: Array<{
    _id: string;
    ordersCount: number;
    totalRevenue: number;
  }>;
  topBooks: Array<{
    _id: string;
    title: string;
    slug: string;
    coverImage?: string;
    quantitySold: number;
    totalSales: number;
  }>;
  topCategories: Array<{
    name: string;
    bookCount: number;
  }>;
}

const PAYMENT_LABELS: Record<string, string> = {
  vodafone_cash: "فودافون كاش",
  instapay: "انستا باي InstaPay",
  cash_on_delivery: "الدفع عند الاستلام",
  bank_transfer: "تحويل بنكي مباشر",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  confirmed: { label: "مؤكد", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  processing: { label: "قيد التجهيز", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  shipped: { label: "تم الشحن", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  delivered: { label: "تم التسليم ✓", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  cancelled: { label: "ملغي ✗", color: "bg-red-500/10 text-red-500 border-red-500/20" },
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [chartMode, setChartMode] = useState<"area" | "bar">("area");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?period=${period}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Analytics fetch error:", err);
        setLoading(false);
      });
  }, [period]);

  const periods = [
    { key: "7d", label: "آخر 7 أيام" },
    { key: "30d", label: "آخر 30 يوم" },
    { key: "90d", label: "آخر 3 أشهر" },
    { key: "1y", label: "السنة الحالية" },
    { key: "all", label: "كافة الأوقات" },
  ];

  // Generate full continuous timeline array so line graph & bars never look empty
  const timelineData = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { revenue: number; profit: number; ordersCount: number }>();
    data.dailyTrend.forEach((d) => {
      map.set(d._id, { revenue: d.revenue, profit: d.profit, ordersCount: d.ordersCount });
    });

    const numPoints = period === "7d" ? 7 : period === "30d" ? 14 : period === "90d" ? 24 : 30;
    const result: Array<{ date: string; label: string; revenue: number; profit: number; ordersCount: number }> = [];

    const today = new Date();
    for (let i = numPoints - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = dateStr.slice(5); // "MM-DD"

      const existing = map.get(dateStr) || { revenue: 0, profit: 0, ordersCount: 0 };
      result.push({
        date: dateStr,
        label,
        revenue: existing.revenue,
        profit: existing.profit,
        ordersCount: existing.ordersCount,
      });
    }

    return result;
  }, [data, period]);

  // Max Revenue scaling
  const maxRevenue = useMemo(() => {
    return Math.max(100, ...timelineData.map((d) => d.revenue));
  }, [timelineData]);

  // SVG Chart Geometry
  const svgWidth = 1000;
  const svgHeight = 280;
  const paddingX = 65;
  const paddingTop = 35;
  const paddingBottom = 45;
  const plotWidth = svgWidth - paddingX - 25;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const y0 = svgHeight - paddingBottom;

  const svgPoints = useMemo(() => {
    if (timelineData.length === 0) return [];
    return timelineData.map((d, i) => {
      const x = paddingX + (i / Math.max(1, timelineData.length - 1)) * plotWidth;
      const y = y0 - (d.revenue / maxRevenue) * plotHeight;
      return { x, y, data: d };
    });
  }, [timelineData, maxRevenue, plotWidth, plotHeight, y0]);

  // Smooth Bezier Curve Calculation
  const { pathD, areaD } = useMemo(() => {
    if (svgPoints.length === 0) return { pathD: "", areaD: "" };
    if (svgPoints.length === 1) {
      const p = svgPoints[0];
      return {
        pathD: `M ${paddingX} ${p.y} L ${svgWidth - 25} ${p.y}`,
        areaD: `M ${paddingX} ${p.y} L ${svgWidth - 25} ${p.y} L ${svgWidth - 25} ${y0} L ${paddingX} ${y0} Z`,
      };
    }

    let pD = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
    for (let i = 0; i < svgPoints.length - 1; i++) {
      const p0 = svgPoints[i];
      const p1 = svgPoints[i + 1];
      const cx = (p0.x + p1.x) / 2;
      pD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const lastP = svgPoints[svgPoints.length - 1];
    const firstP = svgPoints[0];
    const aD = `${pD} L ${lastP.x} ${y0} L ${firstP.x} ${y0} Z`;

    return { pathD: pD, areaD: aD };
  }, [svgPoints, y0]);

  // Y-Axis Grid Steps
  const ySteps = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="flex flex-col gap-6 text-right transition-colors duration-300 font-sans pb-12">
      
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <FaChartLine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
              لوحة الإحصائيات والتقارير المالية الشاملة
            </h1>
            <p className="text-xs text-foreground/60 mt-0.5">تحليل شامل للمبيعات، الإيرادات، وسلوك طلبات العملاء</p>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex items-center gap-1.5 bg-card-bg border border-border-color p-1 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                period === p.key
                  ? "bg-primary text-white shadow-md gold-glow"
                  : "text-foreground/75 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Hero Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue Card */}
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-primary/40 transition-all duration-300 gold-glow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground/75">إجمالي الإيرادات المحصلة</span>
            <span className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <FaMoneyBillWave className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
              {loading ? <span className="h-7 w-24 bg-foreground/10 rounded animate-pulse inline-block" /> : `${data?.kpis.totalRevenue ?? 0} ج.م`}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold mt-1">
              <FaArrowUp className="w-3 h-3" />
              <span>مبيعات الطلبات المؤكدة والتسليمات</span>
            </div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-primary/40 transition-all duration-300 gold-glow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground/75">صافي الأرباح المحسوبة</span>
            <span className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <FaWallet className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-primary font-mono tracking-tight">
              {loading ? <span className="h-7 w-24 bg-foreground/10 rounded animate-pulse inline-block" /> : `+${data?.kpis.totalProfit ?? 0} ج.م`}
            </div>
            <div className="text-[11px] text-foreground/60 font-medium mt-1">الربح الصافي بعد خصم سعر التكلفة بالجملة</div>
          </div>
        </div>

        {/* Total Books Sold */}
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-primary/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground/75">عدد المجلدات المباعة</span>
            <span className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
              <FaBoxOpen className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
              {loading ? <span className="h-7 w-20 bg-foreground/10 rounded animate-pulse inline-block" /> : `${data?.kpis.totalBooksSold ?? 0} نسخة`}
            </div>
            <div className="text-[11px] text-foreground/60 font-medium mt-1">معدل الطلب: {data?.kpis.avgOrderValue ?? 0} ج.م / طلب</div>
          </div>
        </div>

        {/* Total Orders & Delivery Rate */}
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-primary/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground/75">إجمالي الطلبات ومعدل التسليم</span>
            <span className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
              <FaShoppingBag className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
                {loading ? <span className="h-7 w-16 bg-foreground/10 rounded animate-pulse inline-block" /> : data?.kpis.totalOrders ?? 0}
              </span>
              <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                {data?.kpis.deliveryRate ?? 0}% تسليم
              </span>
            </div>
            <div className="text-[11px] text-foreground/60 font-medium mt-1">
              قيد الانتظار: {data?.kpis.pendingOrders ?? 0} | ملغي: {data?.kpis.cancelledOrders ?? 0}
            </div>
          </div>
        </div>

      </div>

      {/* Main Section 1: Interactive Sales & Revenue Trend Chart */}
      <div className="bg-card-bg border border-border-color rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 transition-colors relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-color/40 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FaChartLine />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-foreground">الرسم البياني لمسار المبيعات والإيرادات اليومية</h3>
              <p className="text-[11px] text-foreground/50">تطور المبيعات اليومية المحصلة والمنحنى المالي خلال الفترة</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            {/* Chart Mode Toggle */}
            <div className="flex items-center gap-1 bg-foreground/5 p-1 rounded-xl border border-border-color/30">
              <button
                type="button"
                onClick={() => setChartMode("area")}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  chartMode === "area" ? "bg-primary text-white shadow-sm" : "text-foreground/70 hover:text-foreground"
                }`}
              >
                <FaChartLine className="w-3.5 h-3.5" /> منحنى سلس
              </button>
              <button
                type="button"
                onClick={() => setChartMode("bar")}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  chartMode === "bar" ? "bg-primary text-white shadow-sm" : "text-foreground/70 hover:text-foreground"
                }`}
              >
                <FaChartBar className="w-3.5 h-3.5" /> أعمدة بيانية
              </button>
            </div>
          </div>
        </div>

        {/* SVG Interactive Area & Line & Bar Chart */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-xs text-foreground/50">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2" />
            جاري رسم البيانات البيانية...
          </div>
        ) : (
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-64 sm:h-72 select-none overflow-visible"
            >
              <defs>
                {/* Linear Gradient for Fill */}
                <linearGradient id="chartGoldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4af37" stopOpacity="0.55" />
                  <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines & Y-Axis High-Contrast Labels */}
              {ySteps.map((step, idx) => {
                const gridY = paddingTop + (1 - step) * plotHeight;
                const valueLabel = Math.round(maxRevenue * step);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={gridY}
                      x2={svgWidth - 25}
                      y2={gridY}
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-border-color/50"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 10}
                      y={gridY + 4}
                      textAnchor="end"
                      fill="currentColor"
                      className="text-slate-800 dark:text-slate-100 font-black text-[12px] font-mono"
                    >
                      {valueLabel} ج.م
                    </text>
                  </g>
                );
              })}

              {/* Area Curve Mode */}
              {chartMode === "area" && (
                <>
                  {/* Area Polygon Fill */}
                  {areaD && (
                    <path
                      d={areaD}
                      fill="url(#chartGoldGradient)"
                      className="transition-all duration-700"
                    />
                  )}

                  {/* Smooth Bezier Line */}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#d4af37"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-700 drop-shadow-md"
                    />
                  )}

                  {/* Data Points / Circles */}
                  {svgPoints.map((pt, idx) => {
                    const isHovered = hoveredPoint?.date === pt.data.date;
                    const hasRevenue = pt.data.revenue > 0;
                    return (
                      <g
                        key={idx}
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredPoint(pt.data)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? "7" : hasRevenue ? "5" : "3.5"}
                          fill={hasRevenue ? "#d4af37" : "currentColor"}
                          className={`${hasRevenue ? "stroke-card-bg text-primary" : "text-border-color/60"} transition-all duration-200`}
                          strokeWidth="2"
                        />
                        {/* High Contrast Date Label on X-Axis */}
                        <text
                          x={pt.x}
                          y={svgHeight - 12}
                          textAnchor="middle"
                          fill="currentColor"
                          className={`text-[11px] font-mono font-bold transition-colors ${
                            isHovered ? "text-primary font-black" : "text-slate-700 dark:text-slate-200 font-bold"
                          }`}
                        >
                          {pt.data.label}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}

              {/* Bar Chart Mode */}
              {chartMode === "bar" && (
                <>
                  {svgPoints.map((pt, idx) => {
                    const isHovered = hoveredPoint?.date === pt.data.date;
                    const hasRevenue = pt.data.revenue > 0;
                    const barWidth = Math.max(12, Math.min(32, (plotWidth / svgPoints.length) * 0.65));
                    const barX = pt.x - barWidth / 2;
                    const barHeight = Math.max(4, y0 - pt.y);

                    return (
                      <g
                        key={idx}
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredPoint(pt.data)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <rect
                          x={barX}
                          y={pt.y}
                          width={barWidth}
                          height={barHeight}
                          rx="6"
                          fill="url(#chartGoldGradient)"
                          stroke="#d4af37"
                          strokeWidth={isHovered ? "2.5" : "1.5"}
                          className="transition-all duration-300 hover:brightness-125"
                        />

                        {/* Revenue Value Badge over Bar */}
                        {hasRevenue && (
                          <text
                            x={pt.x}
                            y={pt.y - 8}
                            textAnchor="middle"
                            fill="currentColor"
                            className="text-amber-500 dark:text-amber-400 font-black text-[11px] font-mono"
                          >
                            {pt.data.revenue} ج.م
                          </text>
                        )}

                        {/* High Contrast Date Label on X-Axis */}
                        <text
                          x={pt.x}
                          y={svgHeight - 12}
                          textAnchor="middle"
                          fill="currentColor"
                          className={`text-[11px] font-mono font-bold transition-colors ${
                            isHovered ? "text-primary font-black" : "text-slate-700 dark:text-slate-200 font-bold"
                          }`}
                        >
                          {pt.data.label}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>

            {/* Floating Interactive Tooltip */}
            {hoveredPoint && (
              <div className="absolute top-2 right-1/2 translate-x-1/2 bg-black/90 text-white text-xs font-bold px-4 py-2 rounded-2xl border border-primary/40 shadow-2xl backdrop-blur-md z-30 animate-fadeIn text-center space-y-0.5">
                <div className="text-primary font-mono text-[11px]">{hoveredPoint.date}</div>
                <div className="text-sm font-black">{hoveredPoint.revenue} ج.م إيرادات</div>
                <div className="text-[11px] text-emerald-400 font-medium">أرباح: +{hoveredPoint.profit} ج.م ({hoveredPoint.ordersCount} طلب)</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Section 2: Two Column Grid (Order Distribution & Governorates) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Order Status & Payment Breakdown */}
        <div className="space-y-6">
          
          {/* Order Status Breakdown */}
          <div className="bg-card-bg border border-border-color rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 border-b border-border-color/40 pb-3">
              <FaChartPie className="text-primary" /> توزع حالات الطلبات الواردة
            </h3>

            {loading ? (
              <div className="py-6 text-center text-xs text-foreground/50">جاري التحميل...</div>
            ) : (
              <div className="space-y-3">
                {data?.orderStatusDistribution.map((st) => {
                  const statusInfo = STATUS_LABELS[st._id] || { label: st._id, color: "bg-foreground/10 text-foreground" };
                  const percent = data.kpis.totalOrders > 0 ? Math.round((st.count / data.kpis.totalOrders) * 100) : 0;
                  return (
                    <div key={st._id} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className="font-mono text-foreground/75">
                          {st.count} طلب ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-foreground/5 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="bg-primary h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Method Share */}
          <div className="bg-card-bg border border-border-color rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 border-b border-border-color/40 pb-3">
              <FaWallet className="text-emerald-500" /> نسب استخدام طرق الدفع
            </h3>

            {loading ? (
              <div className="py-6 text-center text-xs text-foreground/50">جاري التحميل...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data?.paymentMethodDistribution.map((pay) => {
                  const label = PAYMENT_LABELS[pay._id] || pay._id;
                  const percent = data.kpis.totalOrders > 0 ? Math.round((pay.count / data.kpis.totalOrders) * 100) : 0;
                  return (
                    <div key={pay._id} className="p-3.5 rounded-2xl bg-foreground/[0.03] border border-border-color/30 flex flex-col justify-between gap-2">
                      <div className="text-xs font-bold text-foreground/80 truncate">{label}</div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-black text-primary font-mono">{pay.count} طلب</span>
                        <span className="text-xs font-bold text-foreground/60">{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Geographic Distribution (Governorates) */}
        <div className="bg-card-bg border border-border-color rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border-color/40 pb-3">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <FaMapMarkerAlt className="text-amber-500" /> توزيع المبيعات حسب المحافظات الأكثر طلباً
            </h3>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-foreground/50">جاري التحميل...</div>
          ) : !data?.governorateSales || data.governorateSales.length === 0 ? (
            <div className="py-12 text-center text-xs text-foreground/50">لا توجد بيانات شحن للمحافظات في هذه الفترة</div>
          ) : (
            <div className="space-y-4 text-xs">
              {data.governorateSales.map((gov, idx) => {
                const maxGovRevenue = data.governorateSales[0]?.totalRevenue || 1;
                const percent = Math.round((gov.totalRevenue / maxGovRevenue) * 100);
                return (
                  <div key={gov._id} className="p-3 rounded-2xl bg-foreground/[0.02] border border-border-color/20 space-y-1.5 hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-extrabold text-foreground">{gov._id || "غير محددة"}</span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="font-black text-primary text-sm">{gov.totalRevenue} ج.م</span>
                        <span className="text-[10px] text-foreground/50 block">{gov.ordersCount} طلب شحن</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-foreground/5 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-primary h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Main Section 3: Top Best Selling Books & Catalog Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Selling Books (2 Columns Span) */}
        <div className="lg:col-span-2 bg-card-bg border border-border-color rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border-color/40 pb-3">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <FaStar className="text-amber-500" /> قائمة الكتب الأكثر مبيعاً وتحقيقاً للإيرادات (Top Performers)
            </h3>
            <Link href="/admin/books" className="text-xs text-primary font-bold hover:underline">
              عرض الكتالوج &larr;
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-foreground/50">جاري تحميل قائمة الأكثر مبيعاً...</div>
          ) : !data?.topBooks || data.topBooks.length === 0 ? (
            <div className="py-12 text-center text-xs text-foreground/50">لا توجد كتب مباعة في هذه الفترة</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {data.topBooks.map((book, idx) => (
                <div key={book._id} className="p-3.5 rounded-2xl bg-foreground/[0.02] border border-border-color/30 flex items-center gap-3.5 hover:border-primary/40 transition-all">
                  <div className="relative w-12 h-16 rounded-xl overflow-hidden border border-border-color/40 bg-foreground/5 shrink-0 shadow-sm">
                    <img
                      src={book.coverImage || "/images/hero-book.webp"}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-0 right-0 bg-primary text-white font-black text-[9px] w-5 h-5 rounded-br-xl flex items-center justify-center">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-bold text-foreground truncate text-xs" title={book.title}>{book.title}</h4>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground/60">المبيعات: <strong className="text-primary font-mono">{book.quantitySold} نسخة</strong></span>
                      <span className="font-black font-mono text-foreground">{book.totalSales} ج.م</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catalog & Inventory Overview */}
        <div className="bg-card-bg border border-border-color rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 border-b border-border-color/40 pb-3">
            <FaBook className="text-primary" /> حالة الكتالوج والمخزون
          </h3>

          {loading ? (
            <div className="py-8 text-center text-xs text-foreground/50">جاري التحميل...</div>
          ) : (
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-foreground/[0.03] border border-border-color/30 flex items-center justify-between">
                <span className="text-foreground/75 font-bold">إجمالي الكتب النشطة</span>
                <span className="text-base font-black text-primary font-mono">{data?.inventory.totalCatalogBooks ?? 0} كتاب</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">الكتب المتوفرة للطلب</span>
                <span className="text-base font-black text-emerald-600 font-mono">{data?.inventory.availableBooks ?? 0}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                <span className="text-red-700 dark:text-red-400 font-bold">الكتب غير المتوفرة (المنتهية)</span>
                <span className="text-base font-black text-red-600 font-mono">{data?.inventory.unavailableBooks ?? 0}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <span className="text-amber-700 dark:text-amber-400 font-bold">القيمة التقديرية للكتالوج</span>
                <span className="text-base font-black text-amber-600 font-mono">{data?.inventory.totalInventoryValue ?? 0} ج.م</span>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
