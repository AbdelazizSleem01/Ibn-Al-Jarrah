"use client";

import React, { useState, useEffect } from "react";
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

        {/* Status Filter Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border-color/30 pt-3">
          <span className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 ml-2">
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                orderStatusFilter === st.key
                  ? "bg-primary text-white border-primary shadow-md gold-glow"
                  : "bg-foreground/5 border-gray-200/80 dark:border-border-color/60 text-foreground/80 hover:bg-primary/10 hover:text-primary hover:border-primary/50 shadow-xs"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Main Table Card Container */}
      <div className="bg-card-bg rounded-2xl border border-border-color/20 overflow-hidden shadow-sm transition-colors duration-300">
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
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
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
                {orders.map((order) => {
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
                          className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            order.paymentStatus === "paid"
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
                        <select
                          value={order.orderStatus}
                          onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer ${statusInfo.color}`}
                        >
                          <option value="pending">قيد الانتظار</option>
                          <option value="confirmed">تم التأكيد</option>
                          <option value="processing">قيد التجهيز</option>
                          <option value="shipped">جاري الشحن</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="cancelled">ملغي</option>
                        </select>
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
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-hidden no-scrollbar animate-fadeIn font-sans">
          <div className="w-full max-w-2xl bg-card-bg border border-border-color/30 rounded-3xl shadow-2xl text-right text-foreground max-h-[90vh] flex flex-col overflow-hidden my-auto gold-glow">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border-color/30 bg-foreground/[0.02] shrink-0">
              <div>
                <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                  <span>تفاصيل الطلب</span>
                  <span className="font-mono text-primary px-2.5 py-0.5 bg-primary/10 rounded-lg">{selectedOrder.orderNumber}</span>
                </h3>
                <p className="text-xs text-foreground/60 mt-1">تاريخ الطلب: {new Date(selectedOrder.createdAt).toLocaleString("ar-EG")}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-full text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition flex items-center justify-center cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 md:p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">

              {/* Customer Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-foreground/[0.02] border border-border-color/20 text-xs">
                <div>
                  <span className="text-foreground/60">اسم العميل:</span>
                  <p className="font-bold text-sm mt-0.5">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <span className="text-foreground/60">رقم الهاتف:</span>
                  <p className="font-bold text-sm mt-0.5 font-mono" dir="ltr">{selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <span className="text-foreground/60">المحافظة:</span>
                  <p className="font-bold mt-0.5">{selectedOrder.governorate}</p>
                </div>
                <div>
                  <span className="text-foreground/60">العنوان التفصيلي:</span>
                  <p className="font-bold mt-0.5">{selectedOrder.detailedAddress}</p>
                </div>
                {selectedOrder.notes && (
                  <div className="sm:col-span-2">
                    <span className="text-foreground/60">ملاحظات العميل:</span>
                    <p className="font-semibold text-amber-500 mt-0.5">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-primary uppercase">الكتب والمنتجات المطلوبة</h4>
                <div className="divide-y divide-border-color/30 border border-border-color/20 rounded-2xl overflow-hidden text-xs bg-foreground/[0.01]">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.coverImage && (
                          <img src={item.coverImage} alt={item.title} className="w-10 h-12 object-cover rounded-xl shadow-sm border border-border-color/30" />
                        )}
                        <div>
                          <h5 className="font-bold text-foreground">{item.title}</h5>
                          <span className="text-[11px] text-foreground/60">سعر النسخة: {item.price} {item.currency}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-primary">{item.totalPrice} {item.currency}</div>
                        <div className="text-[11px] text-foreground/60">الكمية: {item.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Proof & Info */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">طريقة الدفع المختارة:</span>
                  <span className="font-black text-primary">{PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod]}</span>
                </div>
                
                {selectedOrder.paymentSenderInfo && (
                  <div className="flex justify-between">
                    <span className="text-foreground/70">رقم/حساب المحول:</span>
                    <span className="font-bold font-mono" dir="ltr">{selectedOrder.paymentSenderInfo}</span>
                  </div>
                )}

                {selectedOrder.paymentReceiptImage && (
                  <div>
                    <span className="block text-foreground/70 mb-1 font-bold">صورة أو رابط إيصال التحويل:</span>
                    <a
                      href={selectedOrder.paymentReceiptImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline font-bold"
                    >
                      <FaReceipt /> معاينة إيصال التحويل المرفق ↗
                    </a>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-primary/10 pt-2 font-black text-sm">
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
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-border-color/30 bg-foreground/[0.02] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">حالة الدفع:</span>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder._id, selectedOrder.orderStatus, "paid")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${selectedOrder.paymentStatus === "paid" ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-500/10 text-emerald-500"}`}
                >
                  تم الدفع ✓
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder._id, selectedOrder.orderStatus, "rejected")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${selectedOrder.paymentStatus === "rejected" ? "bg-red-600 text-white shadow-sm" : "bg-red-500/10 text-red-500"}`}
                >
                  رفض الدفع ✗
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold text-xs rounded-xl flex items-center gap-2 border border-border-color/30 transition cursor-pointer"
              >
                <FaPrint /> طباعة الفاتورة
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
