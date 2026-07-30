"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FaShoppingBag,
  FaSearch,
  FaFilter,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaTruck,
  FaBoxOpen,
  FaPrint,
  FaTrash,
  FaMoneyBillWave,
  FaReceipt,
  FaTimes,
  FaChevronDown,
  FaDownload,
  FaFilePdf,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { useCurrency } from "@/context/CurrencyContext";

interface OrderItem {
  bookId: string;
  title: string;
  slug: string;
  coverImage?: string;
  price: number;
  wholesalePrice?: number;
  quantity: number;
  totalPrice: number;
  currency: string;
}

interface OrderData {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAltPhone?: string;
  governorate: string;
  cityOrArea?: string;
  detailedAddress: string;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  grandTotal: number;
  totalProfit: number;
  currency: string;
  paymentMethod: "vodafone_cash" | "instapay" | "cash_on_delivery" | "bank_transfer";
  paymentStatus: "pending" | "paid" | "rejected";
  paymentSenderInfo?: string;
  paymentReceiptImage?: string;
  orderStatus: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  adminNotes?: string;
  isReadByAdmin: boolean;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "قيد الانتظار", color: "bg-amber-500/10 text-amber-500 border border-amber-500/20", icon: FaClock },
  confirmed: { label: "تم التأكيد", color: "bg-blue-500/10 text-blue-500 border border-blue-500/20", icon: FaCheckCircle },
  processing: { label: "قيد التجهيز", color: "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20", icon: FaBoxOpen },
  shipped: { label: "جاري الشحن", color: "bg-purple-500/10 text-purple-500 border border-purple-500/20", icon: FaTruck },
  delivered: { label: "تم التسليم", color: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20", icon: FaCheckCircle },
  cancelled: { label: "ملغي", color: "bg-red-500/10 text-red-500 border border-red-500/20", icon: FaTimesCircle },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  vodafone_cash: "فودافون كاش",
  instapay: "إنستا باي InstaPay",
  cash_on_delivery: "الدفع عند الاستلام",
  bank_transfer: "تحويل بنكي",
};

export default function OrdersManager() {
  const { formatBookPrice } = useCurrency();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [previewReceiptImage, setPreviewReceiptImage] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    orderId: string;
    orderStatus: string;
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Close status dropdown on page scroll or window resize
  useEffect(() => {
    if (!openDropdownId) return;
    const handleClose = () => {
      setOpenDropdownId(null);
      setDropdownPos(null);
    };
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [openDropdownId]);

  const handleToggleStatusDropdown = (order: OrderData, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (openDropdownId === order._id) {
      setOpenDropdownId(null);
      setDropdownPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < 230 && rect.top > spaceBelow;

      setDropdownPos({
        orderId: order._id,
        orderStatus: order.orderStatus,
        right: Math.max(12, window.innerWidth - rect.right),
        top: openUpwards ? undefined : rect.bottom + 6,
        bottom: openUpwards ? window.innerHeight - rect.top + 6 : undefined,
      });
      setOpenDropdownId(order._id);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        orderStatus: orderStatusFilter,
        paymentStatus: paymentStatusFilter,
        search,
      });

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Fetch orders error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, orderStatusFilter, paymentStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleDownloadReceiptImage = async (imageUrl: string, filenameStr?: string) => {
    const filename = filenameStr || `receipt-${Date.now()}`;
    try {
      if (imageUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `${filename}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${filename}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `${filename}.jpg`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };



  const handleUpdateStatus = async (orderId: string, newOrderStatus: string, newPaymentStatus?: string) => {
    try {
      const payload: any = { orderStatus: newOrderStatus };
      if (newPaymentStatus) payload.paymentStatus = newPaymentStatus;

      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, ...payload } : o))
        );
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, ...payload } : null));
        }
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "تم تحديث حالة الطلب بنجاح",
          showConfirmButton: false,
          timer: 2000,
        });
      }
    } catch (err) {
      Swal.fire({ title: "خطأ", text: "تعذر تحديث الحالة", icon: "error", confirmButtonColor: "#d4af37" });
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    const result = await Swal.fire({
      title: "حذف الطلب",
      text: `هل أنت متأكد من حذف الطلب (${orderNumber}) نهائياً؟`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "نعم، احذف",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#e11d48",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          setOrders((prev) => prev.filter((o) => o._id !== orderId));
          if (selectedOrder?._id === orderId) setSelectedOrder(null);
          Swal.fire({ title: "تم الحذف", text: "تم حذف الطلب بنجاح", icon: "success", confirmButtonColor: "#d4af37" });
        }
      } catch (err) {
        Swal.fire({ title: "خطأ", text: "تعذر حذف الطلب", icon: "error" });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 text-right transition-colors duration-300">

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FaShoppingBag className="w-5 h-5" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">إدارة طلبات المبيعات والمشتريات</h1>
        </div>
      </div>

      {/* Search & Filters Card Container */}
      <div className="bg-card-bg rounded-2xl p-5 shadow-sm space-y-4 border border-border-color/20 transition-colors duration-300">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute right-3.5 top-3 text-foreground/40 text-xs" />
            <input
              type="text"
              placeholder="ابحث برقم الطلب، اسم العميل، الهاتف، المحافظة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 text-xs rounded-xl bg-background border border-gray-200 dark:border-border-color focus:border-primary focus:ring-1 focus:ring-primary outline-none transition font-medium shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:opacity-90 transition shadow-md cursor-pointer"
          >
            بحث
          </button>
        </form>

        {/* Status Filter Buttons Bar (Scrollable on mobile) */}
        <div className="flex items-center gap-2 border-t border-border-color/30 pt-3 overflow-x-auto no-scrollbar max-w-full pb-1">
          <span className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 ml-2 shrink-0">
            <FaFilter className="text-xs text-primary" />
            حالة الطلب:
          </span>
          {[
            { key: "all", label: "الكل" },
            { key: "pending", label: "قيد الانتظار" },
            { key: "confirmed", label: "مؤكد" },
            { key: "processing", label: "قيد التجهيز" },
            { key: "shipped", label: "جاري الشحن" },
            { key: "delivered", label: "تم التسليم" },
            { key: "cancelled", label: "ملغي" },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => { setOrderStatusFilter(st.key); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap ${orderStatusFilter === st.key
                  ? "bg-primary text-white border-primary shadow-md gold-glow"
                  : "bg-foreground/5 border-gray-200/80 dark:border-border-color/60 text-foreground/80 hover:bg-primary/10 hover:text-primary hover:border-primary/50 shadow-xs"
                }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Main Container */}
      <div className="bg-card-bg rounded-2xl border border-border-color/20 shadow-sm transition-colors duration-300 relative overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-foreground/60 text-xs flex flex-col items-center gap-3">
            <span className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            جاري تحميل الطلبات...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-foreground/60 text-xs space-y-3">
            <FaBoxOpen className="w-12 h-12 text-foreground/30 mx-auto" />
            <p className="font-bold text-sm">لا توجد طلبات مطابقة للبحث</p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (md and above) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[850px] text-right text-xs">
                <thead className="bg-foreground/[0.02] border-b border-border-color/30 text-foreground/70 font-extrabold">
                  <tr>
                    <th className="p-4">رقم الطلب والتاريخ</th>
                    <th className="p-4">العميل والمحافظة</th>
                    <th className="p-4">الكتب المطلوبة</th>
                    <th className="p-4">إجمالي المبلغ والربح</th>
                    <th className="p-4">طريقة وحالة الدفع</th>
                    <th className="p-4">حالة الطلب</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/30">
                  {orders.map((order, idx) => {
                    const statusInfo = STATUS_LABELS[order.orderStatus] || STATUS_LABELS.pending;

                    return (
                      <tr key={order._id} className={`hover:bg-foreground/[0.02] transition-colors ${!order.isReadByAdmin ? "bg-primary/5 font-semibold" : ""}`}>

                        {/* Order Number & Date */}
                        <td className="p-4">
                          <div className="font-mono font-black text-primary text-sm">{order.orderNumber}</div>
                          <div className="text-[10px] text-foreground/50 mt-0.5" dir="ltr">
                            {new Date(order.createdAt).toLocaleDateString("ar-EG", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td className="p-4">
                          <div className="font-bold text-foreground">{order.customerName}</div>
                          <div className="text-[11px] text-foreground/70 font-mono" dir="ltr">{order.customerPhone}</div>
                          <div className="text-[10px] text-foreground/50">{order.governorate}</div>
                        </td>

                        {/* Items */}
                        <td className="p-4">
                          <div className="space-y-1 max-w-[220px]">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="truncate text-foreground/90 font-medium">
                                • {item.title} <span className="font-bold text-primary">({item.quantity}x)</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Financials */}
                        <td className="p-4">
                          <div className="font-black text-foreground text-sm">
                            {order.grandTotal} {order.currency}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            صافي الربح: +{order.totalProfit || 0} {order.currency}
                          </div>
                        </td>

                        {/* Payment Method & Status */}
                        <td className="p-4 space-y-1.5">
                          <div className="font-bold text-foreground/80">
                            {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${order.paymentStatus === "paid"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : order.paymentStatus === "rejected"
                                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              }`}
                          >
                            {order.paymentStatus === "paid" ? "تم الدفع ✓" : order.paymentStatus === "rejected" ? "مرفوض ✗" : "بانتظار التحقق"}
                          </span>
                        </td>

                        {/* Order Status selector */}
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatusDropdown(order, e)}
                            className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-2 rounded-xl border outline-none cursor-pointer transition-all hover:brightness-95 select-none ${statusInfo.color}`}
                          >
                            <statusInfo.icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{statusInfo.label}</span>
                            <FaChevronDown className="w-2.5 h-2.5 shrink-0 opacity-60 transition-transform duration-200" style={{ transform: openDropdownId === order._id ? "rotate(180deg)" : "none" }} />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition shadow-sm cursor-pointer"
                              title="تفاصيل الطلب والإيصال"
                            >
                              <FaEye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order._id, order.orderNumber)}
                              className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition shadow-sm cursor-pointer"
                              title="حذف الطلب"
                            >
                              <FaTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Order Cards View (screens < 768px) */}
            <div className="block md:hidden divide-y divide-border-color/20">
              {orders.map((order) => {
                const statusInfo = STATUS_LABELS[order.orderStatus] || STATUS_LABELS.pending;
                return (
                  <div key={order._id} className={`p-4 space-y-3 transition-colors ${!order.isReadByAdmin ? "bg-primary/5" : ""}`}>
                    {/* Top Header: Order Number, Date & Quick Actions */}
                    <div className="flex items-center justify-between border-b border-border-color/20 pb-2.5">
                      <div>
                        <div className="font-mono font-black text-sm text-primary flex items-center gap-1.5">
                          <span>#{order.orderNumber}</span>
                          {!order.isReadByAdmin && (
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" title="طلب جديد" />
                          )}
                        </div>
                        <div className="text-[10px] text-foreground/50 mt-0.5" dir="ltr">
                          {new Date(order.createdAt).toLocaleDateString("ar-EG", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition shadow-sm cursor-pointer"
                          title="تفاصيل الطلب والإيصال"
                        >
                          <FaEye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order._id, order.orderNumber)}
                          className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition shadow-sm cursor-pointer"
                          title="حذف الطلب"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-foreground/50 block text-[10px]">العميل:</span>
                        <span className="font-bold text-foreground">{order.customerName}</span>
                      </div>
                      <div>
                        <span className="text-foreground/50 block text-[10px]">المحافظة:</span>
                        <span className="font-bold text-foreground">{order.governorate}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-foreground/50 block text-[10px]">رقم الهاتف:</span>
                        <a href={`tel:${order.customerPhone}`} className="font-mono font-bold text-primary hover:underline text-xs" dir="ltr">
                          {order.customerPhone} 📞
                        </a>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="text-xs bg-foreground/[0.02] p-2.5 rounded-xl border border-border-color/15 space-y-1">
                      <span className="text-[10px] text-foreground/50 block font-bold">الكتب المطلوبة:</span>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="truncate text-foreground/90 font-medium">
                          • {item.title} <span className="font-bold text-primary">({item.quantity}x)</span>
                        </div>
                      ))}
                    </div>

                    {/* Financials & Status */}
                    <div className="flex items-center justify-between pt-1 border-t border-border-color/20 gap-2 flex-wrap">
                      <div>
                        <div className="font-black text-foreground text-xs">
                          {order.grandTotal} {order.currency}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          صافي الربح: +{order.totalProfit || 0} {order.currency}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Payment Badge */}
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${order.paymentStatus === "paid"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : order.paymentStatus === "rejected"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            }`}
                        >
                          {order.paymentStatus === "paid" ? "تم الدفع ✓" : order.paymentStatus === "rejected" ? "مرفوض ✗" : "بانتظار التحقق"}
                        </span>

                        {/* Status Dropdown Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleStatusDropdown(order, e)}
                          className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer select-none ${statusInfo.color}`}
                        >
                          <statusInfo.icon className="w-3 h-3 shrink-0" />
                          <span>{statusInfo.label}</span>
                          <FaChevronDown className="w-2.5 h-2.5 shrink-0 opacity-60" style={{ transform: openDropdownId === order._id ? "rotate(180deg)" : "none" }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Floating Status Dropdown Portal */}
      {openDropdownId && dropdownPos && createPortal(
        <>
          {/* Invisible Backdrop to close on click outside */}
          <div
            className="fixed inset-0 z-[9998] cursor-default bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdownId(null);
              setDropdownPos(null);
            }}
          />
          <div
            className="fixed z-[9999] w-40 rounded-2xl bg-card-bg border border-border-color/80 shadow-2xl overflow-hidden py-1.5 animate-fadeIn text-right gold-glow"
            style={{
              right: `${dropdownPos.right}px`,
              top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : undefined,
              bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : undefined,
            }}
          >
            {Object.entries(STATUS_LABELS).map(([statusKey, info]) => {
              const IconComponent = info.icon;
              const isSelected = dropdownPos.orderStatus === statusKey;
              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateStatus(dropdownPos.orderId, statusKey);
                    setOpenDropdownId(null);
                    setDropdownPos(null);
                  }}
                  className={`w-full px-3 py-2.5 text-right text-[11px] font-bold flex items-center gap-2 transition-all hover:bg-foreground/[0.04] cursor-pointer ${isSelected
                      ? "text-primary bg-primary/10 font-black"
                      : "text-foreground/80 hover:text-primary"
                    }`}
                >
                  <IconComponent className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-foreground/45"}`} />
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-sm overflow-hidden no-scrollbar animate-fadeIn font-sans">
          <div className="w-full max-w-2xl bg-card-bg border border-border-color/30 rounded-2xl sm:rounded-3xl shadow-2xl text-right text-foreground max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden my-auto gold-glow">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-color/30 bg-foreground/[0.02] shrink-0 gap-2">
              <div className="min-w-0">
                <h3 className="font-black text-base sm:text-lg text-foreground flex items-center gap-2 flex-wrap">
                  <span>تفاصيل الطلب</span>
                  <span className="font-mono text-primary px-2 sm:px-2.5 py-0.5 bg-primary/10 rounded-lg text-xs font-bold">#{selectedOrder.orderNumber}</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-foreground/60 mt-0.5">تاريخ الطلب: {new Date(selectedOrder.createdAt).toLocaleString("ar-EG")}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-full text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition flex items-center justify-center cursor-pointer shrink-0"
                aria-label="إغلاق"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto no-scrollbar flex-1 text-xs sm:text-sm">

              {/* Customer Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 sm:p-4 rounded-2xl bg-foreground/[0.02] border border-border-color/20 text-xs">
                <div>
                  <span className="text-foreground/60 block text-[11px]">اسم العميل:</span>
                  <p className="font-bold text-xs sm:text-sm mt-0.5 text-foreground">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <span className="text-foreground/60 block text-[11px]">رقم الهاتف:</span>
                  <a href={`tel:${selectedOrder.customerPhone}`} className="font-bold text-xs sm:text-sm mt-0.5 font-mono text-primary hover:underline inline-block" dir="ltr">
                    {selectedOrder.customerPhone} 📞
                  </a>
                </div>
                <div>
                  <span className="text-foreground/60 block text-[11px]">المحافظة:</span>
                  <p className="font-bold mt-0.5 text-foreground">{selectedOrder.governorate}</p>
                </div>
                <div>
                  <span className="text-foreground/60 block text-[11px]">العنوان التفصيلي:</span>
                  <p className="font-bold mt-0.5 text-foreground">{selectedOrder.detailedAddress}</p>
                </div>
                {selectedOrder.notes && (
                  <div className="sm:col-span-2 pt-1 border-t border-border-color/10">
                    <span className="text-foreground/60 block text-[11px]">ملاحظات العميل:</span>
                    <p className="font-semibold text-amber-500 mt-0.5">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-primary uppercase">الكتب والمنتجات المطلوبة</h4>
                <div className="divide-y divide-border-color/30 border border-border-color/20 rounded-2xl overflow-hidden text-xs bg-foreground/[0.01]">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.coverImage && (
                          <img src={item.coverImage} alt={item.title} className="w-9 h-11 sm:w-10 sm:h-12 object-cover rounded-xl shadow-sm border border-border-color/30 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <h5 className="font-bold text-foreground truncate text-xs sm:text-sm">{item.title}</h5>
                          <span className="text-[10px] sm:text-[11px] text-foreground/60 block">سعر النسخة: {item.price} {item.currency}</span>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="font-black text-primary text-xs sm:text-sm">{item.totalPrice} {item.currency}</div>
                        <div className="text-[10px] sm:text-[11px] text-foreground/60">الكمية: {item.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Proof & Info */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2.5 sm:space-y-3 text-xs">
                <div className="flex justify-between items-center flex-wrap gap-1">
                  <span className="font-bold text-foreground">طريقة الدفع المختارة:</span>
                  <span className="font-black text-primary">{PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}</span>
                </div>

                {selectedOrder.paymentSenderInfo && (
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <span className="text-foreground/70">رقم/حساب المحول:</span>
                    <span className="font-bold font-mono" dir="ltr">{selectedOrder.paymentSenderInfo}</span>
                  </div>
                )}

                {selectedOrder.paymentReceiptImage && (
                  <div className="pt-2 border-t border-primary/15 space-y-2">
                    <span className="block text-foreground/80 font-bold text-xs">صورة إيصال التحويل المرفق:</span>

                    <div className="flex items-center gap-3.5 flex-wrap">
                      {/* Thumbnail Container Box */}
                      <div
                        onClick={() => setPreviewReceiptImage(selectedOrder.paymentReceiptImage!)}
                        className="relative group w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-primary/30 bg-foreground/5 shadow-md cursor-pointer transition-all hover:scale-[1.02] hover:border-primary shrink-0"
                        title="انقر لتكبير المعاينة"
                      >
                        <img
                          src={selectedOrder.paymentReceiptImage}
                          alt="إيصال التحويل"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Hover Overlay with Search/Zoom Icon */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 backdrop-blur-[2px]">
                          <FaSearch className="w-5 h-5 text-primary" />
                          <span>تكبير الصورة</span>
                        </div>
                      </div>

                      {/* Action Links & Buttons */}
                      <div className="space-y-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setPreviewReceiptImage(selectedOrder.paymentReceiptImage!)}
                          className="px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/30 font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          <FaEye className="w-4 h-4" /> تكبير المعاينة
                        </button>
                        <a
                          href={selectedOrder.paymentReceiptImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-foreground/60 hover:text-primary transition font-bold text-[11px] block"
                        >
                          فتح الأصلية في صفحة جديدة ↗
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-primary/15 pt-2 font-black text-xs sm:text-sm">
                  <span>إجمالي قيمة الطلب + الشحن:</span>
                  <span className="text-primary">{selectedOrder.grandTotal} {selectedOrder.currency}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>صافي الربح المتوقع من هذا الطلب:</span>
                  <span>+{selectedOrder.totalProfit || 0} {selectedOrder.currency}</span>
                </div>
              </div>

            </div>

            {/* Fixed Modal Action Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-border-color/30 bg-foreground/[0.02] shrink-0">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-xs font-bold text-foreground/70">حالة الدفع:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder._id, selectedOrder.orderStatus, "paid")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${selectedOrder.paymentStatus === "paid" ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"}`}
                  >
                    تم الدفع ✓
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder._id, selectedOrder.orderStatus, "rejected")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${selectedOrder.paymentStatus === "rejected" ? "bg-red-600 text-white shadow-sm" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"}`}
                  >
                    رفض الدفع ✗
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-border-color/30 transition cursor-pointer shadow-xs"
                >
                  <FaPrint /> طباعة الفاتورة
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Professional Printable Invoice Template (Visible ONLY during print) */}
      {selectedOrder && (
        <div id="printable-invoice" className="hidden print:block p-8 bg-white text-gray-900 font-sans text-right text-xs leading-relaxed" dir="rtl">

          {/* Header Branding */}
          <div className="flex items-center justify-between border-b-2 border-amber-500/50 pb-5 mb-6">
            <div className="flex items-center gap-4">
              <img src="/images/logo.webp" alt="دار ابن الجراح" className="w-16 h-16 object-contain rounded-2xl border border-primary" />
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">دار ابن الجراح للنشر والتوزيع</h1>
                <p className="text-xs text-gray-600 font-medium mt-0.5">منشورات كتب وإصدارات علمية وثقافية</p>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5" dir="ltr">+20 127 294 2243 | +20 102 355 3474</p>
              </div>
            </div>

            <div className="text-left">
              <div className="px-4 py-2 bg-amber-50 border border-amber-300 rounded-xl inline-block text-center shadow-xs">
                <span className="text-[11px] font-bold text-amber-900 block">فاتورة طلب بيع</span>
                <span className="font-mono font-black text-lg text-amber-700">#{selectedOrder.orderNumber}</span>
              </div>
              <div className="text-[11px] text-gray-500 font-bold mt-2">
                تاريخ الطلب: {new Date(selectedOrder.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>

          {/* Customer & Payment Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            {/* Customer Box */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 space-y-1.5">
              <h3 className="font-black text-gray-900 border-b border-gray-200 pb-1.5 mb-2 text-xs flex items-center justify-between">
                <span>بيانات العميل والشحن</span>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">{selectedOrder.governorate}</span>
              </h3>
              <div className="flex justify-between"><span className="text-gray-500">اسم العميل:</span> <span className="font-bold text-gray-900">{selectedOrder.customerName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">رقم الهاتف:</span> <span className="font-mono font-bold text-gray-900" dir="ltr">{selectedOrder.customerPhone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">العنوان التفصيلي:</span> <span className="font-bold text-gray-900">{selectedOrder.detailedAddress}</span></div>
              {selectedOrder.notes && (
                <div className="pt-1 border-t border-gray-200"><span className="text-gray-500">ملاحظات:</span> <span className="font-semibold text-amber-700">{selectedOrder.notes}</span></div>
              )}
            </div>

            {/* Payment & Order Details Box */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 space-y-1.5">
              <h3 className="font-black text-gray-900 border-b border-gray-200 pb-1.5 mb-2 text-xs flex items-center justify-between">
                <span>بيانات الدفع والحالة</span>
                <span className="text-[10px] text-gray-500 font-medium">سجل الطلب</span>
              </h3>
              <div className="flex justify-between"><span className="text-gray-500">طريقة الدفع:</span> <span className="font-bold text-gray-900">{PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}</span></div>
              {selectedOrder.paymentSenderInfo && (
                <div className="flex justify-between"><span className="text-gray-500">حساب المحول:</span> <span className="font-mono font-bold text-gray-900" dir="ltr">{selectedOrder.paymentSenderInfo}</span></div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">حالة السداد:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${selectedOrder.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                  {selectedOrder.paymentStatus === "paid" ? "تم السداد ✓" : "بانتظار التأكيد / عند الاستلام"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">حالة الطلب:</span>
                <span className="font-bold text-gray-900">{STATUS_LABELS[selectedOrder.orderStatus]?.label || selectedOrder.orderStatus}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6 rounded-xl border border-gray-300 overflow-hidden">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300 text-gray-800 font-extrabold">
                <tr>
                  <th className="p-3 text-center w-12 border-r border-gray-300">#</th>
                  <th className="p-3 border-r border-gray-300">الكتاب / المنتج</th>
                  <th className="p-3 text-center border-r border-gray-300 w-28">السعر الفردي</th>
                  <th className="p-3 text-center border-r border-gray-300 w-20">الكمية</th>
                  <th className="p-3 text-left w-32">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-900 font-medium">
                {selectedOrder.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 text-center border-r border-gray-200 font-mono text-gray-500">{idx + 1}</td>
                    <td className="p-3 border-r border-gray-200 font-bold">{item.title}</td>
                    <td className="p-3 text-center border-r border-gray-200 font-mono">{item.price} {item.currency}</td>
                    <td className="p-3 text-center border-r border-gray-200 font-mono font-bold text-amber-800">{item.quantity}</td>
                    <td className="p-3 text-left font-mono font-black text-gray-900">{item.totalPrice} {item.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invoice Financial Summary */}
          <div className="flex justify-between items-start gap-6 mb-8">
            <div className="text-[11px] text-gray-500 max-w-xs space-y-1">
              <p className="font-bold text-gray-800">ملاحظات هامة للمستلم:</p>
              <p>• يُرجى التأكد من استلام الشحنة وتفقد الكتب قبل مغادرة مندوب الشحن.</p>
              <p>• في حال وجود أي استفسار، تواصل معنا فوراً عبر رقم الهاتف أو الواتساب.</p>
            </div>

            <div className="w-72 p-4 rounded-xl border border-gray-300 bg-gray-50/80 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>إجمالي الكتب:</span>
                <span className="font-mono font-bold">{selectedOrder.items.reduce((acc, i) => acc + i.totalPrice, 0)} {selectedOrder.currency}</span>
              </div>
              <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                <span>تكلفة الشحن:</span>
                <span className="font-mono font-bold">
                  {selectedOrder.shippingCost ?? Math.max(0, selectedOrder.grandTotal - selectedOrder.items.reduce((acc, i) => acc + i.totalPrice, 0))} {selectedOrder.currency}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 text-sm font-black text-gray-900">
                <span>الإجمالي النهائي:</span>
                <span className="font-mono text-base text-amber-700">{selectedOrder.grandTotal} {selectedOrder.currency}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature Box */}
          <div className="pt-8 border-t border-gray-300 flex justify-between items-end text-xs text-gray-600">
            <div>
              <p className="font-black text-gray-900">دار ابن الجراح للنشر والتوزيع</p>
              <p className="text-[10px] text-gray-500 mt-0.5">شكراً لثقتكم بنا، ونتمنى لكم قراءة ممتعة ونافعة!</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 mb-6">ختم وتوقيع الدار</p>
              <div className="w-36 border-b border-dashed border-gray-400 mx-auto" />
            </div>
          </div>

        </div>
      )}

      {/* Fullscreen Receipt Image Preview Lightbox */}
      {previewReceiptImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn font-sans cursor-zoom-out"
          onClick={() => setPreviewReceiptImage(null)}
        >
          {/* Top Header Bar */}
          <div className="absolute top-4 right-4 left-4 flex items-center justify-between z-10">
            <div className="text-white text-xs sm:text-sm font-bold bg-black/60 px-4 py-2 rounded-2xl border border-white/20 backdrop-blur-md">
              معاينة إيصال التحويل المرفق
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadReceiptImage(
                    previewReceiptImage,
                    `إيصال-طلب-${selectedOrder?.orderNumber || "التحويل"}`
                  );
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
                title="تنزيل الصورة مباشرة على الجهاز"
              >
                <FaDownload className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewReceiptImage(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
                aria-label="إغلاق"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Centered High-Res Image Box */}
          <div
            className="relative max-w-4xl max-h-[85vh] overflow-auto rounded-3xl border border-white/20 shadow-2xl bg-black/40 p-2 my-auto cursor-default flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewReceiptImage}
              alt="إيصال التحويل الكامل"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl mx-auto shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
