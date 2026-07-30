"use client";

import React, { useState, useEffect } from "react";
import {
  FaTruck,
  FaPlus,
  FaSearch,
  FaSave,
  FaCheck,
  FaTimes,
  FaEdit,
  FaTrash,
  FaWeightHanging,
  FaMoneyBillWave,
  FaInfoCircle,
} from "react-icons/fa";
import Swal from "sweetalert2";

interface ShippingRateItem {
  _id: string;
  governorate: string;
  baseCost: number;
  extraKgCost: number;
  isActive: boolean;
}

export default function ShippingManager() {
  const [rates, setRates] = useState<ShippingRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 9;

  const [editBaseCost, setEditBaseCost] = useState<number>(0);
  const [editExtraKgCost, setEditExtraKgCost] = useState<number>(0);

  // New Governorate Modal / Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGovName, setNewGovName] = useState("");
  const [newBaseCost, setNewBaseCost] = useState(50);
  const [newExtraKgCost, setNewExtraKgCost] = useState(10);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shipping");
      const data = await res.json();
      if (data.success && data.data) {
        setRates(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch shipping rates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleStartEdit = (item: ShippingRateItem) => {
    setEditingId(item._id);
    setEditBaseCost(item.baseCost);
    setEditExtraKgCost(item.extraKgCost);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/shipping/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCost: editBaseCost,
          extraKgCost: editExtraKgCost,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRates((prev) =>
          prev.map((r) => (r._id === id ? { ...r, baseCost: editBaseCost, extraKgCost: editExtraKgCost } : r))
        );
        setEditingId(null);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "تم حفظ التعديلات",
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        Swal.fire({ title: "خطأ", text: data.message || "فشل التعديل", icon: "error" });
      }
    } catch (err) {
      Swal.fire({ title: "خطأ", text: "حدث خطأ في الخادم", icon: "error" });
    }
  };

  const handleToggleActive = async (item: ShippingRateItem) => {
    try {
      const newStatus = !item.isActive;
      const res = await fetch(`/api/admin/shipping/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setRates((prev) =>
          prev.map((r) => (r._id === item._id ? { ...r, isActive: newStatus } : r))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGov = async (id: string, name: string) => {
    const confirm = await Swal.fire({
      title: `حذف أسعار شحن ${name}؟`,
      text: "لن تتمكن من التراجع عن هذه الخطوة",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "نعم، احذف",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#ef4444",
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/shipping/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          setRates((prev) => prev.filter((r) => r._id !== id));
          Swal.fire({ title: "تم الحذف", text: "تم حذف المحافظة بنجاح", icon: "success" });
        }
      } catch (err) {
        Swal.fire({ title: "خطأ", text: "تعذر الحذف", icon: "error" });
      }
    }
  };

  const handleAddGovernorate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGovName.trim()) return;

    try {
      const res = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          governorate: newGovName,
          baseCost: newBaseCost,
          extraKgCost: newExtraKgCost,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewGovName("");
        fetchRates();
        Swal.fire({ title: "تمت الإضافة", text: "تمت إضافة المحافظة بنجاح", icon: "success" });
      } else {
        Swal.fire({ title: "تنبيه", text: data.message || "تعذر الإضافة", icon: "warning" });
      }
    } catch (err) {
      Swal.fire({ title: "خطأ", text: "حدث خطأ في الخادم", icon: "error" });
    }
  };

  const filteredRates = rates.filter((r) =>
    r.governorate.toLowerCase().includes(searchVal.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredRates.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRates = filteredRates.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FaTruck className="w-5 h-5" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">إدارة الشحن وأسعار المحافظات</h1>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-xs md:text-sm flex items-center gap-2 transition-all shadow-md gold-glow cursor-pointer"
        >
          <FaPlus className="w-4 h-4" />
          إضافة محافظة جديدة
        </button>
      </div>

      {/* Logic Information Card */}
      <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
       
        <div className="px-4 py-2 bg-card-bg rounded-xl border border-border-color font-bold text-primary shrink-0">
          إجمالي المحافظات: {rates.length}
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="relative">
        <FaSearch className="absolute right-4 top-3.5 text-foreground/40 w-4 h-4" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => { setSearchVal(e.target.value); setCurrentPage(1); }}
          placeholder="ابحث باسم المحافظة..."
          className="w-full pr-11 pl-4 py-3 text-xs md:text-sm rounded-2xl bg-card-bg border border-border-color focus:border-primary outline-none transition font-medium text-foreground"
        />
      </div>

      {/* Governorate Shipping Rates Grid / Cards */}
      {loading ? (
        <div className="p-16 text-center text-foreground/60 text-xs flex flex-col items-center gap-3">
          <span className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          جاري جلب بيانات الشحن...
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="p-12 text-center bg-card-bg rounded-3xl border border-border-color text-foreground/60 text-sm">
          لا توجد نتائج مطابقة للبحث
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedRates.map((item) => {
            const isEditing = editingId === item._id;

            return (
              <div
                key={item._id}
                className={`p-5 rounded-3xl border transition-all space-y-4 ${
                  item.isActive
                    ? "bg-card-bg border-border-color shadow-sm hover:border-primary/40"
                    : "bg-card-bg/50 border-red-500/20 opacity-60"
                }`}
              >
                {/* Card Title & Status Badge */}
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-foreground flex items-center gap-2">
                    <FaTruck className="text-primary w-4 h-4" />
                    {item.governorate}
                  </h3>

                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                      item.isActive
                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                        : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    }`}
                  >
                    {item.isActive ? "نشط بالشحن" : "معطل"}
                  </button>
                </div>

                {/* Rates Edit Form or Display */}
                {isEditing ? (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-foreground/70 mb-1">
                        سعر الكيلو الأول (ج.م)
                      </label>
                      <input
                        type="number"
                        value={editBaseCost}
                        onChange={(e) => setEditBaseCost(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-primary outline-none font-bold text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-foreground/70 mb-1">
                        سعر الكيلو / المجلد الزائد (ج.م)
                      </label>
                      <input
                        type="number"
                        value={editExtraKgCost}
                        onChange={(e) => setEditExtraKgCost(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-primary outline-none font-bold text-primary"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleSaveEdit(item._id)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <FaCheck className="w-3 h-3" />
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="py-2 px-4 border border-border-color hover:bg-foreground/5 text-foreground/70 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center p-3 rounded-2xl bg-foreground/[0.02] border border-border-color/30 text-xs">
                      <span className="text-foreground/70">سعر الكيلو الأول:</span>
                      <span className="font-black text-primary">{item.baseCost} ج.م</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-2xl bg-foreground/[0.02] border border-border-color/30 text-xs">
                      <span className="text-foreground/70">الكيلو / المجلد الإضافي:</span>
                      <span className="font-black text-emerald-500">+{item.extraKgCost} ج.م</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="تعديل الأسعار"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGov(item._id, item.governorate)}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="حذف المحافظة"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filteredRates.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <span className="text-xs text-foreground/60 font-medium">
            عرض {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRates.length)} من {filteredRates.length} محافظة
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-4 py-2 rounded-xl border border-border-color text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-foreground/5 hover:border-primary/40 transition-all cursor-pointer"
            >
              ← السابق
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    pg === safePage
                      ? "bg-primary text-white shadow-md gold-glow"
                      : "border border-border-color hover:border-primary/40 hover:bg-foreground/5 text-foreground/70"
                  }`}
                >
                  {pg}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-4 py-2 rounded-xl border border-border-color text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-foreground/5 hover:border-primary/40 transition-all cursor-pointer"
            >
              التالي →
            </button>
          </div>
        </div>
      )}

      {/* Add New Governorate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-bg border border-border-color rounded-3xl shadow-2xl p-6 space-y-5 text-foreground animate-fadeIn">
            <div className="flex items-center justify-between border-b border-border-color pb-4">
              <h3 className="font-black text-base flex items-center gap-2">
                <FaTruck className="text-primary" />
                إضافة أسعار محافظة جديدة
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-foreground/10 text-foreground/60 transition"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddGovernorate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground/80 mb-1">
                  اسم المحافظة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGovName}
                  onChange={(e) => setNewGovName(e.target.value)}
                  placeholder="مثال: مرسى مطروح"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-background border border-border-color outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/80 mb-1">
                  سعر الكيلو الأول (الأساسي) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newBaseCost}
                  onChange={(e) => setNewBaseCost(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-background border border-border-color outline-none focus:border-primary font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/80 mb-1">
                  سعر الكيلو / المجلد الإضافي <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newExtraKgCost}
                  onChange={(e) => setNewExtraKgCost(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-background border border-border-color outline-none focus:border-primary font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  إضافة المحافظة الآن
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 border border-border-color hover:bg-foreground/5 text-xs font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
