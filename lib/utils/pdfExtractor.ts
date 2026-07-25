export interface ExtractedBookData {
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
 * Smart Arabic Book Metadata Extractor from PDF text
 */
export async function extractBookDataFromPDF(pdfBuffer: Buffer): Promise<ExtractedBookData> {
  // Polyfill global DOMMatrix/ImageData if needed by pdf-parse internal worker in Node serverless
  if (typeof (global as any).DOMMatrix === "undefined") {
    (global as any).DOMMatrix = class DOMMatrix {};
  }
  if (typeof (global as any).ImageData === "undefined") {
    (global as any).ImageData = class ImageData {};
  }
  if (typeof (global as any).Path2D === "undefined") {
    (global as any).Path2D = class Path2D {};
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParseModule = require("pdf-parse");
  const PDFParse = pdfParseModule.PDFParse || pdfParseModule;

  let rawText = "";
  let totalPages = 0;

  try {
    if (typeof PDFParse === "function" && PDFParse.prototype && PDFParse.prototype.getText) {
      // PDFParse v2 class API
      const parser = new PDFParse({ data: pdfBuffer });
      const pdfData = await parser.getText();
      totalPages = pdfData.total || 0;
      rawText = cleanText(pdfData.text || "");
    } else if (typeof pdfParseModule === "function") {
      // PDFParse v1 function API fallback
      const pdfData = await pdfParseModule(pdfBuffer);
      totalPages = pdfData.numpages || 0;
      rawText = cleanText(pdfData.text || "");
    }
  } catch (err: any) {
    console.error("PDF Parsing error:", err);
    throw new Error("فشل قراءة محتوى ملف الـ PDF. يرجى التأكد من أن الملف غير محمي بكلمة سر أو تالف.");
  }

  // Take the first 4000 characters (typically contains Cover, Title Page, and Copyright Page)
  const frontText = rawText.slice(0, 4000);
  const lines = frontText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const result: ExtractedBookData = {
    pagesCount: totalPages > 0 ? totalPages : undefined,
    volumesCount: 1,
    rawTextPreview: frontText.slice(0, 500),
  };

  // 1. Try Gemini AI Extraction if GEMINI_API_KEY is configured
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (apiKey) {
    try {
      const aiResult = await extractWithGemini(frontText, apiKey);
      if (aiResult && aiResult.title) {
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

  // 2. Local Regex & Pattern Extraction Engine for Arabic Islamic Books
  extractLocalRegex(lines, frontText, result);

  return result;
}

/**
 * Local Regex Extractor logic for Arabic book headers
 */
function extractLocalRegex(lines: string[], fullText: string, result: ExtractedBookData) {
  // Ignore common opening headers
  const headerFilters = [
    /بسم\s+الله\s+الرحمن\s+الرحيم/,
    /الحمد\s+لله/,
    /حقوق\s+الطبع/,
    /جميع\s+الحقوق\s+محفوظة/,
    /الطبعة/,
    /دار\s+النشر/,
  ];

  // Filter valid title candidate lines
  const candidateLines = lines.filter(
    (line) => !headerFilters.some((filter) => filter.test(line)) && line.length > 2 && line.length < 120
  );

  // A. Extract Author (المؤلف)
  const authorRegex = /(?:تأليف|المؤلف|تأليف\s+فضيلة|تأليف\s+الشيخ|تأليف\s+الإمام|تأليف\s+الدكتور|للحافظ|للشيخ|للإمام|للعلامة|صنفه|وضع)\s*[:\-\s]+([^\n\r,.]+)/i;
  for (const line of lines) {
    const match = line.match(authorRegex);
    if (match && match[1]) {
      result.author = match[1].trim().replace(/^(فضيلة|الشيخ|الإمام|الدكتور|أ\.د|أد)\s+/, "");
      break;
    }
  }

  // B. Extract Editor/Translator (المحقق / المترجم)
  const editorRegex = /(?:تحقيق|دراسة\s+وتحقيق|تخريج|اعتنى\s+به|حققه|المحقق|ترجمة|تقديم)\s*[:\-\s]+([^\n\r,.]+)/i;
  for (const line of lines) {
    const match = line.match(editorRegex);
    if (match && match[1]) {
      result.editorOrTranslator = match[1].trim();
      break;
    }
  }

  // C. Extract Publisher (دار النشر)
  const publisherRegex = /(?:دار|مؤسسة|مركز|مكتبة|منشورات|مطبعة)\s+([^\n\r,.]+)/i;
  for (const line of lines) {
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
      let cleanTitle = line.replace(/^(كتاب|رسالة\s+في|مختصر|شرح|حاشية\s+على)\s+/, "$1 ");
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
 * Gemini AI Extraction for 99% Precision (if API Key provided)
 */
async function extractWithGemini(text: string, apiKey: string): Promise<ExtractedBookData | null> {
  const prompt = `أنت خبير في التعرف على كتب التراث والعلم الشرعي والكتب العربية. استخرج بيانات الكتاب التالية من النص المرفق بصيغة JSON فقط وبدون أي كود تشكيلي إضافي:
  {
    "title": "عنوان الكتاب الرئيسي الدقيق",
    "author": "اسم المؤلف الرئيسي بدون ألقاب زائدة",
    "editorOrTranslator": "اسم المحقق أو المترجم إن وجد",
    "publisher": "اسم دار النشر أو المؤسسة الناشرة",
    "publicationYear": 2023 (السنة كعدد صحيحي),
    "edition": "رقم أو اسم الطبعة (مثل: الطبعة الأولى)",
    "volumesCount": 1 (عدد المجلدات كعدد صحيح),
    "isbn": "الرقم الدولي إن وجد"
  }

  النص المستخرج من أول صفحات الـ PDF:
  """
  ${text}
  """`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) return null;

  const parsed = JSON.parse(jsonText);
  return {
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
