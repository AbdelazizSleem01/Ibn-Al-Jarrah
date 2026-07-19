"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BookCard from "./BookCard";
import BookModal from "./BookModal";
import { FaThLarge, FaList, FaFilter, FaTimes, FaUndo, FaSearch, FaChevronDown, FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface BooksBrowserProps {
  initialBooks: any[];
  categories: Category[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}

export default function BooksBrowser({ initialBooks, categories, pagination }: BooksBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewType, setViewType] = useState<"cards" | "table">("cards");
  const [searchVal, setSearchVal] = useState(searchParams.get("search") || "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(searchParams.get("book") || null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close custom category select dropdown
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const currentCategorySlug = searchParams.get("category");
  const currentCategory = categories.find((cat) => cat.slug === currentCategorySlug);
  const selectedCategoryName = currentCategory ? currentCategory.name : "كل التصنيفات";

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  // Helper to update URL search params
  const updateQuery = (newParams: Record<string, string | number | undefined | null>) => {
    const params = new URLSearchParams(window.location.search);

    // Reset page on filter changes unless explicitly specified
    if (!newParams.page && newParams.page !== null) {
      params.set("page", "1");
    }

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
    });

    router.push(`?${params.toString()}`, { scroll: true });
  };

  // Load view type from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("books_view_type");
    if (savedView === "table" || savedView === "cards") {
      setViewType(savedView);
    }
  }, []);

  // Update active book slug from URL parameters
  useEffect(() => {
    setActiveSlug(searchParams.get("book"));
  }, [searchParams]);

  // Debounced search input handler
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const currentSearch = searchParams.get("search") || "";
      if (searchVal !== currentSearch) {
        updateQuery({ search: searchVal || undefined, page: "1" });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchVal]);

  const setAndSaveView = (type: "cards" | "table") => {
    setViewType(type);
    localStorage.setItem("books_view_type", type);
  };

  const handleClearFilters = () => {
    setSearchVal("");
    router.push(window.location.pathname);
  };

  const handlePageChange = (newPage: number) => {
    updateQuery({ page: newPage });
  };

  const handleDetailsClick = (slug: string) => {
    updateQuery({ book: slug });
  };

  const handleCloseModal = () => {
    updateQuery({ book: undefined });
  };

  // Identify active filters to display as removable chips
  const getActiveChips = () => {
    const chips: { key: string; label: string }[] = [];

    const cat = searchParams.get("category");
    if (cat) {
      const categoryObj = categories.find((c) => c.slug === cat);
      chips.push({ key: "category", label: `التصنيف: ${categoryObj ? categoryObj.name : cat}` });
    }

    const avail = searchParams.get("availability");
    if (avail) {
      chips.push({ key: "availability", label: avail === "available" ? "حالة التوفر: متوفر" : "حالة التوفر: غير متوفر" });
    }

    const feat = searchParams.get("isFeatured");
    if (feat === "true") {
      chips.push({ key: "isFeatured", label: "كتب مميزة فقط" });
    }

    const img = searchParams.get("hasImage");
    if (img === "true") {
      chips.push({ key: "hasImage", label: "يحتوي على صورة غلاف" });
    }

    const author = searchParams.get("author");
    if (author) {
      chips.push({ key: "author", label: `المؤلف: ${author}` });
    }

    const pub = searchParams.get("publisher");
    if (pub) {
      chips.push({ key: "publisher", label: `الناشر: ${pub}` });
    }

    return chips;
  };

  const activeChips = getActiveChips();

  return (
    <div className=" mx-auto px-4 py-8 text-right min-h-screen transition-colors duration-300">

      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <span className="text-xs text-primary font-bold">المكتبة الرقمية</span>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">تصفح جميع الكتب</h1>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Toggle Filters Button */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs md:text-sm shadow-sm transition-all cursor-pointer border ${isFilterOpen
                ? "bg-primary text-white border-primary gold-glow"
                : "bg-card-bg text-foreground border-border-color hover:bg-foreground/5"
              }`}
          >
            <FaFilter className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span>{isFilterOpen ? "إخفاء الفلاتر" : "تصفية وبحث الكتب"}</span>
          </button>

          <div className="flex border border-border-color rounded-lg overflow-hidden bg-card-bg">
            <button
              onClick={() => setAndSaveView("cards")}
              className={`p-2.5 cursor-pointer transition-colors ${viewType === "cards" ? "bg-primary text-white" : "text-foreground hover:bg-foreground/5"
                }`}
              title="عرض كبطاقات"
            >
              <FaThLarge className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAndSaveView("table")}
              className={`p-2.5 cursor-pointer transition-colors ${viewType === "table" ? "bg-primary text-white" : "text-foreground hover:bg-foreground/5"
                }`}
              title="عرض جدول"
            >
              <FaList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Collapsible Filter Box */}
      {isFilterOpen && (
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 mb-8 shadow-sm flex flex-col gap-5 transition-all duration-300 animate-fade-in">

          {/* Title */}
          <div className="flex items-center justify-between border-b border-border-color pb-3">
            <h2 className="font-black text-sm md:text-base text-foreground flex items-center gap-2">
              <FaFilter className="text-primary text-xs" />
              <span>تصفية النتائج والبحث</span>
            </h2>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {/* 1. Search (Larger) */}
            <div className="flex flex-col gap-1.5 text-right md:col-span-2">
              <label className="text-xs font-bold text-foreground/80">بحث عام</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث باسم الكتاب، الكاتب، الناشر..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full bg-foreground/[0.02] border border-border-color rounded-lg py-2 pl-3 pr-8 text-xs focus:border-primary/50 focus:outline-none"
                />
                <FaSearch className="absolute top-1/2 right-2.5 -translate-y-1/2 text-foreground/45 text-xs" />
              </div>
            </div>

            {/* 2. Category (Searchable Custom Dropdown) */}
            <div className="flex flex-col gap-1.5 text-right md:col-span-1" ref={categoryDropdownRef}>
              <label className="text-xs font-bold text-foreground/80">التصنيف</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full bg-card-bg border border-border-color rounded-lg py-2.5 pl-8 pr-3 text-xs focus:border-primary/50 focus:outline-none cursor-pointer flex items-center justify-between text-right transition-colors"
                >
                  <span className="truncate">{selectedCategoryName}</span>
                  <FaChevronDown className={`text-foreground/40 text-[9px] transition-transform duration-200 ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute right-0 left-0 mt-1.5 z-30 bg-card-bg border border-border-color rounded-xl shadow-xl p-2.5 flex flex-col gap-2 max-h-60 overflow-y-auto animate-fade-in text-right">
                    {/* Search Input inside Dropdown */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="ابحث عن تصنيف..."
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        className="w-full bg-foreground/[0.02] border border-border-color rounded-lg py-1.5 pl-3 pr-7 text-xs focus:border-primary/50 focus:outline-none"
                        onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing on input click
                      />
                      <FaSearch className="absolute top-1/2 right-2.5 -translate-y-1/2 text-foreground/45 text-[10px]" />
                    </div>

                    {/* Options list */}
                    <div className="flex flex-col max-h-40 overflow-y-auto divide-y divide-border-color/10 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          updateQuery({ category: undefined });
                          setIsCategoryDropdownOpen(false);
                          setCategorySearchQuery("");
                        }}
                        className={`w-full text-right px-2 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-all rounded-md cursor-pointer ${!currentCategorySlug ? "text-primary font-bold bg-primary/5" : "text-foreground/80"
                          }`}
                      >
                        كل التصنيفات
                      </button>
                      {filteredCategories.map((cat) => (
                        <button
                          key={cat._id}
                          type="button"
                          onClick={() => {
                            updateQuery({ category: cat.slug });
                            setIsCategoryDropdownOpen(false);
                            setCategorySearchQuery("");
                          }}
                          className={`w-full text-right px-2 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-all rounded-md cursor-pointer ${currentCategorySlug === cat.slug ? "text-primary font-bold bg-primary/5" : "text-foreground/80"
                            }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                      {filteredCategories.length === 0 && (
                        <div className="text-center text-[10px] text-foreground/40 py-3">
                          لا توجد تصنيفات مطابقة
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Availability (Smaller, Custom styling) */}
            <div className="flex flex-col gap-1.5 text-right md:col-span-1">
              <label className="text-xs font-bold text-foreground/80">حالة التوفر</label>
              <div className="relative">
                <select
                  value={searchParams.get("availability") || ""}
                  onChange={(e) => updateQuery({ availability: e.target.value || undefined })}
                  className="w-full appearance-none bg-card-bg border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:border-primary/50 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-card-bg text-foreground">الكل</option>
                  <option value="available" className="bg-card-bg text-foreground">متوفر للطلب</option>
                  <option value="unavailable" className="bg-card-bg text-foreground">غير متوفر</option>
                </select>
                <FaChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none text-[9px]" />
              </div>
            </div>

            {/* 4. Sort (Smaller, Custom styling) */}
            <div className="flex flex-col gap-1.5 text-right md:col-span-1">
              <label className="text-xs font-bold text-foreground/80">ترتيب حسب</label>
              <div className="relative">
                <select
                  value={searchParams.get("sort") || "newest"}
                  onChange={(e) => updateQuery({ sort: e.target.value || undefined })}
                  className="w-full appearance-none bg-card-bg border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:border-primary/50 focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-card-bg text-foreground">الأحدث أولاً</option>
                  <option value="oldest" className="bg-card-bg text-foreground">الأقدم أولاً</option>
                  <option value="alphabetical-asc" className="bg-card-bg text-foreground">الاسم (أ - ي)</option>
                  <option value="alphabetical-desc" className="bg-card-bg text-foreground">الاسم (ي - أ)</option>
                  <option value="price-asc" className="bg-card-bg text-foreground">السعر (الأقل للأعلى)</option>
                  <option value="price-desc" className="bg-card-bg text-foreground">السعر (الأعلى للأقل)</option>
                </select>
                <FaChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none text-[9px]" />
              </div>
            </div>
          </div>

          {/* Bottom Options and Reset */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t border-border-color/50">
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground/95 select-none">
                <input
                  type="checkbox"
                  checked={searchParams.get("isFeatured") === "true"}
                  onChange={(e) => updateQuery({ isFeatured: e.target.checked ? "true" : undefined })}
                  className="w-4 h-4 rounded border-border-color text-primary focus:ring-primary accent-primary"
                />
                <span>كتب مميزة فقط</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground/95 select-none">
                <input
                  type="checkbox"
                  checked={searchParams.get("hasImage") === "true"}
                  onChange={(e) => updateQuery({ hasImage: e.target.checked ? "true" : undefined })}
                  className="w-4 h-4 rounded border-border-color text-primary focus:ring-primary accent-primary"
                />
                <span>يحتوي على صورة غلاف</span>
              </label>
            </div>

            <button
              onClick={handleClearFilters}
              className="flex items-center justify-center gap-1.5 border border-border-color hover:bg-foreground/5 text-foreground px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
            >
              <FaUndo className="w-3 h-3" />
              <span>إعادة تعيين الكل</span>
            </button>
          </div>

        </div>
      )}

      {/* Books Content Panel (Full Width) */}
      <div className="w-full flex flex-col gap-6">

        {/* Active Chips Bar */}
        {(activeChips.length > 0 || searchVal) && (
          <div className="flex flex-wrap items-center gap-2 bg-foreground/[0.01] p-3 rounded-lg border border-border-color/40 text-xs">
            <span className="text-foreground/50 font-bold">الفلاتر النشطة:</span>

            {searchVal && (
              <span className="flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-bold">
                <span>بحث: {searchVal}</span>
                <button onClick={() => setSearchVal("")} className="hover:text-red-500 font-normal">&times;</button>
              </span>
            )}

            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-bold"
              >
                <span>{chip.label}</span>
                <button
                  onClick={() => updateQuery({ [chip.key]: undefined })}
                  className="hover:text-red-500 font-normal"
                >
                  &times;
                </button>
              </span>
            ))}

            <button
              onClick={handleClearFilters}
              className="text-primary font-bold hover:underline pr-2"
            >
              مسح الكل
            </button>
          </div>
        )}

        {/* Results Info */}
        <div className="flex items-center justify-between text-xs text-foreground/60">
          <span>
            العثور على <span className="font-extrabold text-foreground">{pagination.totalResults}</span> كتاب
          </span>
        </div>

        {/* Results  */}
        {initialBooks.length === 0 ? (
          <div className="bg-card-bg border border-border-color rounded-2xl p-16 text-center shadow-sm">
            <p className="text-foreground/50 text-sm font-bold mb-4">لا توجد نتائج تطابق خيارات البحث الحالية.</p>
            <button
              onClick={handleClearFilters}
              className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              عرض كل الكتب
            </button>
          </div>
        ) : viewType === "cards" ? (
          // Cards Grid View (4 columns on large desktop)
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {initialBooks.map((book) => (
              <BookCard
                key={book._id}
                book={book}
                onDetailsClick={handleDetailsClick}
              />
            ))}
          </div>
        ) : (
          // Responsive Table View
          <div className="w-full overflow-x-auto rounded-xl border border-border-color bg-card-bg">
            <table className="w-full text-right border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-foreground/[0.02] border-b border-border-color text-foreground/70">
                  <th className="p-3.5 font-bold">اسم الكتاب</th>
                  <th className="p-3.5 font-bold">المؤلف</th>
                  <th className="p-3.5 font-bold">التصنيف</th>
                  <th className="p-3.5 font-bold">السعر (جنيه)</th>
                  <th className="p-3.5 font-bold text-center">الحالة</th>
                  <th className="p-3.5 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/55">
                {initialBooks.map((book) => (
                  <tr key={book._id} className="hover:bg-foreground/[0.01] transition-colors">
                    <td className="p-3.5 font-bold text-foreground max-w-[240px]">
                      <div className="flex items-center gap-3">
                        <img
                          src={book.coverImage?.secureUrl || "/images/hero-book.webp"}
                          alt=""
                          className="w-8 h-10 object-cover rounded shadow-sm border border-border-color shrink-0"
                        />
                        <span className="truncate block" title={book.title}>{book.title}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-foreground/80 max-w-[180px]">
                      <span className="truncate block" title={book.author || "غير محدد"}>
                        {book.author || "غير محدد"}
                      </span>
                    </td>
                    <td className="p-3.5 text-foreground/70 max-w-[150px]">
                      <span className="truncate block" title={book.categoryId?.name || "عام"}>
                        {book.categoryId?.name || "عام"}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-primary">
                      {book.prices?.egp !== undefined ? `${book.prices.egp} ج.م` : "—"}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${book.availabilityStatus === "available"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                          }`}
                      >
                        {book.availabilityStatus === "available" ? "متوفر" : "نفد"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDetailsClick(book.slug)}
                        className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer"
                      >
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="bg-card-bg hover:bg-foreground/5 border border-border-color text-foreground disabled:opacity-40 disabled:hover:bg-card-bg px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1.5"
            >
              <FaChevronRight className="w-2.5 h-2.5 shrink-0" />
              <span>السابق</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-foreground/70 font-semibold px-2">
              <span>صفحة</span>
              <div className="relative">
                <select
                  value={pagination.page}
                  onChange={(e) => handlePageChange(Number(e.target.value))}
                  className="appearance-none bg-card-bg border border-border-color rounded-lg py-1 pl-6 pr-2.5 font-bold text-foreground focus:border-primary/50 focus:outline-none cursor-pointer text-xs"
                >
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p} className="bg-card-bg text-foreground">
                      {p}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none text-[8px]" />
              </div>
              <span>من <span className="text-foreground font-bold">{pagination.totalPages}</span></span>
            </div>

            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="bg-card-bg hover:bg-foreground/5 border border-border-color text-foreground disabled:opacity-40 disabled:hover:bg-card-bg px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1.5"
            >
              <span>التالي</span>
              <FaChevronLeft className="w-2.5 h-2.5 shrink-0" />
            </button>
          </div>
        )}

      </div>

      {/* Book details Modal */}
      {activeSlug && (
        <BookModal
          bookSlug={activeSlug}
          onClose={handleCloseModal}
        />
      )}

    </div>
  );
}
