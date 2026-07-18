"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FaPlus,
  FaEdit,
  FaCopy,
  FaTrash,
  FaFileExport,
  FaFileImport,
  FaSearch,
  FaFilter,
  FaUndo,
  FaTrashRestore,
  FaCheck,
  FaTimes,
  FaBookOpen,
  FaChevronDown,
} from "react-icons/fa";
import Swal from "sweetalert2";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Book {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  author?: string;
  publisher?: string;
  categoryId?: {
    _id: string;
    name: string;
  };
  prices?: {
    egp?: number;
    lyd?: number;
  };
  coverImage?: {
    secureUrl?: string;
    publicId?: string;
  };
  isbn?: string;
  edition?: string;
  publicationYear?: number;
  pagesCount?: number;
  volumesCount?: number;
  coverType?: string;
  size?: string;
  language?: string;
  availabilityStatus: "available" | "unavailable";
  isFeatured: boolean;
  internalNotes?: string;
  isDeleted: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export default function BooksManager() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [availability, setAvailability] = useState("");
  const [isFeatured, setIsFeatured] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Custom Dropdown State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [removeImageFlag, setRemoveImageFlag] = useState(false);

  // Form Field States
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    author: "",
    publisher: "",
    categoryId: "",
    priceEgp: "",
    priceLyd: "",
    isbn: "",
    edition: "",
    publicationYear: "",
    pagesCount: "",
    volumesCount: "1",
    coverType: "",
    size: "",
    language: "العربية",
    availabilityStatus: "available" as "available" | "unavailable",
    isFeatured: false,
    internalNotes: "",
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Fetch books list
  const fetchBooks = () => {
    setLoading(true);
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      showDeleted: String(showDeleted),
    });

    if (search.trim()) query.set("search", search);
    if (selectedCategory) query.set("categoryId", selectedCategory);
    if (availability) query.set("availability", availability);
    if (isFeatured) query.set("isFeatured", isFeatured);

    fetch(`/api/admin/books?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBooks(data.data);
          setPagination(data.pagination);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCategories(data.data);
        }
      });
  }, []);

  // Prevent background scrolling when a modal is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  // Click outside category dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch books when pagination, filter or deleted-mode changes
  useEffect(() => {
    fetchBooks();
    setSelectedIds([]);
  }, [page, limit, selectedCategory, availability, isFeatured, showDeleted]);

  // Debounced search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchBooks();
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Handle Input Changes in Add/Edit form
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle Cover Image upload and conversion to base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "الملف كبير جداً",
          text: "الحد الأقصى لحجم الصورة هو 2 ميجابايت",
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
        setCoverBase64(reader.result as string);
        setRemoveImageFlag(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCoverPreview(null);
    setCoverBase64(null);
    setRemoveImageFlag(true);
  };

  // Open modal for Create Book
  const openCreateModal = () => {
    setEditingBookId(null);
    setCoverPreview(null);
    setCoverBase64(null);
    setRemoveImageFlag(false);
    setErrors({});
    setFormData({
      title: "",
      description: "",
      author: "",
      publisher: "",
      categoryId: categories[0]?._id || "",
      priceEgp: "",
      priceLyd: "",
      isbn: "",
      edition: "",
      publicationYear: "",
      pagesCount: "",
      volumesCount: "1",
      coverType: "",
      size: "",
      language: "العربية",
      availabilityStatus: "available",
      isFeatured: false,
      internalNotes: "",
    });
    setModalOpen(true);
  };

  // Open modal for Editing Book
  const openEditModal = (book: Book) => {
    setEditingBookId(book._id);
    setCoverPreview(book.coverImage?.secureUrl || null);
    setCoverBase64(null);
    setRemoveImageFlag(false);
    setErrors({});
    setFormData({
      title: book.title,
      description: book.description || "",
      author: book.author || "",
      publisher: book.publisher || "",
      categoryId: book.categoryId?._id || "",
      priceEgp: book.prices?.egp?.toString() || "",
      priceLyd: book.prices?.lyd?.toString() || "",
      isbn: book.isbn || "",
      edition: book.edition || "",
      publicationYear: book.publicationYear?.toString() || "",
      pagesCount: book.pagesCount?.toString() || "",
      volumesCount: book.volumesCount?.toString() || "1",
      coverType: book.coverType || "",
      size: book.size || "",
      language: book.language || "العربية",
      availabilityStatus: book.availabilityStatus,
      isFeatured: book.isFeatured,
      internalNotes: book.internalNotes || "",
    });
    setModalOpen(true);
  };

  // Duplicate book function
  const handleDuplicate = (book: Book) => {
    setEditingBookId(null);
    setCoverPreview(book.coverImage?.secureUrl || null);
    setCoverBase64(null);
    setRemoveImageFlag(false);
    setErrors({});
    setFormData({
      title: `${book.title} (نسخة مكررة)`,
      description: book.description || "",
      author: book.author || "",
      publisher: book.publisher || "",
      categoryId: book.categoryId?._id || "",
      priceEgp: book.prices?.egp?.toString() || "",
      priceLyd: book.prices?.lyd?.toString() || "",
      isbn: "", // ISBN must be unique, so keep blank
      edition: book.edition || "",
      publicationYear: book.publicationYear?.toString() || "",
      pagesCount: book.pagesCount?.toString() || "",
      volumesCount: book.volumesCount?.toString() || "1",
      coverType: book.coverType || "",
      size: book.size || "",
      language: book.language || "العربية",
      availabilityStatus: book.availabilityStatus,
      isFeatured: false,
      internalNotes: book.internalNotes || "",
    });
    setModalOpen(true);
  };

  // Submit Add/Edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const payload = {
      ...formData,
      categoryId: formData.categoryId,
      prices: {
        egp: formData.priceEgp && !isNaN(parseFloat(formData.priceEgp)) ? parseFloat(formData.priceEgp) : undefined,
        lyd: formData.priceLyd && !isNaN(parseFloat(formData.priceLyd)) ? parseFloat(formData.priceLyd) : undefined,
      },
      coverImageBase64: coverBase64 || undefined,
      removeImage: removeImageFlag,
    };

    const url = editingBookId ? `/api/admin/books/${editingBookId}` : "/api/admin/books";
    const method = editingBookId ? "PATCH" : "POST";

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
          title: editingBookId ? "تم تحديث الكتاب" : "تم إضافة الكتاب",
          text: data.message,
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
        fetchBooks();
      } else {
        if (data.errors) {
          setErrors(data.errors);
        }
        Swal.fire({
          icon: "error",
          title: "تعذر حفظ البيانات",
          text: data.message || "يرجى مراجعة الحقول والتحقق من صحتها",
          confirmButtonText: "حسناً",
          confirmButtonColor: "#d4af37",
        });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع في الاتصال" });
    } finally {
      setSubmitting(false);
    }
  };

  // Single book Delete / Restore handler
  const handleDelete = async (book: Book, permanent = false) => {
    const actionText = permanent ? "حذف نهائي" : "نقل لسلة المهملات";
    const actionDesc = permanent
      ? `هل أنت متأكد من رغبتك في حذف كتاب «${book.title}» نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
      : `هل أنت متأكد من نقل كتاب «${book.title}» إلى سلة المحذوفات؟`;

    const result = await Swal.fire({
      title: actionText,
      text: actionDesc,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "تأكيد الحذف",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
    });

    if (result.isConfirmed) {
      try {
        const query = permanent ? "?permanent=true" : "";
        const res = await fetch(`/api/admin/books/${book._id}${query}`, { method: "DELETE" });
        const data = await res.json();

        if (res.ok && data.success) {
          Swal.fire({
            icon: "success",
            title: "تمت العملية بنجاح",
            text: data.message,
            confirmButtonText: "موافق",
            confirmButtonColor: "#d4af37",
          });
          fetchBooks();
        } else {
          Swal.fire({ icon: "error", title: "فشل الإجراء", text: data.message });
        }
      } catch (err) {
        Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع" });
      }
    }
  };

  const handleRestore = async (book: Book) => {
    try {
      const res = await fetch(`/api/admin/books/${book._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "تم استعادة الكتاب",
          text: data.message,
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
        fetchBooks();
      } else {
        Swal.fire({ icon: "error", title: "فشل الاستعادة", text: data.message });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع" });
    }
  };

  // Bulk operations handler
  const handleBulkAction = async (action: string, extraData: any = {}) => {
    if (selectedIds.length === 0) return;

    let confirmTitle = "إجراء جماعي";
    let confirmText = `هل أنت متأكد من تطبيق هذا الإجراء على ${selectedIds.length} كتب؟`;

    if (action === "delete") {
      confirmTitle = "حذف جماعي";
      confirmText = `هل أنت متأكد من نقل ${selectedIds.length} كتب إلى سلة المحذوفات؟`;
    } else if (action === "permanentDelete") {
      confirmTitle = "حذف نهائي جماعي";
      confirmText = `هل أنت متأكد من حذف ${selectedIds.length} كتب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`;
    }

    const result = await Swal.fire({
      title: confirmTitle,
      text: confirmText,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "تأكيد الإجراء",
      cancelButtonText: "إلغاء",
      confirmButtonColor: action.includes("Delete") ? "#dc3545" : "#d4af37",
      cancelButtonColor: "#6c757d",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/admin/books/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: selectedIds,
            action,
            ...extraData,
          }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          Swal.fire({
            icon: "success",
            title: "نجاح العملية",
            text: data.message,
            confirmButtonText: "موافق",
            confirmButtonColor: "#d4af37",
          });
          setSelectedIds([]);
          fetchBooks();
        } else {
          Swal.fire({ icon: "error", title: "فشل العملية", text: data.message });
        }
      } catch (err) {
        Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع" });
      }
    }
  };

  // Checkbox Selection Helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = books.map((b) => b._id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectId = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Export matching results to CSV
  const handleExport = async () => {
    try {
      const query = new URLSearchParams({
        categoryId: selectedCategory,
        isFeatured,
      });

      const res = await fetch(`/api/admin/books/export?${query.toString()}`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const items = data.data;
        if (items.length === 0) {
          Swal.fire({ icon: "info", title: "لا توجد بيانات", text: "لا توجد سجلات كتب لتصديرها" });
          return;
        }

        // CSV Formatter
        const headers = Object.keys(items[0]);
        const csvContent = [
          headers.join(","), // header row
          ...items.map((row: any) =>
            headers
              .map((header) => {
                const cell = row[header] === null || row[header] === undefined ? "" : String(row[header]);
                // escape double quotes
                const escaped = cell.replace(/"/g, '""');
                return `"${escaped}"`;
              })
              .join(",")
          ),
        ].join("\r\n");

        // UTF-8 BOM to display Arabic characters properly in Excel
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `كتب_مؤسسة_ابن_الجراح_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "خطأ", text: "فشل تصدير البيانات" });
    }
  };

  return (
    <div className="flex flex-col gap-6 text-right transition-colors duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">إدارة الكتب والمطبوعات</h1>
          <p className="text-xs text-foreground/60 mt-1">تعديل وإضافة وحذف الكتب، واستيراد القوائم أو تصديرها</p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer border flex-1 sm:flex-none order-2 sm:order-none ${
              showDeleted
                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                : "bg-card-bg border-border-color text-foreground/70 hover:text-red-500 hover:border-red-500 hover:bg-red-500/10"
            }`}
          >
            {showDeleted ? <FaBookOpen /> : <FaTrash />}
            {showDeleted ? "عرض الكتب النشطة" : "سلة المحذوفات"}
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border-color px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-none order-3 sm:order-none"
          >
            <FaFileExport />
            تصدير النتائج
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-md gold-glow transition-all cursor-pointer w-full sm:w-auto sm:flex-none order-1 sm:order-none"
          >
            <FaPlus />
            إضافة كتاب جديد
          </button>
        </div>
      </div>

      {/* Search and Filters panel */}
      <div className="bg-card-bg border border-border-color rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end transition-colors duration-300">
        
        {/* Search Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-foreground/70">بحث بالاسم أو المؤلف</label>
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث هنا..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-foreground/[0.02] border border-border-color rounded-lg py-2 pl-3 pr-8 text-xs focus:border-primary/50 focus:outline-none"
            />
            <FaSearch className="absolute top-1/2 right-2.5 -translate-y-1/2 text-foreground/40 text-xs" />
          </div>
        </div>

        {/* Category Select */}
        <div className="flex flex-col gap-1.5" ref={categoryDropdownRef}>
          <label className="text-[10px] font-bold text-foreground/70">التصنيف</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full bg-card-bg border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:border-primary/50 focus:outline-none cursor-pointer text-right transition-colors relative"
            >
              <span className="truncate block">
                {selectedCategory
                  ? categories.find((c) => c._id === selectedCategory)?.name || "غير محدد"
                  : "الكل"}
              </span>
              <FaChevronDown className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 text-[9px] transition-transform duration-200 ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute right-0 min-w-[240px] max-w-[90vw] mt-1.5 z-30 bg-card-bg border border-border-color rounded-xl shadow-xl p-2.5 flex flex-col gap-2 max-h-60 overflow-y-auto animate-fade-in text-right">
                {/* Search Input inside Dropdown */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث عن تصنيف..."
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    className="w-full bg-foreground/[0.02] border border-border-color rounded-lg py-1.5 pl-3 pr-7 text-xs focus:border-primary/50 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <FaSearch className="absolute top-1/2 right-2.5 -translate-y-1/2 text-foreground/45 text-[10px]" />
                </div>

                {/* Options list */}
                <div className="flex flex-col max-h-40 overflow-y-auto divide-y divide-border-color/10 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("");
                      setIsCategoryDropdownOpen(false);
                      setCategorySearchQuery("");
                    }}
                    className={`w-full text-right px-2 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-all rounded-md cursor-pointer ${
                      !selectedCategory ? "text-primary font-bold bg-primary/5" : "text-foreground/80"
                    }`}
                  >
                    كل التصنيفات
                  </button>
                  {categories
                    .filter((c) =>
                      c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                    )
                    .map((cat) => (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat._id);
                          setIsCategoryDropdownOpen(false);
                          setCategorySearchQuery("");
                        }}
                        className={`w-full text-right px-2 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-all rounded-md cursor-pointer ${
                          selectedCategory === cat._id ? "text-primary font-bold bg-primary/5" : "text-foreground/80"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  {categories.filter((c) => c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())).length === 0 && (
                    <div className="text-center text-[10px] text-foreground/40 py-3">
                      لا توجد تصنيفات مطابقة
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Availability Select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-foreground/70">حالة التوفر</label>
          <div className="relative">
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full appearance-none bg-card-bg border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:border-primary/50 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-card-bg text-foreground">الكل</option>
              <option value="available" className="bg-card-bg text-foreground">متوفر</option>
              <option value="unavailable" className="bg-card-bg text-foreground">نفد</option>
            </select>
            <FaChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none text-[9px]" />
          </div>
        </div>

        {/* Featured Select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-foreground/70">تمييز الكتاب</label>
          <div className="relative">
            <select
              value={isFeatured}
              onChange={(e) => setIsFeatured(e.target.value)}
              className="w-full appearance-none bg-card-bg border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:border-primary/50 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-card-bg text-foreground">الكل</option>
              <option value="true" className="bg-card-bg text-foreground">مميز</option>
              <option value="false" className="bg-card-bg text-foreground">غير مميز</option>
            </select>
            <FaChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none text-[9px]" />
          </div>
        </div>

        {/* Clear search parameters button */}
        <button
          onClick={() => {
            setSearch("");
            setSelectedCategory("");
            setAvailability("");
            setIsFeatured("");
          }}
          className="flex items-center justify-center gap-1.5 border border-border-color hover:bg-foreground/5 text-foreground py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <FaUndo className="w-3 h-3" />
          إعادة تعيين
        </button>

      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold text-primary">تم تحديد ({selectedIds.length}) كتب:</span>
          
          <div className="flex flex-wrap gap-2">
            
            {/* Category migrator */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAction("updateCategory", { categoryId: e.target.value });
                  e.target.value = "";
                }
              }}
              className="bg-card-bg border border-border-color rounded-lg px-2 py-1 text-[11px] focus:outline-none"
            >
              <option value="">نقل للتصنيف...</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Availability toggler */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAction("updateAvailability", { availabilityStatus: e.target.value });
                  e.target.value = "";
                }
              }}
              className="bg-card-bg border border-border-color rounded-lg px-2 py-1 text-[11px] focus:outline-none"
            >
              <option value="">تغيير حالة التوفر...</option>
              <option value="available">متوفر للطلب</option>
              <option value="unavailable">نفد</option>
            </select>

            {/* Featured toggler */}
            <button
              onClick={() => handleBulkAction("updateFeatured", { isFeatured: true })}
              className="bg-card-bg border border-border-color hover:bg-foreground/5 text-foreground px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              تمييز جماعي
            </button>
            <button
              onClick={() => handleBulkAction("updateFeatured", { isFeatured: false })}
              className="bg-card-bg border border-border-color hover:bg-foreground/5 text-foreground px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              إلغاء التمييز الجماعي
            </button>

            {/* Delete group */}
            <button
              onClick={() => handleBulkAction(showDeleted ? "permanentDelete" : "delete")}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              {showDeleted ? "حذف نهائي جماعي" : "حذف جماعي"}
            </button>

            {showDeleted && (
              <button
                onClick={() => handleBulkAction("restore")}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                استعادة جماعية
              </button>
            )}

          </div>
        </div>
      )}

      {/* Books Table Panel */}
      <div className="bg-card-bg border border-border-color rounded-2xl shadow-sm overflow-hidden transition-colors duration-300">
        
        {loading ? (
          <div className="p-12 text-center text-xs text-foreground/50 skeleton">
            جاري جلب قائمة الكتب من السيرفر...
          </div>
        ) : books.length === 0 ? (
          <div className="p-16 text-center text-xs text-foreground/50">
            لا توجد سجلات كتب مطابقة حالياً.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-foreground/[0.02] border-b border-border-color text-foreground/75">
                  <th className="p-3.5 text-center w-12 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === books.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-border-color text-primary focus:ring-primary accent-primary"
                    />
                  </th>
                  <th className="p-3.5 font-bold whitespace-nowrap">الكتاب</th>
                  <th className="p-3.5 font-bold whitespace-nowrap">المؤلف</th>
                  <th className="p-3.5 font-bold whitespace-nowrap">التصنيف</th>
                  <th className="p-3.5 font-bold whitespace-nowrap">السعر (جنيه)</th>
                  <th className="p-3.5 font-bold text-center whitespace-nowrap">حالة التوفر</th>
                  <th className="p-3.5 font-bold text-center w-36 whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/50">
                {books.map((book) => (
                  <tr key={book._id} className="hover:bg-foreground/[0.005] transition-colors">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(book._id)}
                        onChange={(e) => handleSelectId(book._id, e.target.checked)}
                        className="w-4 h-4 rounded border-border-color text-primary focus:ring-primary accent-primary"
                      />
                    </td>
                    <td className="p-3 font-bold text-foreground max-w-[220px]">
                      <div className="flex items-center gap-3">
                        <img
                          src={book.coverImage?.secureUrl || "/images/hero-book.webp"}
                          alt=""
                          className="w-8 h-10 object-cover rounded shadow-sm border border-border-color shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate block" title={book.title}>{book.title}</span>
                          {book.isbn && <span className="text-[10px] text-foreground/50 font-mono mt-0.5 truncate" dir="ltr">{book.isbn}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-foreground/80 max-w-[140px]">
                      <span className="truncate block" title={book.author || "—"}>{book.author || "—"}</span>
                    </td>
                    <td className="p-3 text-foreground/75 max-w-[120px]">
                      <span className="truncate block" title={book.categoryId?.name || "عام"}>{book.categoryId?.name || "عام"}</span>
                    </td>
                    <td className="p-3 font-bold text-primary">
                      {book.prices?.egp !== undefined ? `${book.prices.egp} ج.م` : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          book.availabilityStatus === "available"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {book.availabilityStatus === "available" ? "متوفر" : "نفد"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {showDeleted ? (
                          <>
                            <button
                              onClick={() => handleRestore(book)}
                              className="p-2 rounded bg-green-500/10 hover:bg-green-500 text-green-600 hover:text-white transition-colors cursor-pointer"
                              title="استعادة كتاب"
                            >
                              <FaTrashRestore className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(book, true)}
                              className="p-2 rounded bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white transition-colors cursor-pointer"
                              title="حذف نهائي"
                            >
                              <FaTrash className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(book)}
                              className="p-2 rounded bg-primary/10 hover:bg-primary text-primary hover:text-white transition-colors cursor-pointer"
                              title="تعديل الكتاب"
                            >
                              <FaEdit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(book)}
                              className="p-2 rounded bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white transition-colors cursor-pointer"
                              title="تكرار الكتاب"
                            >
                              <FaCopy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(book)}
                              className="p-2 rounded bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <FaTrash className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Pagination Footer bar */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-color pt-4 px-2 text-xs">
          <span className="text-foreground/60">
            إجمالي <span className="font-extrabold text-primary">{pagination.totalResults}</span> نتيجة
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-color rounded-lg bg-card-bg hover:bg-foreground/5 text-foreground disabled:opacity-40 disabled:hover:bg-card-bg cursor-pointer select-none transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
              السابق
            </button>

            <select
              value={pagination.page}
              onChange={(e) => setPage(Number(e.target.value))}
              className="bg-card-bg border border-border-color rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:border-primary/50 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>{p} / {pagination.totalPages}</option>
              ))}
            </select>

            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(pagination.page + 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-color rounded-lg bg-card-bg hover:bg-foreground/5 text-foreground disabled:opacity-40 disabled:hover:bg-card-bg cursor-pointer select-none transition-all"
            >
              التالي
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Book Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="relative w-full max-w-4xl bg-card-bg border border-border-color rounded-2xl shadow-2xl flex flex-col text-right transition-colors duration-300 max-h-[92vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Close modal - positioned inside rounded container so it stays within borders */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-foreground/10 hover:bg-red-500 hover:text-white text-foreground flex items-center justify-center cursor-pointer border border-border-color/40 transition-all duration-200 shadow-sm"
              title="إغلاق"
            >
              <FaTimes className="w-3.5 h-3.5" />
            </button>

            {/* Form layout - scrollable inner content */}
            <form onSubmit={handleFormSubmit} className="w-full flex flex-col md:flex-row items-stretch overflow-y-auto max-h-[92vh]">
              
              {/* Left Column: Image preview & selection */}
              <div className="w-full md:w-2/5 p-4 md:p-6 bg-foreground/[0.02] border-b md:border-b-0 md:border-l border-border-color/50 flex flex-col items-center justify-center shrink-0">
                <div className="flex flex-col items-center gap-3 md:gap-4">
                  <span className="text-[10px] md:text-xs font-bold text-foreground/70">غلاف الكتاب (اختياري)</span>
                  
                  {/* Preview box */}
                  <div className="w-28 md:w-48 aspect-[3/4] rounded-lg border border-border-color shadow-md bg-card-bg flex flex-col items-center justify-center overflow-hidden relative group gold-glow">
                    {coverPreview ? (
                      <>
                        <img src={coverPreview} alt="غلاف الكتاب" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute bottom-2 left-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
                          title="إزالة الغلاف"
                        >
                          <FaTimes className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-foreground/30 text-center p-4">
                        <FaBookOpen className="text-4xl text-primary/30" />
                        <span className="text-[10px]">لا يوجد غلاف حالياً</span>
                      </div>
                    )}
                  </div>

                  {/* File Upload Selector */}
                  <label className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold text-xs shadow transition-all cursor-pointer">
                    اختر صورة الغلاف
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[9px] text-foreground/45">صيغ الصور: JPG, PNG, WEBP (بحد أقصى 2MB)</span>
                </div>
              </div>

              {/* Right Column: Metadata inputs */}
              <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col gap-4 overflow-visible md:overflow-y-auto md:max-h-[85vh]">
                <h2 className="font-black text-lg text-foreground border-r-4 border-primary pr-3 py-0.5 mb-2">
                  {editingBookId ? "تعديل تفاصيل الكتاب" : "إضافة كتاب جديد للنشر"}
                </h2>

                {/* Form fields grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  
                  {/* Book Title */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="font-bold text-foreground/75">اسم الكتاب *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleFormChange}
                      className={`bg-foreground/[0.02] border rounded-lg p-2.5 text-xs focus:outline-none ${
                        errors.title ? "border-red-500" : "border-border-color"
                      }`}
                    />
                    {errors.title && <span className="text-[10px] text-red-500">{errors.title[0]}</span>}
                  </div>

                  {/* Author */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">المؤلف (الكاتب)</label>
                    <input
                      type="text"
                      name="author"
                      value={formData.author}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Publisher */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">دار النشر</label>
                    <input
                      type="text"
                      name="publisher"
                      value={formData.publisher}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Category select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">التصنيف *</label>
                    <select
                      name="categoryId"
                      required
                      value={formData.categoryId}
                      onChange={handleFormChange}
                      className="bg-card-bg border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ISBN */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">رقم ISBN</label>
                    <input
                      type="text"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Price EGP */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">السعر بالجنيه المصري</label>
                    <input
                      type="number"
                      name="priceEgp"
                      min="0"
                      step="0.01"
                      value={formData.priceEgp}
                      onChange={handleFormChange}
                      className={`bg-foreground/[0.02] border rounded-lg p-2.5 text-xs focus:outline-none ${
                        errors.prices ? "border-red-500" : "border-border-color"
                      }`}
                    />
                  </div>

                  {/* Price LYD */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">السعر بالدينار الليبي</label>
                    <input
                      type="number"
                      name="priceLyd"
                      min="0"
                      step="0.01"
                      value={formData.priceLyd}
                      onChange={handleFormChange}
                      className={`bg-foreground/[0.02] border rounded-lg p-2.5 text-xs focus:outline-none ${
                        errors.prices ? "border-red-500" : "border-border-color"
                      }`}
                    />
                  </div>

                  {/* Availability status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">حالة التوفر</label>
                    <select
                      name="availabilityStatus"
                      value={formData.availabilityStatus}
                      onChange={handleFormChange}
                      className="bg-card-bg border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    >
                      <option value="available">متوفر للطلب</option>
                      <option value="unavailable">نفد</option>
                    </select>
                  </div>

                  {/* Volumes count */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">عدد المجلدات</label>
                    <input
                      type="number"
                      name="volumesCount"
                      min="1"
                      value={formData.volumesCount}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Pages count */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">عدد الصفحات</label>
                    <input
                      type="number"
                      name="pagesCount"
                      min="0"
                      value={formData.pagesCount}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Publication Year */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">سنة النشر</label>
                    <input
                      type="number"
                      name="publicationYear"
                      value={formData.publicationYear}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Cover Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">نوع التجليد (سلوفان، فني...)</label>
                    <input
                      type="text"
                      name="coverType"
                      value={formData.coverType}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Book Size */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/75">مقاس الكتاب (مثال: 24*17)</label>
                    <input
                      type="text"
                      name="size"
                      value={formData.size}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Book Description / details */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="font-bold text-foreground/75">وصف الكتاب</label>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Internal Notes */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="font-bold text-foreground/75">ملاحظات داخلية (لا تظهر للزوار)</label>
                    <textarea
                      name="internalNotes"
                      rows={2}
                      value={formData.internalNotes}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Featured checkbox */}
                  <div className="flex items-center gap-2 sm:col-span-2 pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground select-none">
                      <input
                        type="checkbox"
                        name="isFeatured"
                        checked={formData.isFeatured}
                        onChange={handleFormChange}
                        className="w-4 h-4 rounded border-border-color text-primary focus:ring-primary accent-primary"
                      />
                      <span>تمييز هذا الكتاب (عرضه في قسم المميز بالرئيسية)</span>
                    </label>
                  </div>

                  {/* Validation errors summary */}
                  {errors.prices && (
                    <span className="text-[10px] text-red-500 font-semibold sm:col-span-2">
                      {errors.prices[0]}
                    </span>
                  )}

                </div>

                {/* Footer Save actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-border-color/50 mt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="border border-border-color hover:bg-foreground/5 text-foreground px-6 py-2.5 rounded-lg font-bold text-xs md:text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-bold px-8 py-2.5 rounded-lg text-xs md:text-sm shadow-md gold-glow cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting ? "جاري الحفظ..." : "حفظ الكتاب"}
                  </button>
                </div>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
export type BookType = Book;
