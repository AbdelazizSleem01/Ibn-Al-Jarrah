import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireCsrf } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { escapeRegex, validateDataImage } from "@/lib/security/request";

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
      origin: "http://localhost:3000",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("CSRF protection", () => {
  it("rejects cookie-auth mutations from an external origin", () => {
    const response = requireCsrf(jsonRequest("http://localhost:3000/api/admin/books", {}, {
      origin: "https://evil.example",
    }));

    expect(response?.status).toBe(403);
  });
});

describe("rate limiting", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("blocks requests after the configured threshold in local fallback mode", async () => {
    const request = jsonRequest("http://localhost:3000/api/auth/login", {});
    const policy = { key: `test-${Date.now()}`, limit: 1, windowSeconds: 60 };

    expect(await checkRateLimit(request, policy)).toBeNull();
    const blocked = await checkRateLimit(request, policy);
    expect(blocked?.status).toBe(429);
  });
});

describe("input hardening helpers", () => {
  it("escapes NoSQL regex metacharacters", () => {
    expect(escapeRegex("foo.*($ne)")).toBe("foo\\.\\*\\(\\$ne\\)");
  });

  it("rejects fake image data URLs and oversized image payloads", () => {
    expect(validateDataImage("data:text/html;base64,PHNjcmlwdA==")).toBeNull();
    expect(validateDataImage(`data:image/png;base64,${"A".repeat(20)}`, 4)).toBeNull();
  });
});

describe("admin route authorization", () => {
  it("rejects unauthenticated users opening an Admin API handler", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth/token", () => ({ getAuthUser: vi.fn(async () => null) }));
    vi.doMock("@/lib/db/dbConnect", () => ({ default: vi.fn(async () => undefined) }));

    const { GET } = await import("@/app/api/admin/orders/[id]/route");
    const response = await GET(new Request("http://localhost:3000/api/admin/orders/507f1f77bcf86cd799439011"), {
      params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
    });

    expect(response.status).toBe(401);
  });
});

describe("order tracking", () => {
  it("rejects a wrong phone suffix", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/dbConnect", () => ({ default: vi.fn(async () => undefined) }));
    vi.doMock("@/models/Order", () => ({
      default: {
        findOne: vi.fn(async () => ({
          orderNumber: "IJ-12345",
          customerName: "Test",
          customerPhone: "01012345678",
          governorate: "Cairo",
          cityOrArea: "Nasr City",
          items: [],
          subtotal: 10,
          shippingCost: 20,
          grandTotal: 30,
          currency: "EGP",
          paymentMethod: "cash_on_delivery",
          orderStatus: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
    }));

    const { GET } = await import("@/app/api/orders/track/route");
    const response = await GET(new Request("http://localhost:3000/api/orders/track?orderNumber=IJ-12345&phoneLast4=0000"));

    expect(response.status).toBe(404);
  });
});

describe("checkout business logic", () => {
  it("ignores client price, shipping, and unsupported currency values", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/dbConnect", () => ({ default: vi.fn(async () => undefined) }));
    vi.doMock("@/models/Book", () => ({
      default: {
        findById: vi.fn(async () => ({
          _id: "507f1f77bcf86cd799439011",
          isDeleted: false,
          title: "Book",
          slug: "book",
          volumesCount: 1,
          prices: { egp: 100, wholesale: 60 },
          coverImage: { secureUrl: "" },
        })),
      },
    }));
    const create = vi.fn(async (payload) => ({ _id: "order-id", ...payload }));
    vi.doMock("@/models/Order", () => ({ default: { create } }));

    const { POST } = await import("@/app/api/orders/checkout/route");
    const response = await POST(jsonRequest("http://localhost:3000/api/orders/checkout", {
      customerName: "Test",
      customerPhone: "01012345678",
      governorate: "Cairo",
      detailedAddress: "Address",
      items: [{ bookId: "507f1f77bcf86cd799439011", quantity: 2, price: 1 }],
      shippingCost: 9999,
      currency: "BTC",
      paymentMethod: "cash_on_delivery",
    }));

    expect(response.status).toBe(200);
    expect(create.mock.calls[0][0]).toMatchObject({
      subtotal: 200,
      shippingCost: 0,
      grandTotal: 200,
      currency: "EGP",
    });
  });
});

describe("PDF upload validation", () => {
  it("rejects a fake PDF extension with invalid magic bytes", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth/token", () => ({
      getAuthUser: vi.fn(async () => ({ id: "1", email: "a@example.com", name: "Admin" })),
    }));
    vi.doMock("@/lib/utils/pdfExtractor", () => ({ extractBookDataFromPDF: vi.fn() }));

    const form = new FormData();
    form.set("file", new File(["not-pdf"], "fake.pdf", { type: "application/pdf" }));

    const { POST } = await import("@/app/api/admin/books/extract-pdf/route");
    const response = await POST(new Request("http://localhost:3000/api/admin/books/extract-pdf", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
      body: form,
    }));

    expect(response.status).toBe(400);
  });
});
