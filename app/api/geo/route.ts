import { NextResponse } from "next/server";

export interface GeoResponse {
  countryCode: string;
  currency: "EGP" | "LYD" | "USD";
  source: string;
}

export async function GET(request: Request) {
  try {
    const headers = request.headers;

    // 1. Check CDN / Cloud hosting geolocation headers
    const countryHeader =
      headers.get("x-vercel-ip-country") ||
      headers.get("cf-ipcountry") ||
      headers.get("x-country-code") ||
      headers.get("x-geo-country") ||
      headers.get("cloudfront-viewer-country");

    if (countryHeader && countryHeader !== "XX" && countryHeader.length === 2) {
      const countryCode = countryHeader.toUpperCase();
      let currency: "EGP" | "LYD" | "USD" = "USD";
      if (countryCode === "EG") currency = "EGP";
      else if (countryCode === "LY") currency = "LYD";

      return NextResponse.json({
        countryCode,
        currency,
        source: "header",
      });
    }

    // 2. Check X-Forwarded-For IP address for external GeoIP lookup if header is absent
    const forwardedFor = headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

    if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1" && !clientIp.startsWith("192.168.")) {
      try {
        const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`, {
          signal: AbortSignal.timeout(2000), // 2 seconds timeout max
        });
        if (geoRes.ok) {
          const data = await geoRes.json();
          if (data.country_code) {
            const countryCode = data.country_code.toUpperCase();
            let currency: "EGP" | "LYD" | "USD" = "USD";
            if (countryCode === "EG") currency = "EGP";
            else if (countryCode === "LY") currency = "LYD";

            return NextResponse.json({
              countryCode,
              currency,
              source: "ipapi",
            });
          }
        }
      } catch {
        // Fallback silently if external service fails or times out
      }
    }

    // 3. Default fallback (Egypt -> EGP)
    return NextResponse.json({
      countryCode: "EG",
      currency: "EGP",
      source: "default",
    });
  } catch (err) {
    return NextResponse.json({
      countryCode: "EG",
      currency: "EGP",
      source: "error",
    });
  }
}
