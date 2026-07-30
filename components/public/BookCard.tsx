import React, { memo, useState } from "react";
import Image from "next/image";
import { FaBookOpen, FaUser, FaTag, FaInfoCircle } from "react-icons/fa";
import { useCurrency } from "@/context/CurrencyContext";
import CheckoutModal from "@/components/public/CheckoutModal";

interface BookCardProps {
  book: {
    _id: string;
    title: string;
    slug: string;
    author?: string;
    publisher?: string;
    categoryId?: {
      _id: string;
      name: string;
      slug: string;
    };
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
    availabilityStatus: "available" | "unavailable";
    isFeatured?: boolean;
  };
  onDetailsClick: (slug: string, bookObj?: any) => void;
  priority?: boolean;
}

function BookCard({ book, onDetailsClick, priority = false }: BookCardProps) {
  const { formatBookPrice } = useCurrency();
  const priceInfo = formatBookPrice(book.prices);
  const imageUrl = book.images?.[0]?.secureUrl || book.coverImage?.secureUrl || "/images/hero-book.webp";
  const isAvailable = book.availabilityStatus === "available";
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <>
      <div className="group relative flex flex-col h-full rounded-xl border border-border-color bg-card-bg overflow-hidden hover:scale-[1.02] hover:shadow-xl hover:border-primary/30 card-hover">
        
        {/* Featured Badge */}
        {book.isFeatured && (
          <span className="absolute top-3 right-3 z-10 bg-primary text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md">
            مميز
          </span>
        )}

        {/* Book Cover Image / Mockup Placeholder */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-foreground/5 flex items-center justify-center border-b border-border-color">
          <Image
            src={imageUrl}
            alt={book.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
          />

          {/* Quick View Hover Overlay (Desktop) */}
          <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
            <button
              onClick={() => onDetailsClick(book.slug, book)}
              className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-lg transform translate-y-4 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <FaInfoCircle />
              التفاصيل
            </button>
          </div>
        </div>

        {/* Book Card Details */}
        <div className="p-4 flex flex-col flex-grow gap-2.5">
          
          {/* Title */}
          <h3 className="font-bold text-sm md:text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {book.title}
          </h3>

          {/* Author & Category Info */}
          <div className="flex flex-col gap-1.5 text-xs text-foreground/75">
            {book.author && (
              <div className="flex items-center gap-2">
                <FaUser className="text-primary text-[10px] shrink-0" />
                <span className="line-clamp-1">{book.author}</span>
              </div>
            )}
            {book.categoryId && (
              <div className="flex items-center gap-2">
                <FaTag className="text-primary text-[10px] shrink-0" />
                <span className="line-clamp-1">{book.categoryId.name}</span>
              </div>
            )}
          </div>

          {/* Price & Availability Section */}
          <div className="mt-auto pt-3 border-t border-border-color/50 flex items-center justify-between">
            <div className="flex flex-col text-xs font-black">
              {priceInfo.amount !== null ? (
                <span className="text-primary font-black text-sm md:text-base">
                  {priceInfo.formatted}
                </span>
              ) : (
                <span className="text-foreground/50 text-[10px] font-normal">سعر غير محدد</span>
              )}
            </div>

            {/* Availability Badge */}
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                isAvailable
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}
            >
              {isAvailable ? "متوفر" : "نفد"}
            </span>
          </div>

          {/* Actions Bar */}
          <div className="flex gap-2 mt-1">
            {/* Details Button: Only visible on mobile (md:hidden) */}
            <button
              onClick={() => onDetailsClick(book.slug, book)}
              className="md:hidden flex-1 flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary px-3 py-2 rounded-lg font-bold text-xs transition-all duration-300 cursor-pointer"
            >
              <FaInfoCircle />
              التفاصيل
            </button>

            {/* Direct Order Button: Full width on desktop, flex-1 on mobile */}
            {isAvailable ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCheckout(true);
                }}
                className="w-full flex-1 flex items-center justify-center gap-1.5 bg-primary text-white hover:opacity-90 px-3 py-2 rounded-lg font-bold text-xs shadow transition-all cursor-pointer gold-glow"
              >
                <FaBookOpen className="text-xs" />
                طلب الكتاب
              </button>
            ) : (
              <button
                disabled
                className="w-full flex-1 flex items-center justify-center gap-1 bg-muted text-foreground/40 px-3 py-2 rounded-lg font-bold text-xs cursor-not-allowed"
              >
                غير متوفر حالياً
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Direct Order Modal */}
      {showCheckout && (
        <CheckoutModal
          book={book}
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}

export default memo(BookCard);
