"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FaTimes,
  FaCheckCircle,
  FaCopy,
  FaTruck,
  FaShoppingBag,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaStickyNote,
  FaWhatsapp,
  FaMoneyBillWave,
  FaUniversity,
  FaMinus,
  FaPlus,
  FaCloudUploadAlt,
  FaTrash,
  FaChevronDown,
  FaSearch,
  FaArrowRight,
  FaArrowLeft,
  FaSpinner,
  FaLayerGroup,
  FaWeightHanging,
  FaCheck,
  FaCreditCard,
  FaDownload,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { useCurrency } from "@/context/CurrencyContext";

interface BookItem {
  _id: string;
  title: string;
  slug: string;
  volumesCount?: number;
  coverImage?: { secureUrl?: string };
  prices?: { egp?: number; lyd?: number; usd?: number };
}

interface CheckoutModalProps {
  book: BookItem;
  isOpen: boolean;
  onClose: () => void;
}

interface ShippingRateData {
  governorate: string;
  baseCost: number;
  extraKgCost: number;
}

const EGYPT_GOVERNORATES_FALLBACK = [
  { name: "القاهرة", shipping: 45 },
  { name: "الجيزة", shipping: 45 },
  { name: "القليوبية", shipping: 50 },
  { name: "الإسكندرية", shipping: 55 },
  { name: "البحيرة", shipping: 60 },
  { name: "الدقهلية", shipping: 60 },
  { name: "الغربية", shipping: 60 },
  { name: "المنوفية", shipping: 60 },
  { name: "الشرقية", shipping: 60 },
  { name: "كفر الشيخ", shipping: 60 },
  { name: "دمياط", shipping: 60 },
  { name: "بورسعيد", shipping: 60 },
  { name: "الإسماعيلية", shipping: 60 },
  { name: "السويس", shipping: 60 },
  { name: "الفيوم", shipping: 65 },
  { name: "بني سويف", shipping: 65 },
  { name: "المنيا", shipping: 70 },
  { name: "أسيوط", shipping: 70 },
  { name: "سوهاج", shipping: 75 },
  { name: "قنا", shipping: 75 },
  { name: "الأقصر", shipping: 80 },
  { name: "أسوان", shipping: 80 },
  { name: "البحر الأحمر", shipping: 90 },
  { name: "مطروح", shipping: 90 },
  { name: "الوادي الجديد", shipping: 95 },
  { name: "شمال سيناء", shipping: 95 },
  { name: "جنوب سيناء", shipping: 95 },
  { name: "خارج مصر (تواصل معنا)", shipping: 0 },
];

const VODAFONE_NUMBER = "01023553474";
const INSTAPAY_ACCOUNT = "01272942243";

export default function CheckoutModal({ book, isOpen, onClose }: CheckoutModalProps) {
  const { currency, formatBookPrice } = useCurrency();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAltPhone, setCustomerAltPhone] = useState("");
  const [governorate, setGovernorate] = useState("القاهرة");
  const [detailedAddress, setDetailedAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [shippingRates, setShippingRates] = useState<ShippingRateData[]>([]);

  // Custom Governorate Dropdown State
  const [isGovDropdownOpen, setIsGovDropdownOpen] = useState(false);
  const [govSearchTerm, setGovSearchTerm] = useState("");
  const govDropdownRef = useRef<HTMLDivElement>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"vodafone_cash" | "instapay" | "cash_on_delivery" | "bank_transfer">("vodafone_cash");
  const [paymentSenderInfo, setPaymentSenderInfo] = useState("");
  const [paymentReceiptImage, setPaymentReceiptImage] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Action State
  const [loading, setLoading] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/shipping/rates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.length > 0) {
          setShippingRates(data.data);
        }
      })
      .catch(() => { });
  }, []);

  // Close custom dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (govDropdownRef.current && !govDropdownRef.current.contains(e.target as Node)) {
        setIsGovDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock both document.documentElement and document.body scrollbar when modal is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      Swal.fire({
        title: "تنبيه",
        text: "حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميجابايت",
        icon: "warning",
        confirmButtonColor: "#d4af37",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPaymentReceiptImage(base64);
      setReceiptPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen || !mounted) return null;

  // Calculate unit price based on active currency
  let unitPrice = book.prices?.egp || 0;
  if (currency === "LYD") unitPrice = book.prices?.lyd || 0;
  if (currency === "USD") unitPrice = book.prices?.usd || 0;

  // Calculate smart weight based on book volumesCount & quantity
  const volumesPerCopy = Math.max(1, Number(book.volumesCount) || 1);
  const totalWeightKg = quantity * volumesPerCopy;

  // Calculate smart shipping rate
  let shippingCost = 0;
  let baseShippingCost = 0;
  let extraWeightCost = 0;

  if (currency === "EGP") {
    const activeRate = shippingRates.find((r) => r.governorate === governorate);
    if (activeRate) {
      baseShippingCost = activeRate.baseCost;
      extraWeightCost = totalWeightKg > 1 ? (totalWeightKg - 1) * activeRate.extraKgCost : 0;
      shippingCost = baseShippingCost + extraWeightCost;
    } else {
      const fallbackGov = EGYPT_GOVERNORATES_FALLBACK.find((g) => g.name === governorate) || EGYPT_GOVERNORATES_FALLBACK[0];
      shippingCost = fallbackGov.shipping;
      baseShippingCost = shippingCost;
    }
  }

  const subtotal = unitPrice * quantity;
  const grandTotal = subtotal + shippingCost;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  // Step 2 Validation Handler
  const handleValidateStep2 = () => {
    if (!customerName.trim()) {
      Swal.fire({ title: "تنبيه", text: "يرجى كتابة الاسم بالكامل", icon: "warning", confirmButtonColor: "#d4af37" });
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      Swal.fire({ title: "تنبيه", text: "يرجى كتابة رقم هاتف صحيح للتواصل (10 أرقام على الأقل)", icon: "warning", confirmButtonColor: "#d4af37" });
      return;
    }
    if (!detailedAddress.trim()) {
      Swal.fire({ title: "تنبيه", text: "يرجى كتابة العنوان التفصيلي لتوصيل الطلب", icon: "warning", confirmButtonColor: "#d4af37" });
      return;
    }
    setStep(3);
  };

  // Order Submission Handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      Swal.fire({ title: "تنبيه", text: "يرجى كتابة الاسم بالكامل", icon: "warning", confirmButtonColor: "#d4af37" });
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      Swal.fire({ title: "تنبيه", text: "يرجى كتابة رقم هاتف صحيح للتواصل", icon: "warning", confirmButtonColor: "#d4af37" });
      return;
    }
    if (!detailedAddress.trim()) {
      Swal.fire({ title: "تنبيه", text: "يرجى كتابة العنوان التفصيلي لتوصيل الطلب", icon: "warning", confirmButtonColor: "#d4af37" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerName,
        customerPhone,
        customerAltPhone,
        governorate,
        detailedAddress,
        notes,
        items: [
          {
            bookId: book._id,
            quantity,
          },
        ],
        paymentMethod,
        paymentSenderInfo,
        paymentReceiptImage,
        currency,
        shippingCost,
      };

      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success && data.data) {
        setCreatedOrder(data.data);
      } else {
        Swal.fire({
          title: "خطأ في الطلب",
          text: data.message || "حدث خطأ أثناء حفظ الطلب، يرجى المحاولة مرة أخرى",
          icon: "error",
          confirmButtonColor: "#d4af37",
        });
      }
    } catch (err: any) {
      setLoading(false);
      Swal.fire({
        title: "خطأ في الخادم",
        text: "تعذر الاتصال بالخادم الآن، يرجى إعادة المحاولة",
        icon: "error",
        confirmButtonColor: "#d4af37",
      });
    }
  };

  const activeTransferNumber = paymentMethod === "vodafone_cash" ? VODAFONE_NUMBER : INSTAPAY_ACCOUNT;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden no-scrollbar animate-fadeIn font-sans">
      <div className="relative w-full max-w-2xl bg-card-bg border border-border-color/40 rounded-3xl shadow-2xl overflow-hidden my-auto text-right text-foreground max-h-[92vh] flex flex-col gold-glow">

        {/* Sticky Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-color/20 bg-foreground/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FaShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base md:text-lg text-foreground">إتمام طلب شراء الكتاب</h2>
              <p className="text-xs text-foreground/60">دار ابن الجراح للنشر والتوزيع</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-foreground/60 hover:text-foreground hover:bg-foreground/10 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Success View Screen */}
        {createdOrder ? (
          <div className="p-6 overflow-y-auto space-y-5 text-center animate-fadeIn no-scrollbar my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-md">
              <FaCheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black text-foreground">تم تسجيل طلبك بنجاح! 🎉</h3>
              <p className="text-xs md:text-sm text-foreground/70 max-w-md mx-auto">
                شكراً لثقتك بنا في دار ابن الجراح. تم حفظ الطلب وسيتم مراجعته والتواصل معك فوراً لتأكيد ميعاد التوصيل.
              </p>
              {/* Order Number Badge + Copy Button */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-black">
                  رقم الطلب: #{createdOrder.orderNumber || createdOrder._id?.slice(-6).toUpperCase()}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const orderNum = createdOrder.orderNumber || createdOrder._id?.slice(-6).toUpperCase();
                    navigator.clipboard.writeText(`#${orderNum}`);
                    setCopiedNumber(true);
                    setTimeout(() => setCopiedNumber(false), 2500);
                  }}
                  className="w-8 h-8 rounded-full bg-foreground/5 hover:bg-primary/10 border border-border-color/40 hover:border-primary/40 flex items-center justify-center text-foreground/60 hover:text-primary transition-all cursor-pointer"
                  title="نسخ رقم الطلب"
                >
                  {copiedNumber ? <FaCheck className="w-3 h-3 text-emerald-500" /> : <FaCopy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Order Details Card */}
            <div id="order-success-card" className="max-w-md mx-auto p-4 rounded-2xl bg-foreground/[0.03] border border-border-color/30 text-xs space-y-2.5 text-right">
              <div className="flex justify-between border-b border-border-color/10 pb-2">
                <span className="text-foreground/70">اسم العميل:</span>
                <span className="font-bold text-foreground">{createdOrder.customerName || customerName}</span>
              </div>
              <div className="flex justify-between border-b border-border-color/10 pb-2">
                <span className="text-foreground/70">رقم الهاتف:</span>
                <span className="font-mono font-bold text-foreground" dir="ltr">{createdOrder.customerPhone || customerPhone}</span>
              </div>
              <div className="flex justify-between border-b border-border-color/10 pb-2">
                <span className="text-foreground/70">المحافظة والعنوان:</span>
                <span className="font-bold text-foreground">{createdOrder.governorate || governorate} - {createdOrder.detailedAddress || detailedAddress}</span>
              </div>
              <div className="flex justify-between border-b border-border-color/10 pb-2">
                <span className="text-foreground/70">الكتاب والكمية:</span>
                <span className="font-bold text-primary">{book.title} ({quantity} نسخة)</span>
              </div>
              <div className="flex justify-between border-b border-border-color/10 pb-2">
                <span className="text-foreground/70">طريقة الدفع:</span>
                <span className="font-bold text-foreground">
                  {paymentMethod === "vodafone_cash"
                    ? "فودافون كاش"
                    : paymentMethod === "instapay"
                      ? "إنستا باي"
                      : paymentMethod === "cash_on_delivery"
                        ? "الدفع عند الاستلام"
                        : "تحويل بنكي"}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-black text-primary">
                <span>الإجمالي النهائي:</span>
                <span>{createdOrder.grandTotal || grandTotal} {currency}</span>
              </div>
            </div>

            {/* Success Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1 flex-wrap">
              <a
                href={`https://wa.me/201272942243?text=${encodeURIComponent(
                  `مرحباً دار ابن الجراح، قمت بطلب كتاب "${book.title}" عبر الموقع برقم طلب #${createdOrder.orderNumber || createdOrder._id?.slice(-6).toUpperCase()}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <FaWhatsapp className="w-4 h-4" />
                تأكيد عبر واتساب
              </a>
              <button
                type="button"
                onClick={() => {
                  const orderNum = createdOrder.orderNumber || createdOrder._id?.slice(-6).toUpperCase();
                  const payLabel =
                    paymentMethod === "vodafone_cash" ? "فودافون كاش" :
                      paymentMethod === "instapay" ? "إنستا باي" :
                        paymentMethod === "cash_on_delivery" ? "الدفع عند الاستلام" : "تحويل بنكي";
                  const cname = String(createdOrder.customerName || customerName);
                  const cphone = String(createdOrder.customerPhone || customerPhone);
                  const cgov = String(createdOrder.governorate || governorate);
                  const caddr = String(createdOrder.detailedAddress || detailedAddress);
                  const total = `${createdOrder.grandTotal || grandTotal} ${currency}`;
                  const logoUrl = window.location.origin + "/images/logo.webp";
                  const now = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

                  const makeRow = (lbl: string, val: string, bg: string) =>
                    `<tr style="background:${bg}"><td style="padding:13px 22px;color:#8a7455;font-size:13px;font-weight:600;border-bottom:1px solid #f0e6cc;width:42%">${lbl}</td><td style="padding:13px 22px;color:#1e1608;font-size:13px;font-weight:700;border-bottom:1px solid #f0e6cc">${val}</td></tr>`;

                  const rows = [
                    makeRow("اسم العميل", cname, "#fffdf7"),
                    makeRow("رقم الهاتف", cphone, "#fff9ee"),
                    makeRow("المحافظة والعنوان", cgov + " — " + caddr, "#fffdf7"),
                    makeRow("الكتاب والكمية", book.title + " (" + quantity + " نسخة)", "#fff9ee"),
                    makeRow("طريقة الدفع", payLabel, "#fffdf7"),
                  ].join("");

                  const html = [
                    "<!DOCTYPE html>",
                    '<html dir="rtl" lang="ar">',
                    "<head>",
                    '<meta charset="UTF-8"/>',
                    '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
                    "<title>طلب #" + orderNum + " - دار ابن الجراح</title>",
                    "<style>",
                    "@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');",
                    "*{margin:0;padding:0;box-sizing:border-box}",
                    "body{font-family:'Cairo',Arial,sans-serif;background:#f5f0e8;color:#1e1608;direction:rtl;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 16px 48px}",
                    "@page{size:A4 portrait;margin:12mm}",
                    "@media print{body{background:#fff;padding:0}.no-print{display:none!important}}",
                    ".card{width:100%;max-width:640px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(100,70,10,0.18)}",
                    ".hdr{background:linear-gradient(160deg,#1a1005 0%,#2c1d08 60%,#1a1005 100%);padding:40px 36px 32px;text-align:center;position:relative;overflow:hidden}",
                    ".hdr::after{content:'';position:absolute;bottom:0;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)}",
                    ".logo{width:72px;height:72px;border-radius:50%;border:2px solid rgba(212,175,55,0.35);object-fit:cover;display:block;margin:0 auto 16px;background:rgba(212,175,55,0.08)}",
                    ".brand{font-size:22px;font-weight:900;color:#d4af37;margin-bottom:4px}",
                    ".brand-sub{font-size:11.5px;color:rgba(212,175,55,0.5);font-weight:600;letter-spacing:1px}",
                    ".badge{display:inline-block;margin-top:18px;padding:8px 22px;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:50px;color:#d4af37;font-size:14px;font-weight:900}",
                    ".body{padding:30px 36px 26px}",
                    ".lbl{font-size:10px;font-weight:900;color:#c4a060;letter-spacing:2.5px;margin-bottom:14px;display:flex;align-items:center;gap:10px}",
                    ".lbl span{flex:1;height:1px;background:linear-gradient(to left,#e8d8b0,transparent)}",
                    "table{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1.5px solid #ede0c4}",
                    ".tr{background:linear-gradient(135deg,#fffbed,#fff5d6)}",
                    ".tl{color:#a07830!important;font-size:14px!important;font-weight:900!important}",
                    ".tv{color:#b08820!important;font-size:16px!important;font-weight:900!important}",
                    ".div{height:1px;background:linear-gradient(90deg,transparent,#d4af37,transparent);margin:22px 0;opacity:0.2}",
                    ".meta{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#a09070}",
                    ".ok{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:50px;font-size:10.5px;font-weight:700;background:#edfaf3;border:1px solid #9ed8b8;color:#276e48}",
                    ".ftr{background:#faf6ee;border-top:1.5px solid #ede0c4;padding:18px 36px;text-align:center}",
                    ".ftr p{font-size:11px;color:#a09060;line-height:1.9}",
                    ".pbtn{margin:28px auto 0;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 40px;background:linear-gradient(135deg,#d4af37,#c49a20);color:#1a1005;border:none;border-radius:50px;font-family:'Cairo',Arial,sans-serif;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 20px rgba(212,175,55,0.35);transition:all .2s}",
                    ".pbtn:hover{transform:translateY(-2px);box-shadow:0 6px 28px rgba(212,175,55,0.5)}",
                    "</style>",
                    "</head>",
                    "<body>",
                    '<div class="card">',
                    '<div class="hdr">',
                    '<img class="logo" src="' + logoUrl + '" alt="دار ابن الجراح"/>',
                    '<div class="brand">دار ابن الجراح</div>',
                    '<div class="brand-sub">للنشر والتوزيع</div>',
                    '<div class="badge">✦ رقم الطلب: #' + orderNum + '</div>',
                    "</div>",
                    '<div class="body">',
                    '<div class="lbl">تفاصيل الطلب <span></span></div>',
                    "<table><tbody>",
                    rows,
                    '<tr class="tr"><td style="padding:15px 22px;border-top:2px solid #e0c870" class="tl">الإجمالي النهائي</td><td style="padding:15px 22px;border-top:2px solid #e0c870" class="tv">' + total + "</td></tr>",
                    "</tbody></table>",
                    '<div class="div"></div>',
                    '<div class="meta">',
                    "<span>تاريخ الطلب: " + now + "</span>",
                    '<span class="ok">✓ تم تسجيل الطلب بنجاح</span>',
                    "</div>",
                    "</div>",
                    '<div class="ftr"><p>شكراً لثقتك في دار ابن الجراح للنشر والتوزيع<br/>سيتم التواصل معك خلال 24 ساعة لتأكيد موعد التوصيل</p></div>',
                    "</div>",
                    '<button class="pbtn no-print" onclick="window.print()">🖨️ طباعة / حفظ كـ PDF</button>',
                    "</body></html>",
                  ].join("\n");

                  const win = window.open("", "_blank", "width=800,height=920,scrollbars=yes");
                  if (win) {
                    win.document.write(html);
                    win.document.close();
                  }
                }}
                className="px-5 py-2.5 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <FaDownload className="w-3.5 h-3.5" />
                عرض الطلب PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl border border-border-color/60 hover:bg-foreground/5 text-foreground font-extrabold text-xs transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        ) : (
          /* Wizard Main Content Container */
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Stepper Navigation Bar */}
            <div className="px-5 py-3 border-b border-border-color/20 bg-card-bg shrink-0">
              <div className="flex items-center justify-between max-w-lg mx-auto relative">

                {/* Connecting Bar — sits at circle center (top-4 = half of w-8 circle) */}
                <div className="absolute top-4 left-4 right-4 -translate-y-1/2 h-0.5 bg-border-color/30 z-0" />
                <div
                  className="absolute top-4 right-4 -translate-y-1/2 h-0.5 bg-primary transition-all duration-500 z-0"
                  style={{
                    width: step === 1 ? "0%" : step === 2 ? "50%" : "calc(100% - 2rem)",
                  }}
                />

                {/* Step 1 Pill */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="relative z-20 flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div
                    className={`relative z-20 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step === 1
                        ? "bg-primary text-white border-2 border-primary shadow-md gold-glow scale-110"
                        : step > 1
                          ? "bg-card-bg text-primary border-2 border-primary font-bold"
                          : "bg-card-bg text-foreground/50 border-2 border-border-color/40"
                      }`}
                  >
                    {step > 1 ? <FaCheck className="w-3 h-3" /> : 1}
                  </div>

                  <span
                    className={`text-[11px] font-bold transition-colors ${step === 1 ? "text-primary" : "text-foreground/70"
                      }`}
                  >
                    الكتاب والكمية
                  </span>
                </button>

                {/* Step 2 Pill */}
                <button
                  type="button"
                  onClick={() => {
                    if (step > 1) setStep(2);
                  }}
                  className="relative z-10 flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step === 2
                        ? "bg-primary text-white border-2 border-primary shadow-md gold-glow scale-110"
                        : step > 2
                          ? "bg-card-bg text-primary border-2 border-primary font-bold"
                          : "bg-card-bg text-foreground/50 border-2 border-border-color/40"
                      }`}
                  >
                    {step > 2 ? <FaCheck className="w-3 h-3" /> : 2}
                  </div>
                  <span
                    className={`text-[11px] font-bold transition-colors ${step === 2 ? "text-primary" : "text-foreground/70"
                      }`}
                  >
                    بيانات الشحن
                  </span>
                </button>

                {/* Step 3 Pill */}
                <button
                  type="button"
                  onClick={() => {
                    if (step === 3) setStep(3);
                  }}
                  className="relative z-10 flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step === 3
                        ? "bg-primary text-white border-2 border-primary shadow-md gold-glow scale-110"
                        : "bg-card-bg text-foreground/50 border-2 border-border-color/40"
                      }`}
                  >
                    3
                  </div>
                  <span
                    className={`text-[11px] font-bold transition-colors ${step === 3 ? "text-primary" : "text-foreground/70"
                      }`}
                  >
                    الدفع والتأكيد
                  </span>
                </button>

              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 no-scrollbar">

              {/* STEP 1: Book & Quantity */}
              {step === 1 && (
                <div className="space-y-6 animate-fadeIn">

                  {/* Book Details Main Banner */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-foreground/[0.03] border border-border-color/30 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    {book.coverImage?.secureUrl ? (
                      <img
                        src={book.coverImage.secureUrl}
                        alt={book.title}
                        className="w-24 sm:w-28 h-32 sm:h-36 object-cover rounded-2xl shadow-md border border-border-color/40 shrink-0 select-none"
                      />
                    ) : (
                      <div className="w-24 sm:w-28 h-32 sm:h-36 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20">
                        غلاف الكتاب
                      </div>
                    )}

                    <div className="flex-1 text-center sm:text-right space-y-2.5 w-full">
                      <div className="space-y-1">
                        <h3 className="font-black text-base sm:text-lg text-foreground leading-snug">
                          {book.title}
                        </h3>
                        <p className="text-xs text-foreground/60">نسخة أصلية مطبوعة ومجلدة بدار ابن الجراح</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                          {formatBookPrice(book.prices).formatted} / للنسخة
                        </span>
                        {volumesPerCopy > 1 && (
                          <span className="text-xs font-bold text-foreground/70 bg-foreground/5 px-3 py-1 rounded-xl border border-border-color/30 flex items-center gap-1">
                            <FaLayerGroup className="w-3 h-3 text-primary" />
                            {volumesPerCopy} مجلدات
                          </span>
                        )}
                      </div>

                      {/* Quantity Controller Pill */}
                      <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
                        <span className="text-xs font-bold text-foreground/80">الكمية المطلوب شراؤها:</span>
                        <div className="flex items-center rounded-2xl border border-border-color/60 bg-background overflow-hidden shadow-xs">
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="px-3 py-1.5 text-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            aria-label="إنقاص الكمية"
                          >
                            <FaMinus className="w-3 h-3" />
                          </button>
                          <span className="px-4 font-black text-sm text-foreground">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => q + 1)}
                            className="px-3 py-1.5 text-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            aria-label="زيادة الكمية"
                          >
                            <FaPlus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Breakdown Box for Step 1 */}
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-foreground/80">
                      <span className="flex items-center gap-1.5 font-bold">
                        <FaWeightHanging className="text-primary w-3.5 h-3.5" />
                        إجمالي الوزن التقريبي للطلب:
                      </span>
                      <span className="font-black text-primary">
                        {totalWeightKg} كجم ({quantity} نسخة {volumesPerCopy > 1 ? `× ${volumesPerCopy} مجلدات` : ""})
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-foreground/80 pt-1 border-t border-primary/10">
                      <span className="font-bold">سعر الكتب الفرعي:</span>
                      <span className="font-black text-foreground text-sm">{subtotal} {currency}</span>
                    </div>
                  </div>

                  {/* Step 1 Proceed Button */}
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-xs sm:text-sm transition-all shadow-md gold-glow flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>المتابعة لبيانات العميل والشحن</span>
                    <FaArrowLeft className="w-3.5 h-3.5" />
                  </button>

                </div>
              )}

              {/* STEP 2: Customer Info & Shipping */}
              {step === 2 && (
                <div className="space-y-5 animate-fadeIn">

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-2">
                      <FaUser className="w-3.5 h-3.5" />
                      بيانات التواصل والتوصيل
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Customer Name */}
                      <div>
                        <label className="block text-xs font-bold text-foreground/80 mb-1.5">
                          الاسم بالكامل <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <FaUser className="absolute right-3.5 top-3.5 text-primary/70 w-3.5 h-3.5" />
                          <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="أدخل اسمك الكريم"
                            className="w-full pr-10 pl-3 py-2.5 text-xs rounded-xl bg-foreground/[0.04] border border-gray-300 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition font-medium text-foreground shadow-xs"
                          />
                        </div>
                      </div>

                      {/* Customer Phone */}
                      <div>
                        <label className="block text-xs font-bold text-foreground/80 mb-1.5">
                          رقم الهاتف (واتساب) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <FaPhone className="absolute right-3.5 top-3.5 text-primary/70 w-3.5 h-3.5" />
                          <input
                            type="tel"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="01xxxxxxxxx"
                            className="w-full pr-10 pl-3 py-2.5 text-xs rounded-xl bg-foreground/[0.04] border border-gray-300 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition text-left font-mono shadow-xs"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {/* Customer Alt Phone */}
                      <div>
                        <label className="block text-xs font-bold text-foreground/80 mb-1.5">
                          رقم هاتف إضافي (اختياري)
                        </label>
                        <div className="relative">
                          <FaPhone className="absolute right-3.5 top-3.5 text-primary/70 w-3.5 h-3.5" />
                          <input
                            type="tel"
                            value={customerAltPhone}
                            onChange={(e) => setCustomerAltPhone(e.target.value)}
                            placeholder="رقم آخر للتواصل"
                            className="w-full pr-10 pl-3 py-2.5 text-xs rounded-xl bg-foreground/[0.04] border border-gray-300 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition text-left font-mono shadow-xs"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {/* Custom Governorate Select Dropdown */}
                      <div>
                        <label className="block text-xs font-bold text-foreground/80 mb-1.5">
                          المحافظة <span className="text-red-500">*</span>
                        </label>
                        <div className="relative" ref={govDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsGovDropdownOpen((prev) => !prev)}
                            className="w-full pr-3 pl-3 py-2.5 text-xs rounded-xl bg-foreground/[0.04] border border-gray-300 dark:border-white/20 hover:border-primary/60 focus:border-primary outline-none transition font-medium text-foreground shadow-xs flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FaTruck className="text-primary/80 w-3.5 h-3.5 shrink-0" />
                              <span className="font-bold text-foreground">{governorate}</span>
                              {(() => {
                                const list = shippingRates.length > 0 ? shippingRates : EGYPT_GOVERNORATES_FALLBACK;
                                const active: any = list.find((g: any) => (g.governorate || g.name) === governorate);
                                const badgeText = active
                                  ? active.baseCost
                                    ? `(${active.baseCost} ج.م للكيلو الأول)`
                                    : active.shipping > 0
                                      ? `(+${active.shipping} ج.م)`
                                      : ""
                                  : "";
                                return badgeText ? (
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                                    {badgeText}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <FaChevronDown className={`w-3 h-3 text-foreground/50 transition-transform duration-200 shrink-0 ${isGovDropdownOpen ? "rotate-180 text-primary" : ""}`} />
                          </button>

                          {/* Custom Dropdown List - Opens Downwards */}
                          {isGovDropdownOpen && (
                            <div className="absolute top-full right-0 left-0 mt-1.5 z-[100] bg-card-bg border border-border-color/80 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn font-sans text-right gold-glow">

                              {/* Search Box */}
                              <div className="p-2 border-b border-border-color/20 bg-foreground/[0.02] relative">
                                <FaSearch className="absolute right-4 top-3.5 text-foreground/40 w-3 h-3" />
                                <input
                                  type="text"
                                  autoFocus
                                  value={govSearchTerm}
                                  onChange={(e) => setGovSearchTerm(e.target.value)}
                                  placeholder="ابحث عن المحافظة..."
                                  className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg bg-background border border-border-color/40 focus:border-primary outline-none font-medium text-foreground"
                                />
                              </div>

                              {/* Governorate List Options */}
                              <div className="max-h-48 overflow-y-auto no-scrollbar p-1.5 space-y-0.5">
                                {(() => {
                                  const list = shippingRates.length > 0 ? shippingRates : EGYPT_GOVERNORATES_FALLBACK;
                                  const filtered = list.filter((g: any) => {
                                    const name = g.governorate || g.name || "";
                                    return name.toLowerCase().includes(govSearchTerm.toLowerCase());
                                  });

                                  if (filtered.length === 0) {
                                    return (
                                      <div className="p-3 text-center text-xs text-foreground/50 font-medium">
                                        لا توجد محافظة بهذا الاسم
                                      </div>
                                    );
                                  }

                                  return filtered.map((govItem: any) => {
                                    const name = govItem.governorate || govItem.name;
                                    const isSelected = name === governorate;
                                    const priceText = govItem.baseCost
                                      ? `${govItem.baseCost} ج.م`
                                      : govItem.shipping > 0
                                        ? `+${govItem.shipping} ج.م`
                                        : "مجاني";

                                    return (
                                      <button
                                        key={name}
                                        type="button"
                                        onClick={() => {
                                          setGovernorate(name);
                                          setIsGovDropdownOpen(false);
                                          setGovSearchTerm("");
                                        }}
                                        className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer text-right ${isSelected
                                            ? "bg-primary text-white font-black shadow-sm"
                                            : "hover:bg-foreground/5 text-foreground font-medium"
                                          }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{name}</span>
                                          {isSelected && <FaCheckCircle className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                          }`}>
                                          {priceText}
                                        </span>
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Address */}
                    <div>
                      <label className="block text-xs font-bold text-foreground/80 mb-1.5">
                        العنوان التفصيلي <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FaMapMarkerAlt className="absolute right-3.5 top-3.5 text-primary/70 w-3.5 h-3.5" />
                        <input
                          type="text"
                          required
                          value={detailedAddress}
                          onChange={(e) => setDetailedAddress(e.target.value)}
                          placeholder="اسم الشارع، رقم العمارة، الشقة، علامة مميزة"
                          className="w-full pr-10 pl-3 py-2.5 text-xs rounded-xl bg-foreground/[0.04] border border-gray-300 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition font-medium text-foreground shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Order Notes */}
                    <div>
                      <label className="block text-xs font-bold text-foreground/80 mb-1.5">
                        ملاحظات للطلب (اختياري)
                      </label>
                      <div className="relative">
                        <FaStickyNote className="absolute right-3.5 top-3.5 text-primary/70 w-3.5 h-3.5" />
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="أي تعليق أو وقت مفضل للتسليم"
                          className="w-full pr-10 pl-3 py-2.5 text-xs rounded-xl bg-foreground/[0.04] border border-gray-300 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition font-medium text-foreground shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Mini Shipping Preview Card */}
                  <div className="p-3.5 rounded-2xl bg-foreground/[0.02] border border-border-color/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-foreground/80">
                      <FaTruck className="text-primary w-3.5 h-3.5 shrink-0" />
                      <span>المحافظة: <strong className="text-foreground">{governorate}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground/80">
                      <FaWeightHanging className="text-primary w-3.5 h-3.5 shrink-0" />
                      <span>الوزن: <strong className="text-foreground">{totalWeightKg} كجم</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <span>الشحن المتوقع: <strong>{shippingCost} {currency}</strong></span>
                    </div>
                  </div>

                  {/* Step 2 Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-3 rounded-2xl border border-border-color/60 hover:bg-foreground/5 text-foreground font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <FaArrowRight className="w-3 h-3" />
                      السابق
                    </button>

                    <button
                      type="button"
                      onClick={handleValidateStep2}
                      className="flex-1 py-3 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-xs transition-all shadow-md gold-glow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>المتابعة للدفع والتأكيد</span>
                      <FaArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 3: Payment & Order Summary */}
              {step === 3 && (
                <form onSubmit={handleSubmitOrder} className="space-y-6 animate-fadeIn">

                  {/* Payment Methods Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-2">
                      <FaCreditCard className="w-3.5 h-3.5" />
                      اختر وسيلة الدفع المناسبة
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      {/* Vodafone Cash Card */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("vodafone_cash")}
                        className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${paymentMethod === "vodafone_cash"
                            ? "border-2 border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-black shadow-md scale-[1.01]"
                            : "border border-gray-300 dark:border-white/20 bg-foreground/[0.02] hover:bg-foreground/[0.05] text-foreground/80 hover:border-red-500/40"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center border border-gray-200 shrink-0">
                            <img src="/vodafone.png" alt="فودافون كاش" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <span className="block text-xs font-black text-foreground">فودافون كاش</span>
                            <span className="block text-[10px] text-foreground/60 font-normal">تحويل بالمحفظة الإلكترونية</span>
                          </div>
                        </div>
                        {paymentMethod === "vodafone_cash" && <FaCheckCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      </button>

                      {/* InstaPay Card */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("instapay")}
                        className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${paymentMethod === "instapay"
                            ? "border-2 border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black shadow-md scale-[1.01]"
                            : "border border-gray-300 dark:border-white/20 bg-foreground/[0.02] hover:bg-foreground/[0.05] text-foreground/80 hover:border-purple-500/40"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center border border-gray-200 shrink-0">
                            <img src="/InstaPay.png" alt="إنستا باي" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <span className="block text-xs font-black text-foreground">إنستا باي InstaPay</span>
                            <span className="block text-[10px] text-purple-400 font-bold">تحويل لحظي مباشر ⚡</span>
                          </div>
                        </div>
                        {paymentMethod === "instapay" && <FaCheckCircle className="w-4 h-4 text-purple-500 shrink-0" />}
                      </button>

                      {/* Cash on Delivery Card */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cash_on_delivery")}
                        className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${paymentMethod === "cash_on_delivery"
                            ? "border-2 border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black shadow-md scale-[1.01]"
                            : "border border-gray-300 dark:border-white/20 bg-foreground/[0.02] hover:bg-foreground/[0.05] text-foreground/80 hover:border-emerald-500/40"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-sm flex items-center justify-center border border-gray-200 text-emerald-600 shrink-0">
                            <FaMoneyBillWave className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <span className="block text-xs font-black text-foreground">الدفع عند الاستلام</span>
                            <span className="block text-[10px] text-foreground/60 font-normal">سداد كاش لمندوب التوصيل</span>
                          </div>
                        </div>
                        {paymentMethod === "cash_on_delivery" && <FaCheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </button>

                      {/* Bank Transfer Card */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("bank_transfer")}
                        className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${paymentMethod === "bank_transfer"
                            ? "border-2 border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black shadow-md scale-[1.01]"
                            : "border border-gray-300 dark:border-white/20 bg-foreground/[0.02] hover:bg-foreground/[0.05] text-foreground/80 hover:border-blue-500/40"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-sm flex items-center justify-center border border-gray-200 text-blue-600 shrink-0">
                            <FaUniversity className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <span className="block text-xs font-black text-foreground">تحويل بنكي</span>
                            <span className="block text-[10px] text-foreground/60 font-normal">إيداع بحساب البنك</span>
                          </div>
                        </div>
                        {paymentMethod === "bank_transfer" && <FaCheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
                      </button>

                    </div>

                    {/* Direct Payment Transfer Details Box */}
                    {(paymentMethod === "vodafone_cash" || paymentMethod === "instapay") && (
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3.5 animate-fadeIn">

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/10 pb-3">
                          <span className="text-xs font-bold text-foreground">
                            {paymentMethod === "vodafone_cash" ? "رقم التحويل (فودافون كاش):" : "حساب/رقم التحويل (InstaPay):"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-black text-primary bg-background px-3 py-1 rounded-xl border border-border-color/30 tracking-wider" dir="ltr">
                              {activeTransferNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeTransferNumber)}
                              className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <FaCopy className="w-3 h-3" />
                              {copiedNumber ? "تم النسخ!" : "نسخ الرقم"}
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-foreground/70 leading-relaxed">
                          {paymentMethod === "vodafone_cash"
                            ? "📱 قم بتحويل إجمالي المبلغ إلى رقم فودافون كاش أعلاه وارفق صورة الإيصال لتأكيد الفاتورة."
                            : "⚡ قم بتحويل المبلغ مباشرة عبر تطبيق InstaPay إلى الرقم أعلاه وارفق إيصال التحويل."}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-foreground/80 mb-1">
                              رقم المحفظة/الحساب المحول منه
                            </label>
                            <input
                              type="text"
                              value={paymentSenderInfo}
                              onChange={(e) => setPaymentSenderInfo(e.target.value)}
                              placeholder="مثال: 010xxxxxxx"
                              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border-color/95 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-foreground/80 mb-1">
                              إيصال التحويل (اختياري)
                            </label>
                            {receiptPreview ? (
                              <div className="flex items-center justify-between p-2 rounded-xl bg-background border border-emerald-500/40">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={receiptPreview}
                                    alt="معاينة الإيصال"
                                    className="w-8 h-8 object-cover rounded-lg border border-border-color/30"
                                  />
                                  <span className="text-[11px] font-bold text-emerald-500 truncate">تم إرفاق صورة الإيصال</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaymentReceiptImage("");
                                    setReceiptPreview(null);
                                  }}
                                  className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="حذف الصورة"
                                >
                                  <FaTrash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center justify-center gap-2 p-2 rounded-xl border border-dashed border-primary/40 hover:border-primary bg-background cursor-pointer text-xs font-bold text-primary transition-all">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleReceiptFileChange}
                                  className="hidden"
                                />
                                <FaCloudUploadAlt className="w-4 h-4" />
                                <span>ارفق صورة الإيصال (أقل من 8MB)</span>
                              </label>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Order Total Breakdown Card */}
                  <div className="p-4 rounded-3xl bg-foreground/[0.03] border border-border-color/30 space-y-2 text-xs">
                    <div className="flex justify-between text-foreground/80 font-medium">
                      <span>سعر الكتب ({quantity}x نسخة):</span>
                      <span className="font-bold">{subtotal} {currency}</span>
                    </div>

                    <div className="flex justify-between text-foreground/80 font-medium">
                      <span>وزن الشحنة الكلي:</span>
                      <span className="font-bold text-foreground">
                        {totalWeightKg} كجم ({quantity} نسخة {volumesPerCopy > 1 ? `× ${volumesPerCopy} مجلدات` : ""})
                      </span>
                    </div>

                    {shippingCost > 0 && (
                      <div className="flex justify-between text-foreground/80 font-medium items-start">
                        <div>
                          <span>تكلفة الشحن ({governorate}):</span>
                          {extraWeightCost > 0 && (
                            <span className="text-[10px] text-foreground/50 block font-normal">
                              ({baseShippingCost} ج.م كيلو أول + {extraWeightCost} ج.م {totalWeightKg - 1} كجم زيادات)
                            </span>
                          )}
                        </div>
                        <span className="font-bold">{shippingCost} {currency}</span>
                      </div>
                    )}

                    {/* Main Grand Total Banner */}
                    <div className="flex items-center justify-between text-base sm:text-lg font-black text-primary border-t border-border-color/20 pt-3 mt-2">
                      <span>المبلغ الإجمالي النهائي:</span>
                      <span className="text-xl sm:text-2xl font-black text-primary gold-glow-text">
                        {grandTotal} {currency}
                      </span>
                    </div>
                  </div>

                  {/* Step 3 Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-3.5 rounded-2xl border border-border-color/60 hover:bg-foreground/5 text-foreground font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <FaArrowRight className="w-3 h-3" />
                      السابق
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-xs sm:text-sm transition-all shadow-lg gold-glow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="w-4 h-4 animate-spin" />
                          <span>جاري تسجيل الطلب...</span>
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="w-4 h-4" />
                          <span>تأكيد وإرسال الطلب الآن ({grandTotal} {currency})</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}

            </div>

          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
