"use client";

import React, { useEffect, useRef } from "react";
import { FaTimes, FaShareAlt, FaBookOpen, FaUser, FaBuilding, FaGlobe, FaBookmark, FaCalendarAlt, FaFileAlt, FaLayerGroup, FaPalette, FaRulerCombined } from "react-icons/fa";
import Swal from "sweetalert2";

interface BookModalProps {
  bookSlug: string | null;
  onClose: () => void;
}

interface BookDetails {
  _id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  author?: string;
  editorOrTranslator?: string;
  publisher?: string;
  prices?: {
    egp?: number;
    lyd?: number;
  };
  coverImage?: {
    secureUrl?: string;
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
  categoryId?: {
    name: string;
  };
}

export default function BookModal({ bookSlug, onClose }: BookModalProps) {
  const [book, setBook] = React.useState<BookDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch book details when slug changes
  useEffect(() => {
    if (!bookSlug) return;

    setLoading(true);
    fetch(`/api/books/${bookSlug}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setBook(resData.data);
        } else {
          setBook(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setBook(null);
        setLoading(false);
      });
  }, [bookSlug]);

  // Handle Close on Click Outside or Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }

      // Focus Trap implementation
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex="0"]'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          // Shift + Tab (Backward)
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          // Tab (Forward)
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden"; // Prevent background scrolling

    // Focus close button on mount
    if (closeButtonRef.current) {
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = ""; // Restore scrolling
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleShare = () => {
    if (!book) return;
    const shareUrl = `${window.location.origin}/books?book=${book.slug}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        Swal.fire({
          icon: "success",
          title: "تم نسخ الرابط",
          text: "رابط هذا الكتاب جاهز للمشاركة الآن!",
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
          timer: 2000,
        });
      });
    }
  };

  if (!bookSlug) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl bg-card-bg rounded-2xl border border-border-color shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[92vh] transition-colors duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-foreground/10 hover:bg-red-500 hover:text-white text-foreground flex items-center justify-center cursor-pointer border border-border-color/40 transition-all duration-200 shadow-sm"
          aria-label="إغلاق التفاصيل"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>

        {loading ? (
          // Loading Skeleton
          <div className="w-full p-8 flex flex-col md:flex-row gap-8 items-center min-h-[300px]">
            <div className="w-48 aspect-[3/4] skeleton rounded-lg shrink-0" />
            <div className="flex-grow flex flex-col gap-4 w-full">
              <div className="h-6 w-3/4 skeleton rounded" />
              <div className="h-4 w-1/2 skeleton rounded" />
              <div className="h-20 w-full skeleton rounded" />
            </div>
          </div>
        ) : !book ? (
          // Error State
          <div className="w-full p-12 text-center flex flex-col items-center justify-center gap-4">
            <h3 className="font-bold text-lg text-foreground">تعذر تحميل بيانات الكتاب</h3>
            <p className="text-sm text-foreground/60">حدث خطأ ما أو أن الكتاب غير موجود.</p>
            <button
              onClick={onClose}
              className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-bold text-sm cursor-pointer"
            >
              العودة للموقع
            </button>
          </div>
        ) : (
          // Book Details View
          <>
            {/* Right Column: Book Image Mockup */}
            <div className="w-full md:w-2/5 p-6 flex flex-col items-center justify-center bg-foreground/[0.01] border-l border-border-color/50 shrink-0">
              <div className="relative w-full max-w-[240px] aspect-[3/4] rounded-xl overflow-hidden border border-border-color shadow-2xl bg-card-bg flex items-center justify-center gold-glow group transition-all duration-300 hover:scale-[1.02]">
                
                {/* Book Cover Design */}
                <img
                    src={book.coverImage?.secureUrl || "/images/hero-book.webp"}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 w-full max-w-[240px] mt-6">
                <button
                  onClick={handleShare}
                  className="flex-grow flex items-center justify-center gap-2 bg-foreground/5 hover:bg-primary hover:text-white hover:border-primary text-foreground border border-border-color py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-300 cursor-pointer active:scale-95 shadow-sm hover:shadow-md"
                >
                  <FaShareAlt className="text-xs" />
                  <span>مشاركة الرابط</span>
                </button>
              </div>
            </div>

            {/* Left Column: Metadata Details */}
            <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col gap-6 text-right overflow-y-auto">
              
              {/* Title & Category */}
              <div className="flex flex-col gap-2 pt-4 md:pt-0">
                <span className="text-xs text-primary font-black border-r-4 border-primary pr-3 py-0.5">
                  {book.categoryId?.name || "بدون تصنيف"}
                </span>
                <h2 id="modal-title" className="text-xl md:text-2xl font-black text-foreground transition-colors leading-snug">
                  {book.title}
                </h2>
              </div>

              {/* Prices & Availability */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary/5 border border-primary/10 p-4 rounded-2xl">
                <div className="flex flex-col gap-1 font-bold text-xs md:text-sm">
                  {book.prices?.egp !== undefined && (
                    <span className="text-foreground/90">
                      السعر بالجنيه: <span className="text-primary font-extrabold text-base">{book.prices.egp}</span> جنيه مصري
                    </span>
                  )}
                  {book.prices?.lyd !== undefined && (
                    <span className="text-foreground/90 mt-1">
                      السعر بالدينار: <span className="text-primary font-extrabold text-base">{book.prices.lyd}</span> دينار ليبي
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-black px-3.5 py-1.5 rounded-full self-start sm:self-auto ${
                    book.availabilityStatus === "available"
                      ? "bg-green-500/10 text-green-500 border border-green-500/20"
                      : "bg-red-500/10 text-red-500 border border-red-500/20"
                  }`}
                >
                  {book.availabilityStatus === "available" ? "متوفر للطلب" : "غير متوفر حالياً"}
                </span>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                  <FaBookOpen className="text-primary text-xs" />
                  <span>نبذة عن الكتاب:</span>
                </h3>
                <p className="text-xs md:text-sm text-foreground/80 leading-relaxed bg-foreground/[0.01] p-4 rounded-xl border border-border-color/30 max-h-[120px] overflow-y-auto font-medium">
                  {book.description || book.shortDescription || "لا يوجد وصف متوفر لهذا الكتاب حالياً."}
                </p>
              </div>

              {/* Book Metadata Badge Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border-color/50 pt-5 text-xs md:text-sm">
                
                {book.author && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaUser className="text-primary text-sm shrink-0" />
                    <span>المؤلف: <span className="font-bold text-foreground">{book.author}</span></span>
                  </div>
                )}

                {book.editorOrTranslator && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaBookmark className="text-primary text-sm shrink-0" />
                    <span>المحقق/المترجم: <span className="font-bold text-foreground">{book.editorOrTranslator}</span></span>
                  </div>
                )}

                {book.publisher && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaBuilding className="text-primary text-sm shrink-0" />
                    <span>دار النشر: <span className="font-bold text-foreground">{book.publisher}</span></span>
                  </div>
                )}

                {book.isbn && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaGlobe className="text-primary text-sm shrink-0" />
                    <span>رقم ISBN: <span className="font-bold text-foreground" dir="ltr">{book.isbn}</span></span>
                  </div>
                )}

                {book.publicationYear && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaCalendarAlt className="text-primary text-sm shrink-0" />
                    <span>سنة النشر: <span className="font-bold text-foreground">{book.publicationYear}</span></span>
                  </div>
                )}

                {book.edition && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaBookOpen className="text-primary text-sm shrink-0" />
                    <span>الطبعة: <span className="font-bold text-foreground">{book.edition}</span></span>
                  </div>
                )}

                {book.pagesCount && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaFileAlt className="text-primary text-sm shrink-0" />
                    <span>عدد الصفحات: <span className="font-bold text-foreground">{book.pagesCount}</span></span>
                  </div>
                )}

                {book.volumesCount && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaLayerGroup className="text-primary text-sm shrink-0" />
                    <span>عدد المجلدات: <span className="font-bold text-foreground">{book.volumesCount}</span></span>
                  </div>
                )}

                {book.coverType && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaPalette className="text-primary text-sm shrink-0" />
                    <span>نوع التجليد: <span className="font-bold text-foreground">{book.coverType}</span></span>
                  </div>
                )}

                {book.size && (
                  <div className="flex items-center gap-3 bg-foreground/[0.01] border border-border-color/40 rounded-xl p-3 text-foreground/80 hover:bg-foreground/[0.03] transition-all">
                    <FaRulerCombined className="text-primary text-sm shrink-0" />
                    <span>المقاس: <span className="font-bold text-foreground">{book.size}</span></span>
                  </div>
                )}

              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
