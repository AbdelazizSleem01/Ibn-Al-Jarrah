"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaCrown, FaClock, FaArrowLeft } from "react-icons/fa";
import BookCard from "./BookCard";
import BookModal from "./BookModal";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface BooksSectionProps {
  books: any[];
  title: string;
  showAllLink?: boolean;
}

export default function BooksSection({ books, title, showAllLink = false }: BooksSectionProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Watch query params to show modal if URL has ?book=slug
  useEffect(() => {
    const bookParam = searchParams.get("book");
    if (bookParam) {
      setActiveSlug(bookParam);
    } else {
      setActiveSlug(null);
    }
  }, [searchParams]);

  const handleDetailsClick = (slug: string) => {
    setActiveSlug(slug);
    // Update URL query parameter without page reload
    const params = new URLSearchParams(window.location.search);
    params.set("book", slug);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseModal = () => {
    setActiveSlug(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("book");
    router.push(params.toString() ? `?${params.toString()}` : window.location.pathname, { scroll: false });
  };

  if (!books || books.length === 0) return null;

  return (
    <section className="py-12 transition-colors duration-300">
      <div className="container mx-auto px-4">
        
        {/* Section Header */}
        <ScrollReveal variant="reveal">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl md:text-2xl font-black text-foreground border-r-4 border-primary pr-3 py-1 flex items-center gap-2">
              {title === "الكتب المميزة" && <FaCrown className="text-primary w-5 h-5" />}
              {title === "أحدث الإصدارات" && <FaClock className="text-primary w-5 h-5" />}
              <span>{title}</span>
            </h2>
            {showAllLink && (
              <button
                onClick={() => router.push("/books")}
                className="text-xs md:text-sm font-bold text-primary hover:text-primary-hover transition-all duration-300 flex items-center gap-1.5 cursor-pointer bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 px-4 py-2 rounded-full shadow-sm hover:shadow"
              >
                <span>عرض جميع الكتب</span>
                <FaArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
              </button>
            )}
          </div>
        </ScrollReveal>

        {/* Books Grid */}
        <ScrollReveal variant="reveal" stagger className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <BookCard
              key={book._id}
              book={book}
              onDetailsClick={handleDetailsClick}
            />
          ))}
        </ScrollReveal>

        {/* Book Details Modal */}
        {activeSlug && (
          <BookModal
            bookSlug={activeSlug}
            onClose={handleCloseModal}
          />
        )}

      </div>
    </section>
  );
}
