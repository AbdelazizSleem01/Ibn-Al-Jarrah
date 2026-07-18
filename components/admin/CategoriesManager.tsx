"use client";

import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes } from "react-icons/fa";
import IconRenderer from "@/components/ui/IconRenderer";
import Swal from "sweetalert2";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isVisible: boolean;
  displayOrder: number;
  booksCount: number;
}

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "FaBook",
    isVisible: true,
    displayOrder: 0,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const fetchCategories = () => {
    setLoading(true);
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCategories(data.data);
          setFilteredCategories(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filter list on search text change
  useEffect(() => {
    if (!search.trim()) {
      setFilteredCategories(categories);
    } else {
      const lower = search.toLowerCase();
      const filtered = categories.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          (c.description && c.description.toLowerCase().includes(lower))
      );
      setFilteredCategories(filtered);
    }
  }, [search, categories]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const openCreateModal = () => {
    setEditingCategoryId(null);
    setErrors({});
    setFormData({
      name: "",
      description: "",
      icon: "FaBook",
      isVisible: true,
      displayOrder: categories.length + 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategoryId(cat._id);
    setErrors({});
    setFormData({
      name: cat.name,
      description: cat.description || "",
      icon: cat.icon || "FaBook",
      isVisible: cat.isVisible,
      displayOrder: cat.displayOrder,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const url = editingCategoryId
      ? `/api/admin/categories/${editingCategoryId}`
      : "/api/admin/categories";
    const method = editingCategoryId ? "PATCH" : "POST";

    const payload = {
      ...formData,
      displayOrder: Number(formData.displayOrder),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setModalOpen(false);
        Swal.fire({
          icon: "success",
          title: editingCategoryId ? "تم تعديل التصنيف" : "تم إنشاء التصنيف",
          text: data.message,
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
        fetchCategories();
      } else {
        if (data.errors) {
          setErrors(data.errors);
        }
        Swal.fire({
          icon: "error",
          title: "فشل الحفظ",
          text: data.message || "يرجى مراجعة الحقول الخاطئة",
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع في الاتصال" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (cat.booksCount > 0) {
      Swal.fire({
        icon: "warning",
        title: "لا يمكن حذف التصنيف",
        text: `التصنيف مرتبط بـ ${cat.booksCount} من الكتب. يرجى نقل الكتب إلى تصنيف آخر أولاً قبل حذف هذا التصنيف.`,
        confirmButtonText: "موافق",
        confirmButtonColor: "#d4af37",
      });
      return;
    }

    const result = await Swal.fire({
      title: "حذف التصنيف",
      text: `هل أنت متأكد من رغبتك في حذف تصنيف «${cat.name}»؟`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "تأكيد الحذف",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/categories/${cat._id}`, { method: "DELETE" });
        const data = await res.json();

        if (res.ok && data.success) {
          Swal.fire({
            icon: "success",
            title: "تم الحذف",
            text: data.message,
            confirmButtonText: "موافق",
            confirmButtonColor: "#d4af37",
          });
          fetchCategories();
        } else {
          Swal.fire({ icon: "error", title: "فشل الحذف", text: data.message });
        }
      } catch (err) {
        Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع" });
      }
    }
  };

  // Popular icons to show in simple dropdown
  const popularIcons = [
    { value: "FaBook", label: "كتاب" },
    { value: "FaBookOpen", label: "كتاب مفتوح" },
    { value: "FaGraduationCap", label: "قبعة تخرج / طالب علم" },
    { value: "FaUniversity", label: "جامعة / مؤسسة" },
    { value: "FaBalanceScale", label: "ميزان / فقه وأحكام" },
    { value: "FaGlobe", label: "كرة أرضية / عقيدة وعالمية" },
    { value: "FaHistory", label: "ساعة / تاريخ" },
    { value: "FaBookmark", label: "إشارة مرجعية" },
    { value: "FaUser", label: "مستند شخصي / تراجم" },
    { value: "FaQuran", label: "مصحف / قرآنيات" },
  ];

  return (
    <div className="flex flex-col gap-6 text-right transition-colors duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">إدارة تصنيفات الكتب</h1>
          <p className="text-xs text-foreground/60 mt-1">عرض وتعديل وحذف أقسام وتصنيفات المطبوعات</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-md gold-glow transition-all cursor-pointer self-start"
        >
          <FaPlus />
          إضافة تصنيف جديد
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-card-bg border border-border-color rounded-2xl p-4 shadow-sm flex items-center justify-between transition-colors duration-300">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            placeholder="ابحث باسم التصنيف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-foreground/[0.02] border border-border-color rounded-lg py-2 pl-3 pr-8 text-xs focus:border-primary/50 focus:outline-none"
          />
          <FaSearch className="absolute top-1/2 right-2.5 -translate-y-1/2 text-foreground/40 text-xs" />
        </div>

        <div className="text-xs text-foreground/60">
          إجمالي التصنيفات: <span className="font-extrabold text-foreground">{categories.length}</span>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-card-bg border border-border-color rounded-2xl shadow-sm overflow-hidden transition-colors duration-300">
        {loading ? (
          <div className="p-12 text-center text-xs text-foreground/50 skeleton">
            جاري جلب التصنيفات...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-16 text-center text-xs text-foreground/50">
            لا توجد تصنيفات لعرضها حالياً.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-foreground/[0.02] border-b border-border-color text-foreground/75">
                  <th className="p-3.5 font-bold w-16 text-center">أيقونة</th>
                  <th className="p-3.5 font-bold">اسم التصنيف</th>
                  <th className="p-3.5 font-bold">رابط التصنيف (Slug)</th>
                  <th className="p-3.5 font-bold">الوصف</th>
                  <th className="p-3.5 font-bold text-center">عدد الكتب</th>
                  <th className="p-3.5 font-bold text-center">حالة الظهور</th>
                  <th className="p-3.5 font-bold text-center">ترتيب الظهور</th>
                  <th className="p-3.5 font-bold text-center w-28">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/50">
                {filteredCategories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-foreground/[0.005] transition-colors">
                    <td className="p-3">
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <IconRenderer name={cat.icon} className="w-4 h-4" />
                      </div>
                    </td>
                    <td className="p-3 font-bold text-foreground">{cat.name}</td>
                    <td className="p-3 font-mono text-foreground/50 text-[11px]" dir="ltr">
                      {cat.slug}
                    </td>
                    <td className="p-3 text-foreground/75 truncate max-w-[200px]">
                      {cat.description || "—"}
                    </td>
                    <td className="p-3 text-center font-bold text-foreground">
                      {cat.booksCount || 0}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cat.isVisible
                            ? "bg-green-500/10 text-green-500"
                            : "bg-foreground/10 text-foreground/50"
                        }`}
                      >
                        {cat.isVisible ? "مرئي للزوار" : "مخفي"}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-foreground/60">
                      {cat.displayOrder}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-2 rounded bg-primary/10 hover:bg-primary text-primary hover:text-white transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <FaEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-2 rounded bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card-bg border border-border-color rounded-2xl shadow-2xl overflow-hidden p-6 relative transition-colors duration-300">
            
            {/* Close button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 left-4 p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground cursor-pointer z-10"
            >
              <FaTimes className="w-4 h-4" />
            </button>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <h2 className="font-black text-base md:text-lg text-foreground border-r-4 border-primary pr-3 py-0.5">
                {editingCategoryId ? "تعديل تصنيف كتاب" : "إضافة تصنيف كتاب جديد"}
              </h2>

              <div className="flex flex-col gap-3 text-xs mt-2">
                
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">اسم التصنيف *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    className={`bg-foreground/[0.02] border rounded-lg p-2.5 text-xs focus:outline-none ${
                      errors.name ? "border-red-500" : "border-border-color"
                    }`}
                  />
                  {errors.name && <span className="text-[10px] text-red-500">{errors.name[0]}</span>}
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">وصف التصنيف (اختياري)</label>
                  <textarea
                    name="description"
                    rows={2}
                    value={formData.description}
                    onChange={handleFormChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Icon selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">أيقونة التصنيف</label>
                  <div className="flex gap-3 items-center">
                    <select
                      name="icon"
                      value={formData.icon}
                      onChange={handleFormChange}
                      className="flex-grow bg-card-bg border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    >
                      {popularIcons.map((ico) => (
                        <option key={ico.value} value={ico.value}>
                          {ico.label} ({ico.value})
                        </option>
                      ))}
                    </select>
                    {/* Live Icon preview */}
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                      <IconRenderer name={formData.icon} className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Display Order */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">ترتيب الظهور</label>
                  <input
                    type="number"
                    name="displayOrder"
                    value={formData.displayOrder}
                    onChange={handleFormChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Visibility */}
                <div className="flex items-center gap-2.5 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground select-none">
                    <input
                      type="checkbox"
                      name="isVisible"
                      checked={formData.isVisible}
                      onChange={handleFormChange}
                      className="w-4 h-4 rounded border-border-color text-primary focus:ring-primary accent-primary"
                    />
                    <span>مرئي للزوار في الفلاتر والصفحة الرئيسية</span>
                  </label>
                </div>

              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-color/50 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-border-color hover:bg-foreground/5 text-foreground px-5 py-2 rounded-lg font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold px-7 py-2 rounded-lg text-xs shadow-md gold-glow cursor-pointer"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ التصنيف"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
