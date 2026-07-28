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
  FaFilePdf,
  FaSearchPlus,
  FaStar,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { compressImage } from "@/lib/utils/imageCompressor";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface ModalImageItem {
  id: string;
  url: string;
  secureUrl?: string;
  publicId?: string;
  base64?: string;
}

interface Book {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  author?: string;
  editorOrTranslator?: string;
  publisher?: string;
  categoryId?: {
    _id: string;
    name: string;
  } | string;
  prices?: {
    egp?: number;
    lyd?: number;
    usd?: number;
    wholesale?: number;
    profitMargin?: number;
  };
  coverImage?: {
    secureUrl?: string;
    publicId?: string;
  };
  images?: Array<{
    secureUrl?: string;
    publicId?: string;
  }>;
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
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [modalImages, setModalImages] = useState<ModalImageItem[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Form Field States
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    author: "",
    editorOrTranslator: "",
    publisher: "",
    categoryId: "",
    priceEgp: "",
    priceLyd: "",
    priceUsd: "",
    priceWholesale: "",
    profitMargin: "",
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
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // PDF Metadata Extraction Handler
  const handlePDFExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      Swal.fire("تنبيه", "يرجى اختيار ملف PDF فقط", "warning");
      return;
    }

    // Real-Time Progress Swal Dialog
    Swal.fire({
      title: "جاري تحليل وقراءة ملف الـ PDF...",
      html: `
        <div style="direction: rtl; font-family: inherit; padding: 6px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span id="pdf-status-text" style="font-size: 12px; font-weight: bold; color: #64748b;">جاري رفع وقراءة الصفحات الأولية...</span>
            <span id="pdf-percent-text" style="font-size: 16px; font-weight: 900; color: #d4af37;">10%</span>
          </div>
          <div style="width: 100%; background-color: #e2e8f0; height: 12px; border-radius: 9999px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);">
            <div id="pdf-progress-bar" style="width: 10%; background: linear-gradient(90deg, #d4af37, #f59e0b); height: 100%; border-radius: 9999px; transition: width 0.3s ease-in-out;"></div>
          </div>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    const updateProgress = (percent: number, statusText: string) => {
      const barEl = document.getElementById("pdf-progress-bar");
      const percentEl = document.getElementById("pdf-percent-text");
      const statusEl = document.getElementById("pdf-status-text");
      if (barEl) barEl.style.width = `${percent}%`;
      if (percentEl) percentEl.innerText = `${percent}%`;
      if (statusEl) statusEl.innerText = statusText;
    };

    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/admin/books/extract-pdf", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        throw new Error("فشل الاتصال بسيرفر معالجة الـ PDF");
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("استجابة السيرفر غير قابلة للقراءة التفاعلية");
      }

      const decoder = new TextDecoder();
      let bufferStr = "";
      let finalResultData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bufferStr += decoder.decode(value, { stream: true });
        const events = bufferStr.split("\n\n");
        bufferStr = events.pop() || "";

        for (const eventLine of events) {
          const trimmed = eventLine.trim();
          if (!trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, "");
          try {
            const parsedEvent = JSON.parse(jsonStr);
            if (parsedEvent.type === "progress") {
              updateProgress(parsedEvent.percent, parsedEvent.status);
            } else if (parsedEvent.type === "complete") {
              updateProgress(100, parsedEvent.status || "تم التحليل بنجاح 100%!");
              finalResultData = parsedEvent.data;
            } else if (parsedEvent.type === "error") {
              throw new Error(parsedEvent.message || "حدث خطأ أثناء معالجة ملف الـ PDF");
            }
          } catch (e: any) {
            if (e.message && !e.message.includes("JSON")) {
              throw e;
            }
          }
        }
      }

      await new Promise((r) => setTimeout(r, 400));
      Swal.close();

      if (finalResultData) {
        const ext = finalResultData;
        openCreateModal();

        setFormData((prev) => ({
          ...prev,
          title: ext.title || prev.title,
          author: ext.author || prev.author,
          publisher: ext.publisher || prev.publisher,
          isbn: ext.isbn || prev.isbn,
          edition: ext.edition || prev.edition,
          publicationYear: ext.publicationYear ? String(ext.publicationYear) : prev.publicationYear,
          pagesCount: ext.pagesCount ? String(ext.pagesCount) : prev.pagesCount,
          volumesCount: ext.volumesCount ? String(ext.volumesCount) : prev.volumesCount,
          internalNotes: ext.editorOrTranslator ? `المحقق/المترجم: ${ext.editorOrTranslator}` : prev.internalNotes,
        }));

        Swal.fire({
          icon: "success",
          title: "تم استخراج البيانات بنجاح!",
          text: `تم التعرف على عنوان الكتاب: "${ext.title || "غير محدد"}". يمكنك تحديد التصنيف والسعر والحفظ الآن.`,
          confirmButtonColor: "#d4af37",
        });
      } else {
        Swal.fire("خطأ", "فشل استخراج البيانات من ملف الـ PDF", "error");
      }
    } catch (err: any) {
      Swal.close();
      Swal.fire("خطأ", "حدث خطأ أثناء معالجة ملف الـ PDF", "error");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

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
    setSelectAllMatching(false);
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

  // Handle Multiple Images upload, 5MB limit validation, and automatic canvas compression
  const handleMultipleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "حجم الصورة كبير جداً",
          text: `الصورة ${file.name} تتجاوز 5 ميجابايت`,
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
        continue;
      }
      try {
        const result = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, targetSizeKB: 160 });
        const compressedB64 = result.compressedImage;
        const newItem: ModalImageItem = {
          id: Math.random().toString(36).substring(2, 9),
          url: compressedB64,
          base64: compressedB64,
        };
        setModalImages((prev) => [...prev, newItem]);
      } catch (err) {
        console.error("Image compression error:", err);
      }
    }
    if (e.target) e.target.value = "";
  };

  // Set selected image as Primary Cover (move to index 0)
  const handleSetAsPrimaryCover = (indexToPrimary: number) => {
    if (indexToPrimary <= 0 || indexToPrimary >= modalImages.length) return;
    setModalImages((prev) => {
      const target = prev[indexToPrimary];
      const rest = prev.filter((_, idx) => idx !== indexToPrimary);
      return [target, ...rest];
    });
    setActivePreviewIndex(0);
  };

  const handleRemoveSingleImage = (indexToRemove: number) => {
    setModalImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setActivePreviewIndex((prev) => Math.max(0, Math.min(prev, modalImages.length - 2)));
  };

  // Open modal for Create Book
  const openCreateModal = () => {
    setEditingBookId(null);
    setModalImages([]);
    setActivePreviewIndex(0);
    setErrors({});
    setFormData({
      title: "",
      shortDescription: "",
      description: "",
      author: "",
      editorOrTranslator: "",
      publisher: "",
      categoryId: categories[0]?._id || "",
      priceEgp: "",
      priceLyd: "",
      priceUsd: "",
      priceWholesale: "",
      profitMargin: "",
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
  const openEditModal = async (book: Book) => {
    setEditingBookId(book._id);
    setErrors({});

    const rawImages = Array.isArray(book.images) && book.images.length > 0
      ? book.images
      : (book.coverImage?.secureUrl ? [book.coverImage] : []);

    const initialFormattedImages: ModalImageItem[] = rawImages.map((img: any, idx: number) => ({
      id: img.publicId || `existing-${idx}`,
      url: img.secureUrl || "",
      secureUrl: img.secureUrl,
      publicId: img.publicId,
    }));

    setModalImages(initialFormattedImages);
    setActivePreviewIndex(0);

    const catId = typeof book.categoryId === "object" && book.categoryId?._id
      ? String(book.categoryId._id)
      : (typeof book.categoryId === "string" ? book.categoryId : categories[0]?._id || "");

    const initialFormData = {
      title: book.title || "",
      shortDescription: book.shortDescription || "",
      description: book.description || "",
      author: book.author || "",
      editorOrTranslator: book.editorOrTranslator || "",
      publisher: book.publisher || "",
      categoryId: catId,
      priceEgp: book.prices?.egp !== undefined && book.prices?.egp !== null ? book.prices.egp.toString() : "",
      priceLyd: book.prices?.lyd !== undefined && book.prices?.lyd !== null ? book.prices.lyd.toString() : "",
      priceUsd: book.prices?.usd !== undefined && book.prices?.usd !== null ? book.prices.usd.toString() : "",
      priceWholesale: book.prices?.wholesale !== undefined && book.prices?.wholesale !== null ? book.prices.wholesale.toString() : "",
      profitMargin: book.prices?.profitMargin !== undefined && book.prices?.profitMargin !== null ? book.prices.profitMargin.toString() : "",
      isbn: book.isbn || "",
      edition: book.edition || "",
      publicationYear: book.publicationYear !== undefined && book.publicationYear !== null ? book.publicationYear.toString() : "",
      pagesCount: book.pagesCount !== undefined && book.pagesCount !== null ? book.pagesCount.toString() : "",
      volumesCount: book.volumesCount !== undefined && book.volumesCount !== null ? book.volumesCount.toString() : "1",
      coverType: book.coverType || "",
      size: book.size || "",
      language: book.language || "العربية",
      availabilityStatus: book.availabilityStatus || "available",
      isFeatured: !!book.isFeatured,
      internalNotes: book.internalNotes || "",
    };

    setFormData(initialFormData);
    setModalOpen(true);

    // Fetch fresh and full details from server
    try {
      const res = await fetch(`/api/admin/books/${book._id}`);
      const resData = await res.json();
      if (resData.success && resData.data) {
        const fullBook = resData.data;
        const fullCatId = typeof fullBook.categoryId === "object" && fullBook.categoryId?._id
          ? String(fullBook.categoryId._id)
          : (typeof fullBook.categoryId === "string" ? fullBook.categoryId : catId);

        const freshRawImages = Array.isArray(fullBook.images) && fullBook.images.length > 0
          ? fullBook.images
          : (fullBook.coverImage?.secureUrl ? [fullBook.coverImage] : []);

        const freshFormattedImages: ModalImageItem[] = freshRawImages.map((img: any, idx: number) => ({
          id: img.publicId || `existing-${idx}`,
          url: img.secureUrl || "",
          secureUrl: img.secureUrl,
          publicId: img.publicId,
        }));
        setModalImages(freshFormattedImages);

        setFormData({
          title: fullBook.title || "",
          shortDescription: fullBook.shortDescription || "",
          description: fullBook.description || "",
          author: fullBook.author || "",
          editorOrTranslator: fullBook.editorOrTranslator || "",
          publisher: fullBook.publisher || "",
          categoryId: fullCatId,
          priceEgp: fullBook.prices?.egp !== undefined && fullBook.prices?.egp !== null ? fullBook.prices.egp.toString() : "",
          priceLyd: fullBook.prices?.lyd !== undefined && fullBook.prices?.lyd !== null ? fullBook.prices.lyd.toString() : "",
          priceUsd: fullBook.prices?.usd !== undefined && fullBook.prices?.usd !== null ? fullBook.prices.usd.toString() : "",
          priceWholesale: fullBook.prices?.wholesale !== undefined && fullBook.prices?.wholesale !== null ? fullBook.prices.wholesale.toString() : "",
          profitMargin: fullBook.prices?.profitMargin !== undefined && fullBook.prices?.profitMargin !== null ? fullBook.prices.profitMargin.toString() : "",
          isbn: fullBook.isbn || "",
          edition: fullBook.edition || "",
          publicationYear: fullBook.publicationYear !== undefined && fullBook.publicationYear !== null ? fullBook.publicationYear.toString() : "",
          pagesCount: fullBook.pagesCount !== undefined && fullBook.pagesCount !== null ? fullBook.pagesCount.toString() : "",
          volumesCount: fullBook.volumesCount !== undefined && fullBook.volumesCount !== null ? fullBook.volumesCount.toString() : "1",
          coverType: fullBook.coverType || "",
          size: fullBook.size || "",
          language: fullBook.language || "العربية",
          availabilityStatus: fullBook.availabilityStatus || "available",
          isFeatured: !!fullBook.isFeatured,
          internalNotes: fullBook.internalNotes || "",
        });
      }
    } catch (err) {
      console.error("Error fetching fresh book details:", err);
    }
  };

  // Duplicate book function
  const handleDuplicate = (book: Book) => {
    setEditingBookId(null);
    const rawImages = Array.isArray(book.images) && book.images.length > 0
      ? book.images
      : (book.coverImage?.secureUrl ? [book.coverImage] : []);
    const dupImages: ModalImageItem[] = rawImages.map((img: any, idx: number) => ({
      id: `dup-${idx}`,
      url: img.secureUrl || "",
      secureUrl: img.secureUrl,
      publicId: img.publicId,
    }));
    setModalImages(dupImages);
    setActivePreviewIndex(0);
    setErrors({});
    const catId = typeof book.categoryId === "object" && book.categoryId?._id
      ? String(book.categoryId._id)
      : (typeof book.categoryId === "string" ? book.categoryId : categories[0]?._id || "");
    setFormData({
      title: `${book.title} (نسخة مكررة)`,
      shortDescription: book.shortDescription || "",
      description: book.description || "",
      author: book.author || "",
      editorOrTranslator: book.editorOrTranslator || "",
      publisher: book.publisher || "",
      categoryId: catId,
      priceEgp: book.prices?.egp?.toString() || "",
      priceLyd: book.prices?.lyd?.toString() || "",
      priceUsd: book.prices?.usd?.toString() || "",
      priceWholesale: book.prices?.wholesale?.toString() || "",
      profitMargin: book.prices?.profitMargin?.toString() || "",
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
        egp: formData.priceEgp !== "" && formData.priceEgp !== null && !isNaN(parseFloat(formData.priceEgp)) ? parseFloat(formData.priceEgp) : undefined,
        lyd: formData.priceLyd !== "" && formData.priceLyd !== null && !isNaN(parseFloat(formData.priceLyd)) ? parseFloat(formData.priceLyd) : undefined,
        usd: formData.priceUsd !== "" && formData.priceUsd !== null && !isNaN(parseFloat(formData.priceUsd)) ? parseFloat(formData.priceUsd) : undefined,
        wholesale: formData.priceWholesale !== "" && formData.priceWholesale !== null && !isNaN(parseFloat(formData.priceWholesale)) ? parseFloat(formData.priceWholesale) : undefined,
        profitMargin: formData.profitMargin !== "" && formData.profitMargin !== null && !isNaN(parseFloat(formData.profitMargin)) ? parseFloat(formData.profitMargin) : undefined,
      },
      images: modalImages.map((img) => {
        if (img.secureUrl && img.publicId) {
          return {
            secureUrl: img.secureUrl,
            publicId: img.publicId,
          };
        }
        return {
          base64: img.base64,
        };
      }),
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

    const count = selectAllMatching ? pagination.totalResults : selectedIds.length;
    let confirmTitle = "إجراء جماعي";
    let confirmText = selectAllMatching
      ? `هل أنت متأكد من تطبيق هذا الإجراء على كافة الكتب في قاعدة البيانات بالكامل (${count} كتاب)؟`
      : `هل أنت متأكد من تطبيق هذا الإجراء على ${count} كتب؟`;

    if (action === "delete") {
      confirmTitle = "حذف جماعي";
      confirmText = selectAllMatching
        ? `هل أنت متأكد من نقل كافة الكتب في قاعدة البيانات بالكامل (${count} كتاب) إلى سلة المحذوفات؟`
        : `هل أنت متأكد من نقل ${count} كتب إلى سلة المحذوفات؟`;
    } else if (action === "permanentDelete") {
      confirmTitle = "حذف نهائي جماعي";
      confirmText = selectAllMatching
        ? `هل أنت متأكد من حذف كافة الكتب بالكامل (${count} كتاب) نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`
        : `هل أنت متأكد من حذف ${count} كتب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`;
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
      // Animated Loading Modal for Bulk Actions
      Swal.fire({
        title: "جاري تنفيذ الإجراء الجماعي...",
        html: `
          <div style="direction: rtl; padding: 8px 0; font-family: inherit;">
            <p style="font-size: 13px; font-weight: bold; color: #475569; margin-bottom: 12px;">
              جاري معالجة وتحديث <span style="color: #d4af37; font-weight: 900;">(${count})</span> كتاب في قاعدة البيانات...
            </p>
            <div style="width: 100%; background-color: #e2e8f0; height: 10px; border-radius: 9999px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);">
              <div style="width: 100%; background: linear-gradient(90deg, #d4af37, #f59e0b, #ef4444); height: 100%; border-radius: 9999px;"></div>
            </div>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 10px;">يرجى عدم إغلاق الصفحة لحين اكتمال العملية بنجاح...</p>
          </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        const res = await fetch("/api/admin/books/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: selectedIds,
            action,
            selectAllMatching,
            filters: {
              search: search.trim(),
              categoryId: selectedCategory,
              availability,
              isFeatured,
              showDeleted,
            },
            ...extraData,
          }),
        });
        const data = await res.json();
        Swal.close();

        if (res.ok && data.success) {
          Swal.fire({
            icon: "success",
            title: "نجاح العملية",
            text: data.message,
            confirmButtonText: "موافق",
            confirmButtonColor: "#d4af37",
          });
          setSelectedIds([]);
          setSelectAllMatching(false);
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
      setSelectAllMatching(false);
    }
  };

  const handleSelectId = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setSelectAllMatching(false);
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
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer border flex-1 sm:flex-none order-2 sm:order-none ${showDeleted
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

          <input
            type="file"
            accept=".pdf"
            ref={pdfInputRef}
            onChange={handlePDFExtract}
            className="hidden"
          />

          <button
            onClick={() => pdfInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-none order-2 sm:order-none shadow-sm"
            title="استخراج دقيق لتفاصيل الكتاب وغلافه من ملف PDF"
          >
            <FaFilePdf className="text-sm" />
            استخراج من PDF
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
                    className={`w-full text-right px-2 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-all rounded-md cursor-pointer ${!selectedCategory ? "text-primary font-bold bg-primary/5" : "text-foreground/80"
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
                        className={`w-full text-right px-2 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-all rounded-md cursor-pointer ${selectedCategory === cat._id ? "text-primary font-bold bg-primary/5" : "text-foreground/80"
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
          <div className="flex items-center gap-2 flex-wrap">
            {selectAllMatching ? (
              <span className="font-bold text-primary flex items-center gap-1.5">
                <FaCheck className="text-emerald-500 text-sm" />
                تم تحديد كافة الكتب المطابقة في قاعدة البيانات بالكامل ({pagination.totalResults} كتاب)
              </span>
            ) : (
              <span className="font-bold text-primary">
                تم تحديد ({selectedIds.length}) كتب في هذه الصفحة:
              </span>
            )}

            {pagination.totalResults > books.length && (
              <button
                type="button"
                onClick={() => setSelectAllMatching(!selectAllMatching)}
                className="text-[11px] font-black underline hover:no-underline text-primary cursor-pointer px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 transition-all shadow-sm"
              >
                {selectAllMatching
                  ? "تحديد الصفحة الحالية فقط"
                  : `تحديد جميع الكتب في قاعدة البيانات بالكامل (${pagination.totalResults} كتاب) ⚡`}
              </button>
            )}
          </div>

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
                  <th className="p-3.5 font-bold whitespace-nowrap">السعر</th>
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
                      <span
                        className="truncate block"
                        title={typeof book.categoryId === "object" && book.categoryId?.name ? book.categoryId.name : "عام"}
                      >
                        {typeof book.categoryId === "object" && book.categoryId?.name ? book.categoryId.name : "عام"}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-primary">
                      <div className="flex flex-col text-xs">
                        {book.prices?.egp !== undefined && <span>{book.prices.egp} ج.م</span>}
                        {book.prices?.lyd !== undefined && <span className="text-[10px] text-foreground/60">{book.prices.lyd} د.ل</span>}
                        {book.prices?.usd !== undefined && <span className="text-[10px] text-emerald-600 font-semibold">${book.prices.usd}</span>}
                        {book.prices?.egp === undefined && book.prices?.lyd === undefined && book.prices?.usd === undefined && "—"}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${book.availabilityStatus === "available"
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
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Book Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-6 overflow-hidden">
          <div
            className="relative w-full max-w-[1240px] w-[96vw] max-h-[90vh] md:max-h-[92vh] bg-card-bg border border-primary/20 rounded-2xl shadow-2xl flex flex-col text-right transition-colors duration-300 overflow-y-auto md:overflow-hidden gold-glow font-sans my-auto"
            role="dialog"
            aria-modal="true"
          >
            {/* Close modal button - Positioned top-left in RTL to prevent title collision */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-3 left-3 md:top-4 md:left-4 z-30 w-8 h-8 md:w-9 md:h-9 rounded-full bg-foreground/10 hover:bg-red-500 hover:text-white text-foreground flex items-center justify-center cursor-pointer border border-border-color/40 transition-all duration-200 shadow-md"
              title="إغلاق"
            >
              <FaTimes className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>

            {/* Form layout */}
            <form onSubmit={handleFormSubmit} className="w-full flex flex-col md:flex-row items-stretch overflow-y-auto md:overflow-hidden max-h-none md:max-h-[92vh]">

              {/* Left Column: Gallery & Images Management */}
              <div className="w-full md:w-1/3 p-4 sm:p-5 md:p-8 bg-foreground/[0.02] border-b md:border-b-0 md:border-l border-border-color/50 flex flex-col items-center justify-start shrink-0 md:overflow-y-auto max-h-none md:max-h-[88vh]">
                <div className="flex flex-col items-center gap-4 w-full">
                  
                  {/* Gallery Title Header */}
                  <div className="flex items-center justify-between w-full pb-3 border-b border-border-color/40">
                    <span className="text-xs md:text-sm font-black text-foreground flex items-center gap-2">
                      <FaBookOpen className="text-primary text-sm" />
                      معرض صور الكتاب
                    </span>
                    <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                      {modalImages.length} {modalImages.length === 1 ? "صورة" : "صور"}
                    </span>
                  </div>

                  {/* Main Active Image Preview Box */}
                  <div className="w-full max-w-[220px] md:max-w-[260px] aspect-[3/4] rounded-2xl border-2 border-border-color/80 shadow-xl bg-card-bg flex flex-col items-center justify-center overflow-hidden relative group transition-all duration-300 hover:border-primary/50 gold-glow">
                    {modalImages.length > 0 && modalImages[activePreviewIndex] ? (
                      <>
                        <img
                          src={modalImages[activePreviewIndex].url}
                          alt="معاينة صورة الكتاب"
                          onClick={() => setZoomImageUrl(modalImages[activePreviewIndex].url)}
                          className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
                          title="انقر لتكبير الصورة بحجم كامل"
                        />

                        {/* Search Plus Zoom Overlay Badge */}
                        <button
                          type="button"
                          onClick={() => setZoomImageUrl(modalImages[activePreviewIndex].url)}
                          className="absolute top-3 left-3 bg-black/60 hover:bg-primary text-white p-2 rounded-xl backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow cursor-pointer"
                          title="تكبير الصورة"
                        >
                          <FaSearchPlus className="w-3.5 h-3.5" />
                        </button>

                        {/* Main Cover Badge OR Set as Cover Button */}
                        {activePreviewIndex === 0 ? (
                          <span className="absolute top-3 right-3 bg-primary text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md border border-white/20">
                            ★ الغلاف الرئيسي
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetAsPrimaryCover(activePreviewIndex)}
                            className="absolute top-3 right-3 bg-black/75 hover:bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md border border-white/20 transition-all cursor-pointer backdrop-blur-sm"
                            title="تعيين كغلاف رئيسي للكتاب"
                          >
                            ★ جعلها الغلاف الرئيسي
                          </button>
                        )}

                        {/* Delete image button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleImage(activePreviewIndex)}
                          className="absolute bottom-3 left-3 bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-lg opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer active:scale-95"
                          title="حذف هذه الصورة"
                        >
                          <FaTimes className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2.5 text-foreground/30 text-center p-6 select-none">
                        <FaBookOpen className="text-5xl text-primary/30" />
                        <span className="text-xs font-bold">لا توجد صور مضافة حالياً</span>
                        <span className="text-[10px] text-foreground/40">اضغط أسفله لإضافة صور</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnails Gallery Strip */}
                  {modalImages.length > 0 && (
                    <div className="flex items-center gap-2.5 overflow-x-auto w-full py-2 px-1 justify-center hide-scrollbar">
                      {modalImages.map((img, idx) => (
                        <div
                          key={img.id}
                          onClick={() => setActivePreviewIndex(idx)}
                          className={`relative w-14 h-20 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all duration-200 group/thumb ${
                            activePreviewIndex === idx
                              ? "border-primary scale-105 shadow-lg ring-2 ring-primary/30"
                              : "border-border-color/60 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          
                          {/* Badge indicator for cover */}
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-white text-[7px] font-extrabold text-center py-0.5">
                              الغلاف
                            </span>
                          )}

                          {/* Action overlay buttons on thumbnail hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetAsPrimaryCover(idx);
                                }}
                                className="bg-primary text-white cursor-pointer w-5 h-5 rounded-full flex items-center justify-center text-[9px] shadow hover:scale-110"
                                title="تعيين كغلاف رئيسي"
                              >
                                ★
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSingleImage(idx);
                              }}
                              className="bg-red-600 text-white cursor-pointer w-5 h-5 rounded-full flex items-center justify-center text-[9px] shadow hover:scale-110"
                              title="حذف"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Multiple Files Upload Selector Button */}
                  <label className="w-full max-w-[260px] bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl font-black text-xs shadow-lg gold-glow transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-95 mt-2">
                    <FaPlus className="text-xs" />
                    <span>إضافة صور للكتاب (واحدة أو أكثر)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleMultipleImagesChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-foreground/50 text-center leading-relaxed max-w-[260px]">
                    يمكنك تحديد أي صورة وتعيينها كغلاف رئيسي للكتاب بكبسة زر ★.
                  </span>
                </div>
              </div>

              {/* Right Column: Metadata inputs */}
              <div className="w-full md:w-2/3 p-4 sm:p-6 md:p-8 flex flex-col gap-5 md:gap-6 text-right md:overflow-y-auto max-h-none md:max-h-[88vh]">
                
                {/* Modal Title Header */}
                <div className="border-b border-border-color/40 pb-3">
                  <h2 className="font-black text-xl text-foreground border-r-4 border-primary pr-3 py-0.5">
                    {editingBookId ? "تعديل تفاصيل الكتاب" : "إضافة كتاب جديد للنشر"}
                  </h2>
                  <p className="text-xs text-foreground/50 pr-3 mt-1">
                    يرجى تعبئة بيانات الكتاب والأسعار بدقة للحفاظ على جودة المحتوى المعروض.
                  </p>
                </div>

                {/* Form fields grid - Organized into 3 columns on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">

                  {/* Book Title */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
                    <label className="font-bold text-foreground/80">اسم الكتاب *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleFormChange}
                      className={`bg-foreground/[0.02] border rounded-xl p-3 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 ${
                        errors.title ? "border-red-500" : "border-border-color"
                      }`}
                      placeholder="أدخل عنوان الكتاب..."
                    />
                    {errors.title && <span className="text-[10px] text-red-500">{errors.title[0]}</span>}
                  </div>

                  {/* Author */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">المؤلف (الكاتب)</label>
                    <input
                      type="text"
                      name="author"
                      value={formData.author}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Editor or Translator */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">المحقق / المترجم</label>
                    <input
                      type="text"
                      name="editorOrTranslator"
                      value={formData.editorOrTranslator}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Publisher */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">دار النشر</label>
                    <input
                      type="text"
                      name="publisher"
                      value={formData.publisher}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Category select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">التصنيف *</label>
                    <select
                      name="categoryId"
                      required
                      value={formData.categoryId}
                      onChange={handleFormChange}
                      className="bg-card-bg border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary cursor-pointer font-semibold"
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
                    <label className="font-bold text-foreground/80">رقم ISBN</label>
                    <input
                      type="text"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Edition */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">الطبعة (مثال: الأولى، الثانية)</label>
                    <input
                      type="text"
                      name="edition"
                      value={formData.edition}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Price EGP */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">السعر بالجنيه المصري</label>
                    <input
                      type="number"
                      name="priceEgp"
                      min="0"
                      step="0.01"
                      value={formData.priceEgp}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary font-bold text-primary"
                    />
                  </div>

                  {/* Price LYD */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">السعر بالدينار الليبي</label>
                    <input
                      type="number"
                      name="priceLyd"
                      min="0"
                      step="0.01"
                      value={formData.priceLyd}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary font-bold text-primary"
                    />
                  </div>

                  {/* Price USD */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">السعر بالدولار ($)</label>
                    <input
                      type="number"
                      name="priceUsd"
                      min="0"
                      step="0.01"
                      value={formData.priceUsd}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary font-bold text-emerald-600"
                    />
                  </div>

                  {/* Wholesale Price */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">سعر الجملة</label>
                    <input
                      type="number"
                      name="priceWholesale"
                      min="0"
                      step="0.01"
                      value={formData.priceWholesale}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  {/* Profit Margin */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">هامش الربح (%)</label>
                    <input
                      type="number"
                      name="profitMargin"
                      min="0"
                      step="0.01"
                      value={formData.profitMargin}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary font-bold"
                    />
                  </div>

                  {/* Availability status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">حالة التوفر</label>
                    <select
                      name="availabilityStatus"
                      value={formData.availabilityStatus}
                      onChange={handleFormChange}
                      className="bg-card-bg border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary cursor-pointer font-bold"
                    >
                      <option value="available">متوفر للطلب</option>
                      <option value="unavailable">نفد</option>
                    </select>
                  </div>

                  {/* Volumes count */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">عدد المجلدات</label>
                    <input
                      type="number"
                      name="volumesCount"
                      min="1"
                      value={formData.volumesCount}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Pages count */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">عدد الصفحات</label>
                    <input
                      type="number"
                      name="pagesCount"
                      min="0"
                      value={formData.pagesCount}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Publication Year */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">سنة النشر</label>
                    <input
                      type="number"
                      name="publicationYear"
                      value={formData.publicationYear}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Cover Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">نوع التجليد (سلوفان، فني...)</label>
                    <input
                      type="text"
                      name="coverType"
                      value={formData.coverType}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Book Size */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">مقاس الكتاب (مثال: 24*17)</label>
                    <input
                      type="text"
                      name="size"
                      value={formData.size}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Language */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-foreground/80">اللغة</label>
                    <input
                      type="text"
                      name="language"
                      value={formData.language}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Short Description */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
                    <label className="font-bold text-foreground/80">نبذة مختصرة عن الكتاب</label>
                    <input
                      type="text"
                      name="shortDescription"
                      value={formData.shortDescription}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                      placeholder="نبذة سريعة تظهر في بطاقة الكتاب..."
                    />
                  </div>

                  {/* Book Description / details */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
                    <label className="font-bold text-foreground/80">وصف الكتاب الكامل</label>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Internal Notes */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
                    <label className="font-bold text-foreground/80">ملاحظات داخلية (لا تظهر للزوار)</label>
                    <textarea
                      name="internalNotes"
                      rows={2}
                      value={formData.internalNotes}
                      onChange={handleFormChange}
                      className="bg-foreground/[0.02] border border-border-color rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Featured checkbox */}
                  <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3 pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground select-none">
                      <input
                        type="checkbox"
                        name="isFeatured"
                        checked={formData.isFeatured}
                        onChange={handleFormChange}
                        className="w-4.5 h-4.5 rounded border-border-color text-primary focus:ring-primary accent-primary"
                      />
                      <span>تمييز هذا الكتاب (عرضه في قسم المميز بالرئيسية)</span>
                    </label>
                  </div>

                  {/* Validation errors summary */}
                  {errors.prices && (
                    <span className="text-[10px] text-red-500 font-semibold sm:col-span-2 lg:col-span-3">
                      {errors.prices[0]}
                    </span>
                  )}

                </div>

                {/* Footer Save actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-border-color/50 mt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="border border-border-color hover:bg-foreground/5 text-foreground px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm cursor-pointer transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-black px-8 py-2.5 rounded-xl text-xs md:text-sm shadow-md gold-glow cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    {submitting ? "جاري الحفظ..." : "حفظ الكتاب"}
                  </button>
                </div>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* Fullscreen Image Zoom Lightbox */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImageUrl(null)}
            className="absolute top-5 left-5 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer border border-white/20 transition-all shadow-xl"
            title="إغلاق التكبير"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          <img
            src={zoomImageUrl}
            alt="صورة مكبرة"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/10 gold-glow select-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}
export type BookType = Book;
