"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FaSearch,
  FaTruck,
  FaCheckCircle,
  FaBoxOpen,
  FaHome,
  FaSpinner,
  FaCopy,
  FaCheck,
  FaDownload,
  FaFileInvoice,
  FaCalendarAlt,
  FaUser,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaBook,
  FaExclamationTriangle,
  FaRegTimesCircle,
} from "react-icons/fa";
import { useCurrency } from "@/context/CurrencyContext";

interface OrderItem {
  bookId: string;
  title: string;
  slug: string;
  price: number;
  quantity: number;
  totalPrice: number;
}

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  cityOrArea?: string;
  detailedAddress?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  grandTotal: number;
  currency: string;
  paymentMethod: string;
  orderStatus: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

function formatSafeAddress(order: Pick<OrderData, "governorate" | "cityOrArea" | "detailedAddress">) {
  return [order.governorate, order.cityOrArea || order.detailedAddress]
    .filter(Boolean)
    .join(" — ");
}

const STATUS_INDEXES = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
};

const TIMELINE_STEPS = [
  { key: "pending", label: "تم استلام الطلب", desc: "نراجع تفاصيل طلبك لتأكيده" },
  { key: "confirmed", label: "تم تأكيد الطلب", desc: "تم تأكيد طلبك بنجاح" },
  { key: "processing", label: "قيد التحضير", desc: "جاري تجهيز وتغليف شحنتك" },
  { key: "shipped", label: "جاري الشحن", desc: "الطلب مع شركة الشحن للتوصيل" },
  { key: "delivered", label: "تم التسليم", desc: "تم تسليم الطلب، قراءة ممتعة!" },
];

function TrackerContent() {
  const { currency: siteCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [phoneLast4Input, setPhoneLast4Input] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-fetch if orderNumber query param is present
  useEffect(() => {
    const urlOrderNum = searchParams.get("orderNumber");
    const urlPhoneLast4 = searchParams.get("phoneLast4") || "";
    if (urlOrderNum && /^\d{4}$/.test(urlPhoneLast4)) {
      setOrderNumberInput(urlOrderNum);
      setPhoneLast4Input(urlPhoneLast4);
      handleTrack(urlOrderNum, urlPhoneLast4);
    }
  }, [searchParams]);

  const handleTrack = async (num: string, phoneLast4: string) => {
    if (!num.trim() || !/^\d{4}$/.test(phoneLast4)) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        orderNumber: num.trim(),
        phoneLast4,
      });
      const res = await fetch(`/api/orders/track?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        setOrder(null);
        setError(data.message || "لم يتم العثور على الطلب");
      }
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumberInput.trim() || !/^\d{4}$/.test(phoneLast4Input)) return;

    // Update query param without full page reload
    const params = new URLSearchParams(window.location.search);
    params.set("orderNumber", orderNumberInput.trim());
    params.set("phoneLast4", phoneLast4Input);
    router.replace(`${window.location.pathname}?${params.toString()}`);
    handleTrack(orderNumberInput, phoneLast4Input);
  };

  const handleCopy = () => {
    if (!order) return;
    navigator.clipboard.writeText(`#${order.orderNumber}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPDF = () => {
    if (!order) return;
    const payLabel =
      order.paymentMethod === "vodafone_cash" ? "فودافون كاش" :
      order.paymentMethod === "instapay" ? "إنستا باي" :
      order.paymentMethod === "cash_on_delivery" ? "الدفع عند الاستلام" : "تحويل بنكي";
    const total = `${order.grandTotal} ${order.currency || siteCurrency}`;
    const now = new Date(order.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
    const safeAddress = formatSafeAddress(order);

    const rowsHtml = order.items.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#fffdf7" : "#fff9ee"}">
        <td style="padding:13px 22px;color:#8a7455;font-size:13px;font-weight:600;border-bottom:1px solid #f0e6cc;width:42%">تفاصيل الكتاب</td>
        <td style="padding:13px 22px;color:#1e1608;font-size:13px;font-weight:700;border-bottom:1px solid #f0e6cc">${item.title} (${item.quantity} نسخة)</td>
      </tr>`).join("");

    const extraRows = [
      `<tr><td style="padding:13px 22px;color:#8a7455;font-size:13px;font-weight:600;border-bottom:1px solid #f0e6cc">اسم العميل</td><td style="padding:13px 22px;color:#1e1608;font-size:13px;font-weight:700;border-bottom:1px solid #f0e6cc">${order.customerName}</td></tr>`,
      `<tr><td style="padding:13px 22px;color:#8a7455;font-size:13px;font-weight:600;border-bottom:1px solid #f0e6cc">رقم الهاتف</td><td style="padding:13px 22px;color:#1e1608;font-size:13px;font-weight:700;border-bottom:1px solid #f0e6cc">${order.customerPhone}</td></tr>`,
      `<tr><td style="padding:13px 22px;color:#8a7455;font-size:13px;font-weight:600;border-bottom:1px solid #f0e6cc">المحافظة والعنوان</td><td style="padding:13px 22px;color:#1e1608;font-size:13px;font-weight:700;border-bottom:1px solid #f0e6cc">${safeAddress}</td></tr>`,
      `<tr><td style="padding:13px 22px;color:#8a7455;font-size:13px;font-weight:600;border-bottom:1px solid #f0e6cc">طريقة الدفع</td><td style="padding:13px 22px;color:#1e1608;font-size:13px;font-weight:700;border-bottom:1px solid #f0e6cc">${payLabel}</td></tr>`
    ].join("");

    const logoUrl = window.location.origin + "/images/logo.webp";

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>طلب #${order.orderNumber} - دار ابن الجراح</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',Arial,sans-serif;background:#f5f0e8;color:#1e1608;direction:rtl;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 16px 48px}
@page{size:A4 portrait;margin:12mm}
@media print{body{background:#fff;padding:0}.no-print{display:none!important}}
.card{width:100%;max-width:640px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(100,70,10,0.18)}
.hdr{background:linear-gradient(160deg,#1a1005 0%,#2c1d08 60%,#1a1005 100%);padding:40px 36px 32px;text-align:center;position:relative;overflow:hidden}
.hdr::after{content:'';position:absolute;bottom:0;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)}
.logo{width:72px;height:72px;border-radius:50%;border:2px solid rgba(212,175,55,0.35);object-fit:cover;display:block;margin:0 auto 16px;background:rgba(212,175,55,0.08)}
.brand{font-size:22px;font-weight:900;color:#d4af37;margin-bottom:4px}
.brand-sub{font-size:11.5px;color:rgba(212,175,55,0.5);font-weight:600;letter-spacing:1px}
.badge{display:inline-block;margin-top:18px;padding:8px 22px;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:50px;color:#d4af37;font-size:14px;font-weight:900}
.body{padding:30px 36px 26px}
.lbl{font-size:10px;font-weight:900;color:#c4a060;letter-spacing:2.5px;margin-bottom:14px;display:flex;align-items:center;gap:10px}
.lbl span{flex:1;height:1px;background:linear-gradient(to left,#e8d8b0,transparent)}
table{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1.5px solid #ede0c4}
.tr{background:linear-gradient(135deg,#fffbed,#fff5d6)}
.tl{color:#a07830!important;font-size:14px!important;font-weight:900!important}
.tv{color:#b08820!important;font-size:16px!important;font-weight:900!important}
.div{height:1px;background:linear-gradient(90deg,transparent,#d4af37,transparent);margin:22px 0;opacity:0.2}
.meta{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#a09070}
.ok{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:50px;font-size:10.5px;font-weight:700;background:#edfaf3;border:1px solid #9ed8b8;color:#276e48}
.ftr{background:#faf6ee;border-top:1.5px solid #ede0c4;padding:18px 36px;text-align:center}
.ftr p{font-size:11px;color:#a09060;line-height:1.9}
.pbtn{margin:28px auto 0;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 40px;background:linear-gradient(135deg,#d4af37,#c49a20);color:#1a1005;border:none;border-radius:50px;font-family:'Cairo',Arial,sans-serif;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 20px rgba(212,175,55,0.35);transition:all .2s}
.pbtn:hover{transform:translateY(-2px);box-shadow:0 6px 28px rgba(212,175,55,0.5)}
</style>
</head>
<body>
<div class="card">
  <div class="hdr">
    <img class="logo" src="${logoUrl}" alt="دار ابن الجراح"/>
    <div class="brand">دار ابن الجراح</div>
    <div class="brand-sub">للنشر والتوزيع</div>
    <div class="badge">✦ رقم الطلب: #${order.orderNumber}</div>
  </div>

  <div class="body">
    <div class="lbl">تفاصيل الطلب <span></span></div>
    <table><tbody>
      ${rowsHtml}
      ${extraRows}
      <tr class="tr"><td style="padding:15px 22px;border-top:2px solid #e0c870" class="tl">الإجمالي النهائي</td><td style="padding:15px 22px;border-top:2px solid #e0c870" class="tv">${total}</td></tr>
    </tbody></table>
    <div class="div"></div>
    <div class="meta">
      <span>تاريخ الطلب: ${now}</span>
      <span class="ok">✓ طلب مسجل ومؤكد</span>
    </div>
  </div>

  <div class="ftr"><p>شكراً لثقتك في دار ابن الجراح للنشر والتوزيع<br/>سيتم التواصل معك خلال 24 ساعة لتأكيد موعد التوصيل</p></div>
</div>

<button class="pbtn no-print" onclick="window.print()">🖨️ طباعة / حفظ كـ PDF</button>
</body>
</html>`;

    const win = window.open("", "_blank", "width=800,height=920,scrollbars=yes");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const activeIndex = order ? STATUS_INDEXES[order.orderStatus] : -1;
  const isCancelled = order?.orderStatus === "cancelled";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
      
      {/* Page Header */}
      <div className="text-center space-y-3 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm gold-glow">
          <FaTruck className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-foreground">تتبع حالة طلبك</h1>
        <p className="text-sm text-foreground/60 max-w-md mx-auto">
          أدخل رقم الطلب الخاص بك لمعرفة مرحلة التجهيز وموعد وصول الشحنة إليك.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto mb-12">
        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-2 items-center p-1.5 rounded-3xl bg-card-bg border border-border-color shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
          <FaSearch className="absolute right-5 text-foreground/40 w-4 h-4" />
          <input
            type="text"
            required
            value={orderNumberInput}
            onChange={(e) => setOrderNumberInput(e.target.value)}
            placeholder="أدخل رقم الطلب (مثال: IJ-14299)"
            className="w-full pr-12 pl-4 py-3.5 text-xs md:text-sm bg-transparent outline-none font-bold text-foreground"
          />
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={phoneLast4Input}
            onChange={(e) => setPhoneLast4Input(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="آخر 4 أرقام من رقم الهاتف"
            className="w-full px-4 py-3.5 text-xs md:text-sm bg-transparent outline-none font-bold text-foreground border-t md:border-t-0 md:border-r border-border-color/60"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {loading ? (
              <FaSpinner className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "استعلم الآن"
            )}
          </button>
        </div>
      </form>

      {/* Loading State Skeleton */}
      {loading && (
        <div className="space-y-6 animate-pulse max-w-3xl mx-auto">
          <div className="h-44 rounded-3xl bg-card-bg border border-border-color/40" />
          <div className="h-64 rounded-3xl bg-card-bg border border-border-color/40" />
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="max-w-xl mx-auto p-6 rounded-3xl bg-red-500/5 border border-red-500/20 text-center space-y-3 animate-fadeIn">
          <FaExclamationTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm font-bold text-red-500">{error}</p>
          <p className="text-xs text-foreground/60">
            تأكد من كتابة الرقم بشكل صحيح كما ظهر لك في شاشة إتمام الطلب.
          </p>
        </div>
      )}

      {/* Order Results Display */}
      {order && !loading && (
        <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
          
          {/* Timeline Tracking Section */}
          <div className="p-6 md:p-8 rounded-3xl bg-card-bg border border-border-color shadow-sm relative overflow-hidden">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-color/40 pb-5 mb-8">
              <div className="space-y-1">
                <span className="text-[11px] font-black text-primary uppercase tracking-widest">تحديثات الشحن</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-foreground">
                    طلب رقم #{order.orderNumber}
                  </h2>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-foreground/5 hover:bg-primary/10 text-foreground/60 hover:text-primary transition-all cursor-pointer"
                    title="نسخ رقم الطلب"
                  >
                    {copied ? <FaCheck className="w-3.5 h-3.5 text-emerald-500" /> : <FaCopy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPDF}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FaDownload className="w-3 h-3" />
                  عرض الفاتورة PDF
                </button>
              </div>
            </div>

            {/* If Order is Cancelled */}
            {isCancelled ? (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-2.5">
                <FaRegTimesCircle className="w-10 h-10 text-red-500 mx-auto" />
                <h3 className="text-base font-black text-red-500">تم إلغاء هذا الطلب</h3>
                <p className="text-xs text-foreground/75 max-w-md mx-auto">
                  نأسف لإبلاغك بأنه قد تم إلغاء هذا الطلب. إذا كان لديك استفسار يرجى التواصل معنا عبر واتساب مباشرة لتوضيح السبب.
                </p>
              </div>
            ) : (
              /* Step Progress Timeline */
              <div className="relative">
                
                {/* Connecting Line */}
                <div className="absolute right-[21px] top-4 bottom-4 w-1 bg-border-color/30 md:left-1/2 md:right-auto md:-translate-x-1/2 z-0" />
                
                {/* Completed Line Progress */}
                {activeIndex >= 0 && (
                  <div
                    className="absolute right-[21px] top-4 w-1 bg-gradient-to-b from-primary to-primary-hover md:left-1/2 md:right-auto md:-translate-x-1/2 z-0 transition-all duration-1000"
                    style={{
                      height: `${(activeIndex / 4) * 100}%`,
                      maxHeight: "calc(100% - 24px)",
                    }}
                  />
                )}

                {/* Steps */}
                <div className="space-y-8 relative z-10">
                  {TIMELINE_STEPS.map((step, idx) => {
                    const isCompleted = idx < activeIndex;
                    const isActive = idx === activeIndex;
                    const isFuture = idx > activeIndex;

                    return (
                      <div
                        key={step.key}
                        className={`flex items-start gap-4 md:gap-0 md:flex-row ${
                          idx % 2 === 0 ? "md:flex-row-reverse" : ""
                        }`}
                      >
                        {/* Empty Space for Desktop balancing */}
                        <div className="hidden md:block md:w-1/2 md:px-8" />

                        {/* Step Marker Circle */}
                        <div className="relative flex items-center justify-center shrink-0 z-20 md:mx-auto">
                          <div
                            className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black border-4 transition-all duration-300 ${
                              isCompleted
                                ? "bg-primary border-primary text-white scale-100"
                                : isActive
                                ? "bg-card-bg border-primary text-primary shadow-lg gold-glow scale-110"
                                : "bg-card-bg border-border-color text-foreground/40"
                            }`}
                          >
                            {isCompleted ? (
                              <FaCheck className="w-4 h-4" />
                            ) : isActive && idx < 4 ? (
                              <FaSpinner className="w-4 h-4 animate-spin" />
                            ) : idx === 4 && isActive ? (
                              <FaCheck className="w-4 h-4" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                        </div>

                        {/* Step content */}
                        <div className="md:w-1/2 md:px-8 text-right flex-grow">
                          <div className={`space-y-1 ${isActive ? "animate-pulse" : ""}`}>
                            <h4
                              className={`font-black text-sm md:text-base transition-colors ${
                                isActive
                                  ? "text-primary"
                                  : isCompleted
                                  ? "text-foreground"
                                  : "text-foreground/40"
                              }`}
                            >
                              {step.label}
                            </h4>
                            <p
                              className={`text-[11px] md:text-xs transition-colors ${
                                isFuture ? "text-foreground/35" : "text-foreground/60"
                              }`}
                            >
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Order Details & Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer & Address Details */}
            <div className="p-6 rounded-3xl bg-card-bg border border-border-color shadow-sm space-y-4">
              <h3 className="font-black text-sm text-foreground flex items-center gap-2 border-b border-border-color/40 pb-3">
                <FaUser className="text-primary w-4 h-4" />
                بيانات التسليم
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-foreground/60">اسم المستلم:</span>
                  <span className="font-bold text-foreground">{order.customerName}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-foreground/60">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-foreground" dir="ltr">
                    {order.customerPhone}
                  </span>
                </div>
                <div className="flex justify-between items-start py-1">
                  <span className="text-foreground/60 shrink-0">العنوان بالتفصيل:</span>
                  <span className="font-bold text-foreground text-left max-w-[180px]">
                    {formatSafeAddress(order)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-foreground/60">تاريخ الطلب:</span>
                  <span className="font-bold text-foreground flex items-center gap-1">
                    <FaCalendarAlt className="text-foreground/45 w-3.5 h-3.5" />
                    {new Date(order.createdAt).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Invoice / Items Summary */}
            <div className="p-6 rounded-3xl bg-card-bg border border-border-color shadow-sm space-y-4">
              <h3 className="font-black text-sm text-foreground flex items-center gap-2 border-b border-border-color/40 pb-3">
                <FaFileInvoice className="text-primary w-4 h-4" />
                ملخص الحساب
              </h3>
              
              {/* Items List */}
              <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-xl bg-foreground/[0.02] border border-border-color/30 text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <FaBook className="text-foreground/40 w-3 h-3" />
                      {item.title}
                    </span>
                    <span className="font-black text-primary shrink-0">
                      {item.quantity} × {item.price} {order.currency || siteCurrency}
                    </span>
                  </div>
                ))}
              </div>

              {/* Subtotal, Shipping, Grand Total */}
              <div className="space-y-2 pt-2 border-t border-border-color/30 text-[11px] md:text-xs">
                <div className="flex justify-between">
                  <span className="text-foreground/60">المجموع الفرعي:</span>
                  <span className="font-bold text-foreground">
                    {order.subtotal} {order.currency || siteCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">تكلفة الشحن والتوصيل:</span>
                  <span className="font-bold text-emerald-500">
                    +{order.shippingCost} {order.currency || siteCurrency}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border-color/40 text-sm font-black text-primary">
                  <span>الإجمالي الكلي:</span>
                  <span>
                    {order.grandTotal} {order.currency || siteCurrency}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export default function OrderTracker() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <FaSpinner className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <TrackerContent />
    </Suspense>
  );
}
