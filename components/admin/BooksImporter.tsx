"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { FaFileExcel, FaClipboardList, FaFileImport, FaCheckCircle, FaTimesCircle, FaTasks } from "react-icons/fa";
import Swal from "sweetalert2";

interface BookRow {
  title?: string;
  author?: string;
  publisher?: string;
  categoryName?: string;
  categoryId?: string;
  isbn?: string;
  priceEgp?: number;
  priceLyd?: number;
  edition?: string;
  publicationYear?: number;
  pagesCount?: number;
  volumesCount?: number;
  coverType?: string;
  size?: string;
  language?: string;
  availabilityStatus?: "available" | "unavailable";
  isFeatured?: boolean;
}

export default function BooksImporter() {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  
  // Data State
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  
  // Paste Area state
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState("");

  // Import Options
  const [duplicateStrategy, setDuplicateStrategy] = useState<"ignore" | "update" | "create_copy">("ignore");

  // Progress State
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetFields = [
    { key: "title", label: "اسم الكتاب *", matchedKeys: ["الكتاب", "العنوان", "title", "name"] },
    { key: "author", label: "المؤلف", matchedKeys: ["المؤلف", "الكاتب", "الؤلف", "author", "writer"] },
    { key: "publisher", label: "الناشر", matchedKeys: ["الناشر", "ناشر", "publisher"] },
    { key: "categoryName", label: "التصنيف *", matchedKeys: ["التصنيف", "القسم", "موضوع", "category", "section"] },
    { key: "priceEgp", label: "السعر بالجنيه", matchedKeys: ["سعر جنيه", "السعر", "بعد الخصم", "سعر بالجنيه قبل", "price_egp", "price"] },
    { key: "priceLyd", label: "السعر بالدينار", matchedKeys: ["سعر دينار", "سعر بالدينار", "price_lyd"] },
    { key: "isbn", label: "رقم ISBN", matchedKeys: ["isbn", "الرقم الدولي", "ISBN"] },
    { key: "coverType", label: "نوع التجليد", matchedKeys: ["التجليد", "تجليد", "cover_type"] },
    { key: "size", label: "المقاس", matchedKeys: ["المقاس", "مقاس", "size"] },
    { key: "publicationYear", label: "سنة النشر", matchedKeys: ["سنة النشر", "سنة", "الاصدار", "publication_year"] },
    { key: "volumesCount", label: "عدد المجلدات", matchedKeys: ["عدد المجلدات", "المجلدات", "volumes_count"] },
  ];

  // Auto match headers based on target key synonyms
  const autoMatchHeaders = (extractedHeaders: string[]) => {
    const newMappings: Record<string, string> = {};
    targetFields.forEach((field) => {
      const match = extractedHeaders.find((h) =>
        field.matchedKeys.some((synonym) => h.toLowerCase().includes(synonym.toLowerCase()))
      );
      if (match) {
        newMappings[field.key] = match;
      }
    });
    setMappings(newMappings);
  };

  // Handle Excel File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to json row objects
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          throw new Error("الملف فارغ أو غير صالح");
        }

        // Get unique headers
        const extractedHeaders = Array.from(
          new Set(jsonData.flatMap((row: any) => Object.keys(row)))
        ) as string[];

        setHeaders(extractedHeaders);
        setParsedData(jsonData);
        autoMatchHeaders(extractedHeaders);
        setReport(null);
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "فشل قراءة الملف",
          text: err.message || "يرجى التأكد من اختيار ملف إكسيل صالح",
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  // Handle Pasted JSON/text import
  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;

    try {
      // Try to parse as JSON
      const jsonData = JSON.parse(pastedText);
      const rows = Array.isArray(jsonData) ? jsonData : [jsonData];

      if (rows.length === 0) {
        throw new Error("بيانات JSON فارغة");
      }

      const extractedHeaders = Array.from(
        new Set(rows.flatMap((row: any) => Object.keys(row)))
      ) as string[];

      setHeaders(extractedHeaders);
      setParsedData(rows);
      autoMatchHeaders(extractedHeaders);
      setReport(null);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "صيغة نص غير صالحة",
        text: "يرجى التحقق من لصق نص بصيغة JSON صحيحة (مصفوفة من السجلات).",
        confirmButtonText: "موافق",
        confirmButtonColor: "#d4af37",
      });
    }
  };

  // Map raw sheet data rows to target database schema fields
  const mapDataToSchema = (): BookRow[] => {
    return parsedData.map((row) => {
      const book: any = {};
      targetFields.forEach((field) => {
        const mappedHeader = mappings[field.key];
        if (mappedHeader && row[mappedHeader] !== undefined) {
          book[field.key] = row[mappedHeader];
        }
      });
      return book as BookRow;
    });
  };

  const handleMappingChange = (fieldKey: string, headerName: string) => {
    setMappings((prev) => ({ ...prev, [fieldKey]: headerName }));
  };

  // Execute import process in batches
  const executeImport = async () => {
    const mappedBooks = mapDataToSchema();
    if (mappedBooks.length === 0) return;

    // Check if title is mapped
    if (!mappings["title"]) {
      Swal.fire({
        icon: "error",
        title: "خطأ في مطابقة الحقول",
        text: "يجب مطابقة حقل (اسم الكتاب) لرفع البيانات بنجاح.",
        confirmButtonText: "موافق",
        confirmButtonColor: "#d4af37",
      });
      return;
    }

    setImporting(true);
    setProgress(0);

    const batchSize = 100;
    const total = mappedBooks.length;
    const finalReport = {
      total,
      imported: 0,
      updated: 0,
      ignored: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Chunk books list and send POST requests
      for (let i = 0; i < total; i += batchSize) {
        const batch = mappedBooks.slice(i, i + batchSize);
        
        const res = await fetch("/api/admin/books/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            books: batch,
            duplicateStrategy,
          }),
        });
        const result = await res.json();

        if (res.ok && result.success && result.data) {
          const rep = result.data;
          finalReport.imported += rep.imported;
          finalReport.updated += rep.updated;
          finalReport.ignored += rep.ignored;
          finalReport.failed += rep.failed;
          if (rep.errors && rep.errors.length > 0) {
            finalReport.errors.push(...rep.errors);
          }
        } else {
          finalReport.failed += batch.length;
          finalReport.errors.push(`فشل رفع الدفعة من الصف ${i + 1} إلى ${Math.min(i + batchSize, total)}: ${result.message || "خطأ مجهول"}`);
        }

        // Update progress percentage
        setProgress(Math.round((Math.min(i + batchSize, total) / total) * 100));
      }

      setReport(finalReport);
      Swal.fire({
        icon: "success",
        title: "اكتمل الاستيراد",
        text: `تم معالجة ${total} من الكتب بنجاح. راجع التقرير بالأسفل للتفاصيل.`,
        confirmButtonText: "موافق",
        confirmButtonColor: "#d4af37",
      });
      
      // Clear data states
      setParsedData([]);
      setHeaders([]);
      setFileName("");
      setPastedText("");

    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "خطأ غير متوقع",
        text: "حدث خطأ غير متوقع أثناء معالجة البيانات الجماعية.",
        confirmButtonText: "موافق",
        confirmButtonColor: "#d4af37",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-right transition-colors duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-foreground">استيراد القوائم والكتب</h1>
        <p className="text-xs text-foreground/60 mt-1">رفع قوائم كتب بصيغة إكسيل أو نصوص JSON لمطابقتها واستيرادها</p>
      </div>

      {/* Mode selectors */}
      <div className="flex border-b border-border-color/60 text-xs">
        <button
          onClick={() => setActiveTab("file")}
          className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "file" ? "border-primary text-primary" : "border-transparent text-foreground/70"
          }`}
        >
          <FaFileExcel className="text-xs" />
          رفع ملف إكسيل / CSV
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "paste" ? "border-primary text-primary" : "border-transparent text-foreground/70"
          }`}
        >
          <FaClipboardList className="text-xs" />
          لصق نص JSON
        </button>
      </div>

      {/* Import Container Panel */}
      <div className="bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm transition-colors duration-300">
        
        {activeTab === "file" ? (
          // File Mode
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border-color rounded-xl p-8 bg-foreground/[0.005]">
            <FaFileExcel className="text-primary/30 text-5xl mb-4" />
            <span className="font-extrabold text-sm text-foreground mb-1">رفع قوائم الإكسيل</span>
            <p className="text-xs text-foreground/60 max-w-sm text-center mb-6">
              اختر ملف جدول البيانات بصيغة .xlsx أو .csv المحتوي على قوائم الكتب للتعديل والمطابقة.
            </p>
            
            <label className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-2.5 rounded-lg text-xs md:text-sm shadow-md gold-glow transition-all cursor-pointer">
              اختر ملف البيانات
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {fileName && (
              <span className="text-xs text-foreground/70 font-semibold mt-4">
                الملف المختار: <span className="text-primary font-bold">{fileName}</span>
              </span>
            )}
          </div>
        ) : (
          // Paste Text Area Mode
          <div className="flex flex-col gap-4">
            <label className="text-xs font-bold text-foreground/80">ألصق سجلات الـ JSON هنا (مصفوفة من الكائنات):</label>
            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder='[\n  {\n    "الكتاب": "تفسير ابن كثير",\n    "المؤلف": "ابن كثير",\n    "القسم": "تفسير",\n    "سعر جنيه": 250\n  }\n]'
              className="w-full bg-foreground/[0.02] border border-border-color rounded-xl p-4 text-xs font-mono focus:outline-none"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pastedText.trim()}
              className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-2 px-6 rounded-lg text-xs md:text-sm shadow self-end cursor-pointer"
            >
              تحليل النص الملصق
            </button>
          </div>
        )}

      </div>

      {/* Column Matching & Preview Panel */}
      {headers.length > 0 && parsedData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Mappings Panel (Left column) */}
          <div className="lg:col-span-5 bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm flex flex-col gap-5 transition-colors duration-300">
            <h3 className="font-extrabold text-sm md:text-base text-foreground border-r-4 border-primary pr-3 py-0.5">
              مطابقة حقول الجدول
            </h3>
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              قم بمطابقة الحقول الأساسية للكتاب في قاعدة البيانات مع أسماء الأعمدة المقابلة لها في جدولك المرفوع.
            </p>

            {/* Mappings list */}
            <div className="flex flex-col gap-4 text-xs">
              {targetFields.map((field) => (
                <div key={field.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="font-semibold text-foreground/85">{field.label}:</span>
                  
                  <select
                    value={mappings[field.key] || ""}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="w-full sm:w-56 bg-card-bg border border-border-color rounded-lg p-2 focus:outline-none"
                  >
                    <option value="">-- تجاهل هذا الحقل --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Duplicate Conflict Strategy Option */}
            <div className="flex flex-col gap-2 pt-4 border-t border-border-color/50 text-xs">
              <label className="font-bold text-foreground/85">خيار معالجة الكتب المكررة:</label>
              <select
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                className="w-full bg-card-bg border border-border-color rounded-lg p-2.5 focus:outline-none"
              >
                <option value="ignore">تجاوز وتخطي السجلات المكررة (Ignore)</option>
                <option value="update">تحديث وتعديل بيانات الكتب الموجودة حالياً (Update)</option>
                <option value="create_copy">إدخالها كنسخ جديدة مكررة (Create Copy)</option>
              </select>
            </div>

            {/* Execute Import trigger */}
            <button
              onClick={executeImport}
              disabled={importing}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-3 rounded-lg text-sm shadow gold-glow transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FaFileImport />
              {importing ? "جاري الاستيراد..." : `بدء استيراد (${parsedData.length}) كتب`}
            </button>
          </div>

          {/* Raw Excel Data Preview (Right column) */}
          <div className="lg:col-span-7 bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm overflow-hidden flex flex-col gap-4 transition-colors duration-300">
            <h3 className="font-extrabold text-sm md:text-base text-foreground">
              معاينة عينات البيانات المكتشفة
            </h3>
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              تعرض هذه القائمة عينة من أول 5 صفوف تم قراءتها من الملف لتسهيل المراجعة والتأكد من توافق الأعمدة.
            </p>

            <div className="w-full overflow-x-auto rounded-lg border border-border-color bg-foreground/[0.005]">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-foreground/[0.02] border-b border-border-color text-foreground/65">
                    {headers.slice(0, 5).map((h) => (
                      <th key={h} className="p-3 font-semibold">
                        {h}
                      </th>
                    ))}
                    {headers.length > 5 && <th className="p-3 font-semibold">...</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/40">
                  {parsedData.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {headers.slice(0, 5).map((h) => (
                        <td key={h} className="p-3 text-foreground/80 truncate max-w-[140px]">
                          {row[h] !== null && row[h] !== undefined ? String(row[h]) : ""}
                        </td>
                      ))}
                      {headers.length > 5 && <td className="p-3 text-foreground/45">...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Progress Overlay bar */}
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col gap-4 text-center">
            <FaTasks className="text-primary text-3xl mx-auto animate-bounce" />
            <span className="font-bold text-sm text-foreground">جاري استيراد الكتب...</span>
            <div className="w-full bg-foreground/10 rounded-full h-3.5 overflow-hidden">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-black text-xs text-primary">{progress}% مكتمل</span>
          </div>
        </div>
      )}

      {/* Final Import Report Summary */}
      {report && (
        <div className="bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm flex flex-col gap-4 transition-colors duration-300">
          <h3 className="font-extrabold text-sm md:text-base text-foreground border-r-4 border-primary pr-3 py-0.5">
            تقرير عملية الاستيراد الأخيرة
          </h3>

          {/* Cards counts row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-bold text-center">
            <div className="bg-foreground/[0.02] border border-border-color p-3 rounded-xl flex flex-col gap-1 text-foreground">
              <span>إجمالي السجلات</span>
              <span className="text-lg font-black">{report.total}</span>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex flex-col gap-1 text-green-600">
              <span className="flex items-center justify-center gap-1">
                <FaCheckCircle className="text-[10px]" />
                تم إضافتها (جديد)
              </span>
              <span className="text-lg font-black">{report.imported}</span>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex flex-col gap-1 text-blue-500">
              <span>تم تحديثها</span>
              <span className="text-lg font-black">{report.updated}</span>
            </div>
            <div className="bg-foreground/5 border border-border-color/60 p-3 rounded-xl flex flex-col gap-1 text-foreground/60">
              <span>تم تخطيها</span>
              <span className="text-lg font-black">{report.ignored}</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex flex-col gap-1 text-red-500">
              <span className="flex items-center justify-center gap-1">
                <FaTimesCircle className="text-[10px]" />
                سجلات خاطئة
              </span>
              <span className="text-lg font-black">{report.failed}</span>
            </div>
          </div>

          {/* Error messages logs */}
          {report.errors.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-xs font-bold text-red-500">تفاصيل الأخطاء وسجلات الفشل:</span>
              <div className="max-h-48 overflow-y-auto bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-[11px] text-red-600/90 font-mono leading-relaxed space-y-1.5">
                {report.errors.map((err: string, i: number) => (
                  <p key={i}>&bull; {err}</p>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
