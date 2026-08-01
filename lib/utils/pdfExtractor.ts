const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export interface ExtractedBookData {
  isCatalog?: boolean;
  books?: Array<{
    title?: string;
    author?: string;
    publisher?: string;
    priceEgp?: number;
    edition?: string;
    publicationYear?: number;
    isbn?: string;
    volumesCount?: number;
  }>;
  title?: string;
  author?: string;
  editorOrTranslator?: string;
  publisher?: string;
  publicationYear?: number;
  edition?: string;
  pagesCount?: number;
  volumesCount?: number;
  isbn?: string;
  confidence?: number;
  rawTextPreview?: string;
}

/**
 * Clean Arabic text by removing extra whitespace and common decorative characters
 */
function cleanText(str: string): string {
  return str
    .replace(/[\r\n]+/g, "\n")
    .replace(/[ـ]/g, "") // remove tatweel
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
}

/**
 * Reverse character sequence helper if Arabic bidi text is inverted by PDF generator
 */
function fixReversedArabic(str: string): string {
  if (!str) return str;
  if (str.includes("باتكلا") || str.includes("املؤلف") || str.includes("رشنا")) {
    return str.split("").reverse().join("");
  }
  return str;
}

/**
 * Smart Arabic Book Metadata & Catalog Extractor with Real-Time Progress Callback
 */
export async function extractBookDataFromPDF(
  pdfBuffer: Buffer,
  onProgress?: (percent: number, status: string) => void
): Promise<ExtractedBookData> {
  let rawText = "";
  let totalPages = 0;

  onProgress?.(25, "جاري قراءة محتوى الصفحات والجداول من الملف...");

  try {
    const pdfData = await pdfParse(pdfBuffer);
    totalPages = pdfData.numpages || 0;
    rawText = cleanText(pdfData.text || "");
  } catch (err: any) {
    console.error("PDF Parsing error:", err);
    throw new Error("فشل قراءة محتوى ملف الـ PDF. يرجى التأكد من أن الملف غير محمي بكلمة سر أو تالف.");
  }

  onProgress?.(
    45,
    `تم قراءة (${totalPages}) صفحة. جاري التحليل بالذكاء الاصطناعي وتصحيح النصوص المعكوسة...`
  );

  // Take up to 25,000 characters to cover bulk catalogs
  const fullContentText = rawText.slice(0, 25000);
  const lines = fullContentText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const result: ExtractedBookData = {
    pagesCount: totalPages > 0 ? totalPages : undefined,
    volumesCount: 1,
    rawTextPreview: fullContentText.slice(0, 500),
  };

  // 1. Try Gemini AI Extraction if GEMINI_API_KEY is configured
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (apiKey) {
    try {
      const aiResult = await extractWithGemini(fullContentText, apiKey, onProgress);
      if (aiResult) {
        const bookCount = aiResult.isCatalog ? aiResult.books?.length || 0 : 1;
        onProgress?.(
          85,
          `تم استخراج (${bookCount}) كتاب بنجاح. جاري تجميع الجدول والتأكد من الأعمدة...`
        );
        return {
          ...aiResult,
          pagesCount: result.pagesCount || aiResult.pagesCount,
          rawTextPreview: result.rawTextPreview,
        };
      }
    } catch (err) {
      console.warn("Gemini AI extraction fallback to local regex:", err);
    }
  }

  onProgress?.(75, "جاري استخراج البيانات بالمحرك المحلي المتقدم...");
  extractLocalRegex(lines, fullContentText, result);

  onProgress?.(85, "جاري تجهيز البيانات وتنسيق الجدول...");
  return result;
}

/**
 * Local Regex Extractor logic for Arabic book headers
 */
function extractLocalRegex(lines: string[], fullText: string, result: ExtractedBookData) {
  const headerFilters = [
    /بسم\s+الله\s+الرحمن\s+الرحيم/,
    /الحمد\s+لله/,
    /حقوق\s+الطبع/,
    /جميع\s+الحقوق\s+محفوظة/,
    /الطبعة/,
    /دار\s+النشر/,
  ];

  const candidateLines = lines.map(fixReversedArabic).filter(
    (line) => !headerFilters.some((filter) => filter.test(line)) && line.length > 2 && line.length < 120
  );

  // A. Extract Author (المؤلف)
  const authorRegex = /(?:تأليف|المؤلف|تأليف\s+فضيلة|تأليف\s+الشيخ|تأليف\s+الإمام|تأليف\s+الدكتور|للحافظ|للشيخ|للإمام|للعلامة|صنفه|وضع)\s*[:\-\s]+([^\n\r,.]+)/i;
  for (const rawLine of lines) {
    const line = fixReversedArabic(rawLine);
    const match = line.match(authorRegex);
    if (match && match[1]) {
      result.author = match[1].trim().replace(/^(فضيلة|الشيخ|الإمام|الدكتور|أ\.د|أد)\s+/, "");
      break;
    }
  }

  // B. Extract Editor/Translator (المحقق / المترجم)
  const editorRegex = /(?:تحقيق|دراسة\s+وتحقيق|تخريج|اعتنى\s+به|حققه|المحقق|ترجمة|تقديم)\s*[:\-\s]+([^\n\r,.]+)/i;
  for (const rawLine of lines) {
    const line = fixReversedArabic(rawLine);
    const match = line.match(editorRegex);
    if (match && match[1]) {
      result.editorOrTranslator = match[1].trim();
      break;
    }
  }

  // C. Extract Publisher (دار النشر)
  const publisherRegex = /(?:دار|مؤسسة|مركز|مكتبة|منشورات|مطبعة)\s+([^\n\r,.]+)/i;
  for (const rawLine of lines) {
    const line = fixReversedArabic(rawLine);
    const match = line.match(publisherRegex);
    if (match && match[0]) {
      result.publisher = match[0].trim();
      break;
    }
  }

  // D. Extract Title (عنوان الكتاب)
  for (const line of candidateLines) {
    if (
      !result.author?.includes(line) &&
      !result.publisher?.includes(line) &&
      !result.editorOrTranslator?.includes(line)
    ) {
      const cleanTitle = line.replace(/^(كتاب|رسالة\s+في|مختصر|شرح|حاشية\s+على)\s+/, "$1 ");
      result.title = cleanTitle.trim();
      break;
    }
  }

  // E. Extract Publication Year (سنة الطبع)
  const yearRegex = /(?:عام|سنة|سنة\s+الطبع|الطبعة)?\s*(1[34]\d{2}\s*هـ?|20[0-2]\d\s*م?|19\d{2}\s*م?)/i;
  const yearMatch = fullText.match(yearRegex);
  if (yearMatch && yearMatch[1]) {
    const num = parseInt(yearMatch[1].replace(/[^\d]/g, ""));
    if (num > 1300 && num < 2050) {
      result.publicationYear = num;
    }
  }

  // F. Extract Edition (الطبعة)
  const editionRegex = /(الطبعة\s+(الأولى|الثانية|الثالثة|الرابعة|الخامسة|المزيدة|الجديدة|ط\d+))/i;
  const editionMatch = fullText.match(editionRegex);
  if (editionMatch && editionMatch[1]) {
    result.edition = editionMatch[1].trim();
  }

  // G. Extract Volumes (عدد المجلدات)
  const volumesRegex = /(في\s+(\d+|مجلدين|أجزاء|جزءين)\s*(مجلدات|أجزاء|مجلد)?)/i;
  const volumesMatch = fullText.match(volumesRegex);
  if (volumesMatch) {
    if (fullText.includes("مجلدين") || fullText.includes("جزءين")) {
      result.volumesCount = 2;
    } else {
      const numMatch = volumesMatch[0].match(/\d+/);
      if (numMatch) {
        result.volumesCount = parseInt(numMatch[0]);
      }
    }
  }

  // H. Extract ISBN
  const isbnRegex = /(?:ISBN|الرقم\s+الدولي)?\s*:?\s*(97[89][\d\-\s]{10,14}|\d{9}[\dX])/i;
  const isbnMatch = fullText.match(isbnRegex);
  if (isbnMatch && isbnMatch[1]) {
    result.isbn = isbnMatch[1].replace(/[^\dX]/gi, "");
  }
}

/**
 * Gemini AI Extraction for Catalog Tables & Single Books with Status Callback
 */
async function extractWithGemini(
  fullText: string,
  apiKey: string,
  onProgress?: (percent: number, status: string) => void
): Promise<ExtractedBookData | null> {
  onProgress?.(55, "جاري إرسال البيانات لنماذج الذكاء الاصطناعي وقراءة الجداول...");

  const prompt = `أنت نظام ذكاء اصطناعي خبير في قراءة وتحليل قوائم الكتب العربية وكشوف أسعار الدور والنشر والتوزيع.
حلل النص المرفق المأخوذ من ملف PDF واستخرج البيانات بدقة متناهية وفق القواعد التالية:

1. إذا كان النص يحتوي على جدول أو قائمة كتب (كشف أسعار أو كتالوج يحتوي عدة كتب وأسعار ومؤلفين):
استخرج كود JSON بالبنية التالية للـ catalog:
{
  "type": "catalog",
  "publisher": "اسم دار النشر من رأس الصفحة (مثل: الدار العالمية للنشر والتجليد)",
  "books": [
    {
      "title": "اسم الكتاب بالعربية الصحيحة مع تصحيح أي نصوص أو حروف معكوسة الترتيب",
      "author": "اسم المؤلف",
      "priceEgp": 140 (السعر الصافي أو النهائي بالجنيه كعدد صحيح أو عشري),
      "edition": "النوع أو التجليد (مثل: مجلد، غلاف، 2مجلد)",
      "publisher": "اسم الناشر"
    }
  ]
}

2. إذا كان النص يمثل كتاباً واحداً فردياً:
استخرج كود JSON بالبنية التالية للـ single_book:
{
  "type": "single_book",
  "title": "عنوان الكتاب الرئيسي الدقيق مع تصحيح أي حروف معكوسة",
  "author": "اسم المؤلف الرئيسي",
  "editorOrTranslator": "اسم المحقق أو المترجم إن وجد",
  "publisher": "اسم دار النشر",
  "publicationYear": 2026,
  "edition": "الطبعة",
  "volumesCount": 1,
  "isbn": "الرقم الدولي"
}

ملاحظات هامة جداً:
- قم بتصحيح وإصلاح أي كلمات عربية مقلوبة النمط بسبب تنسيق الـ PDF (مثل تصحيح 'باتكلا' إلى 'الكتاب'، و'املؤلف' إلى 'المؤلف').
- استخرج كل صفوف الكتب المتاحة في القائمة قدر الإمكان.
- أرجع كائن JSON فقط دون أي نصوص إضافية أو علامات formatting.

نص الـ PDF:
"""
${fullText}
"""`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    return null;
  }

  onProgress?.(75, "تم استلام الاستجابة الذكية وجاري مطابقة صفوف الكتب...");

  const data = await response.json();
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) return null;

  const parsed = JSON.parse(jsonText);

  if (parsed.type === "catalog" && Array.isArray(parsed.books) && parsed.books.length > 0) {
    return {
      isCatalog: true,
      publisher: parsed.publisher || undefined,
      books: parsed.books.map((b: any) => ({
        title: b.title || "",
        author: b.author || "",
        publisher: b.publisher || parsed.publisher || "",
        priceEgp: typeof b.priceEgp === "number" ? b.priceEgp : parseFloat(b.priceEgp) || undefined,
        edition: b.edition || "",
      })),
    };
  }

  return {
    isCatalog: false,
    title: parsed.title || undefined,
    author: parsed.author || undefined,
    editorOrTranslator: parsed.editorOrTranslator || undefined,
    publisher: parsed.publisher || undefined,
    publicationYear: typeof parsed.publicationYear === "number" ? parsed.publicationYear : undefined,
    edition: parsed.edition || undefined,
    volumesCount: typeof parsed.volumesCount === "number" ? parsed.volumesCount : undefined,
    isbn: parsed.isbn || undefined,
  };
}
