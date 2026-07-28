"use client";

import React, { useEffect, useRef } from "react";
import {
  FaTimes,
  FaShareAlt,
  FaBookOpen,
  FaUser,
  FaBuilding,
  FaGlobe,
  FaBookmark,
  FaCalendarAlt,
  FaFileAlt,
  FaLayerGroup,
  FaPalette,
  FaRulerCombined,
  FaChevronLeft,
  FaChevronRight,
  FaSearchPlus,
  FaWhatsapp,
  FaCheckCircle,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { useCurrency } from "@/context/CurrencyContext";

interface BookModalProps {
  bookSlug: string | null;
  initialBook?: any | null;
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
    usd?: number;
    wholesale?: number;
    profitMargin?: number;
  };
  coverImage?: {
    secureUrl?: string;
  };
  images?: Array<{
    secureUrl?: string;
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
  isFeatured?: boolean;
  categoryId?: {
    name: string;
  };
}

export default function BookModal({ bookSlug, initialBook, onClose }: BookModalProps) {
  const { formatBookPrice } = useCurrency();
  const [book, setBook] = React.useState<BookDetails | null>(initialBook || null);
  const [loading, setLoading] = React.useState(!initialBook);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [zoomImageUrl, setZoomImageUrl] = React.useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Synchronize initial book data immediately for 0ms instant modal display
  useEffect(() => {
    if (!bookSlug) return;

    if (initialBook && (initialBook.slug === bookSlug || initialBook._id === bookSlug)) {
      setBook(initialBook);
      setLoading(false);
    } else if (!book) {
      setLoading(true);
    }

    setActiveImageIndex(0);

    // Silent background fetch to sync full fields
    fetch(`/api/books/${encodeURIComponent(bookSlug)}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setBook(resData.data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [bookSlug, initialBook]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-6 overflow-hidden"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[1140px] w-[96vw] max-h-[90vh] md:max-h-[92vh] bg-card-bg rounded-3xl border border-primary/20 shadow-2xl flex flex-col md:flex-row overflow-y-auto md:overflow-hidden font-sans gold-glow transition-all duration-300 my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        
        {/* Close Button - Positioned top-left in RTL mode */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-foreground/10 hover:bg-red-600 hover:text-white text-foreground flex items-center justify-center cursor-pointer border border-border-color/40 transition-all duration-200 shadow-md active:scale-95"
          aria-label="إغلاق التفاصيل"
        >
          <FaTimes className="w-4 h-4" />
        </button>

        {loading ? (
          // Loading Skeleton
          <div className="w-full p-8 flex flex-col md:flex-row gap-8 items-center min-h-[400px]">
            <div className="w-64 aspect-[3/4] skeleton rounded-2xl shrink-0" />
            <div className="flex-grow flex flex-col gap-4 w-full">
              <div className="h-8 w-3/4 skeleton rounded-xl" />
              <div className="h-5 w-1/2 skeleton rounded-lg" />
              <div className="h-28 w-full skeleton rounded-2xl" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="h-10 skeleton rounded-xl" />
                <div className="h-10 skeleton rounded-xl" />
              </div>
            </div>
          </div>
        ) : !book ? (
          // Error State
          <div className="w-full p-12 text-center flex flex-col items-center justify-center gap-4">
            <h3 className="font-bold text-lg text-foreground">تعذر تحميل بيانات الكتاب</h3>
            <p className="text-sm text-foreground/60">حدث خطأ ما أو أن الكتاب غير موجود.</p>
            <button
              onClick={onClose}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-black text-xs md:text-sm cursor-pointer shadow-md"
            >
              العودة للموقع
            </button>
          </div>
        ) : (
          // Book Details View
          <>
            {/* Right Column: Book Image / Carousel Mockup */}
            {(() => {
              const galleryImages = Array.isArray(book.images) && book.images.length > 0
                ? (book.images.map((img) => img.secureUrl).filter(Boolean) as string[])
                : (book.coverImage?.secureUrl ? [book.coverImage.secureUrl] : ["/images/hero-book.webp"]);

              const whatsappMessage = encodeURIComponent(
                `السلام عليكم، أريد طلب كتاب: "${book.title}"`
              );
              const whatsappUrl = `https://wa.me/201272942243?text=${whatsappMessage}`;

              return (
                <div className="w-full md:w-5/12 p-4 sm:p-6 md:p-8 bg-gradient-to-b from-primary/5 via-foreground/[0.01] to-foreground/[0.03] border-b md:border-b-0 md:border-l border-border-color/50 flex flex-col items-center justify-start shrink-0 md:overflow-y-auto">
                  
                  {/* Gallery Title */}
                  <div className="flex items-center justify-between w-full pb-3 mb-4 border-b border-border-color/40">
                    <span className="text-xs font-black text-foreground flex items-center gap-2">
                      <FaBookOpen className="text-primary text-sm" />
                      غلاف ومعرض الكتاب
                    </span>
                    {galleryImages.length > 1 && (
                      <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                        {galleryImages.length} صور
                      </span>
                    )}
                  </div>

                  {/* Main Display Image Box */}
                  <div className="relative w-full max-w-[180px] sm:max-w-[260px] md:max-w-[340px] aspect-[3/4] rounded-2xl overflow-hidden border-2 border-border-color/80 shadow-2xl bg-card-bg flex items-center justify-center gold-glow group transition-all duration-300 hover:border-primary/50">
                    
                    <img
                      src={galleryImages[activeImageIndex] || galleryImages[0] || "/images/hero-book.webp"}
                      alt={book.title}
                      onClick={() => setZoomImageUrl(galleryImages[activeImageIndex] || galleryImages[0])}
                      className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
                      title="انقر لتكبير الصورة بحجم كامل"
                    />

                    {/* Search Zoom Overlay Badge */}
                    <button
                      type="button"
                      onClick={() => setZoomImageUrl(galleryImages[activeImageIndex] || galleryImages[0])}
                      className="absolute top-3 left-3 bg-black/60 hover:bg-primary text-white p-2 rounded-xl backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow cursor-pointer"
                      title="تكبير الصورة"
                    >
                      <FaSearchPlus className="w-3.5 h-3.5" />
                    </button>

                    {/* Carousel Controls if multiple images */}
                    {galleryImages.length > 1 && (
                      <>
                        {/* Counter Pill */}
                        <span className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full shadow-md z-10 select-none" dir="ltr">
                          {activeImageIndex + 1} / {galleryImages.length}
                        </span>

                        {/* Prev Arrow */}
                        <button
                          type="button"
                          onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-primary text-white p-2.5 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg active:scale-90"
                          title="الصورة السابقة"
                        >
                          <FaChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Next Arrow */}
                        <button
                          type="button"
                          onClick={() => setActiveImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-primary text-white p-2.5 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg active:scale-90"
                          title="الصورة التالية"
                        >
                          <FaChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                  </div>

                  {/* Thumbnails Navigation Strip */}
                  {galleryImages.length > 1 && (
                    <div className="flex items-center gap-2.5 overflow-x-auto w-full max-w-[340px] mt-4 py-2 px-1 justify-center hide-scrollbar">
                      {galleryImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative w-14 h-20 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all duration-200 ${
                            activeImageIndex === idx
                              ? "border-primary scale-105 shadow-lg ring-2 ring-primary/30"
                              : "border-border-color/60 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2.5 w-full max-w-[340px] mt-5">
                    {/* WhatsApp Order Button */}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-emerald-500/30 gold-glow cursor-pointer"
                    >
                      <FaWhatsapp className="text-lg" />
                      <span>طلب الكتاب الآن عبر الواتساب</span>
                    </a>

                    {/* Share Link Button */}
                    <button
                      type="button"
                      onClick={handleShare}
                      className="w-full flex items-center justify-center gap-2 bg-foreground/5 hover:bg-primary hover:text-white hover:border-primary text-foreground border border-border-color py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer active:scale-95 shadow-sm"
                    >
                      <FaShareAlt className="text-xs" />
                      <span>مشاركة رابط الكتاب</span>
                    </button>
                  </div>

                </div>
              );
            })()}

            {/* Left Column: Metadata Details */}
            <div className="w-full md:w-7/12 p-4 sm:p-6 md:p-8 flex flex-col gap-6 text-right shrink-0 md:shrink md:overflow-y-auto md:max-h-[88vh]">
              
              {/* Category Badge & Book Title */}
              <div className="flex flex-col gap-2.5 pt-2 md:pt-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-black">
                    <FaBookOpen className="text-[10px]" />
                    {book.categoryId?.name || "بدون تصنيف"}
                  </span>
                  {book.isFeatured && (
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-black">
                      ★ كتاب مميز
                    </span>
                  )}
                </div>

                <h2 id="modal-title" className="text-2xl md:text-3xl font-black text-foreground transition-colors leading-snug border-r-4 border-primary pr-3.5 py-0.5">
                  {book.title}
                </h2>
              </div>

              {/* Prices & Availability Card */}
              {(() => {
                const primaryPrice = formatBookPrice(book.prices);
                return (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-foreground/[0.02] border border-primary/20 p-5 rounded-2xl shadow-sm gold-glow">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                      {primaryPrice.amount !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/70">السعر:</span>
                          <span className="text-primary font-black text-xl md:text-2xl">
                            {primaryPrice.formatted}
                          </span>
                        </div>
                      ) : (
                        <span className="text-foreground/50 text-xs">سعر غير محدد</span>
                      )}
                    </div>

                    <span
                      className={`text-xs font-black px-4 py-1.5 rounded-full self-start sm:self-auto flex items-center gap-1.5 shrink-0 ${
                        book.availabilityStatus === "available"
                          ? "bg-green-500/10 text-green-600 border border-green-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}
                    >
                      {book.availabilityStatus === "available" ? (
                        <>
                          <FaCheckCircle className="text-green-500" />
                          <span>متوفر الآن بالمخزن</span>
                        </>
                      ) : (
                        <span>غير متوفر حالياً</span>
                      )}
                    </span>
                  </div>
                );
              })()}

              {/* Book Overview / Description */}
              <div className="flex flex-col gap-2">
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 border-r-2 border-primary pr-2">
                  <FaBookOpen className="text-primary text-xs" />
                  <span>نبذة عن الكتاب:</span>
                </h3>
                <div className="text-xs sm:text-sm text-foreground/80 leading-relaxed bg-foreground/[0.015] p-4 sm:p-5 rounded-2xl border border-border-color/40 font-medium max-h-[140px] overflow-y-auto">
                  {book.description || book.shortDescription || "لا يوجد وصف تفصيلي متوفر لهذا الكتاب حالياً."}
                </div>
              </div>

              {/* Book Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border-color/50 pt-5 text-xs sm:text-sm">
                
                {book.author && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaUser className="text-primary text-sm shrink-0" />
                    <span>المؤلف: <span className="font-bold text-foreground">{book.author}</span></span>
                  </div>
                )}

                {book.editorOrTranslator && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaBookmark className="text-primary text-sm shrink-0" />
                    <span>المحقق/المترجم: <span className="font-bold text-foreground">{book.editorOrTranslator}</span></span>
                  </div>
                )}

                {book.publisher && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaBuilding className="text-primary text-sm shrink-0" />
                    <span>دار النشر: <span className="font-bold text-foreground">{book.publisher}</span></span>
                  </div>
                )}

                {book.isbn && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaGlobe className="text-primary text-sm shrink-0" />
                    <span>رقم ISBN: <span className="font-bold text-foreground" dir="ltr">{book.isbn}</span></span>
                  </div>
                )}

                {book.publicationYear && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaCalendarAlt className="text-primary text-sm shrink-0" />
                    <span>سنة النشر: <span className="font-bold text-foreground">{book.publicationYear}</span></span>
                  </div>
                )}

                {book.edition && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaBookOpen className="text-primary text-sm shrink-0" />
                    <span>الطبعة: <span className="font-bold text-foreground">{book.edition}</span></span>
                  </div>
                )}

                {book.pagesCount && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaFileAlt className="text-primary text-sm shrink-0" />
                    <span>عدد الصفحات: <span className="font-bold text-foreground">{book.pagesCount}</span></span>
                  </div>
                )}

                {book.volumesCount && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaLayerGroup className="text-primary text-sm shrink-0" />
                    <span>عدد المجلدات: <span className="font-bold text-foreground">{book.volumesCount}</span></span>
                  </div>
                )}

                {book.coverType && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaPalette className="text-primary text-sm shrink-0" />
                    <span>نوع التجليد: <span className="font-bold text-foreground">{book.coverType}</span></span>
                  </div>
                )}

                {book.size && (
                  <div className="flex items-center gap-3 bg-card-bg border border-border-color/60 rounded-xl p-3.5 text-foreground/80 hover:border-primary/40 transition-all shadow-sm">
                    <FaRulerCombined className="text-primary text-sm shrink-0" />
                    <span>المقاس: <span className="font-bold text-foreground">{book.size}</span></span>
                  </div>
                )}

              </div>

            </div>
          </>
        )}

      </div>

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
