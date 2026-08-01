import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Admin from "@/models/Admin";
import bcrypt from "bcrypt";
import { signToken, setAuthCookie } from "@/lib/auth/token";
import { loginSchema } from "@/lib/validation/schemas";
import { readJsonBody } from "@/lib/security/request";
import { requireCsrf } from "@/lib/security/csrf";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  try {
    const csrf = requireCsrf(request);
    if (csrf) return csrf;

    const rateLimit = await checkRateLimit(request, ratePolicies.login);
    if (rateLimit) return rateLimit;

    await dbConnect();
    const body = await readJsonBody(request);
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "Invalid input", errors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const invalidCredsResponse = () =>
      NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );

    const admin = await Admin.findOne({ email });
    if (!admin) return invalidCredsResponse();

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return invalidCredsResponse();

    const token = signToken({
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CONTENT_TYPE") {
      return NextResponse.json(
        { success: false, message: "Content-Type must be application/json" },
        { status: 415 }
      );
    }
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
      return NextResponse.json(
        { success: false, message: "Request body is too large" },
        { status: 413 }
      );
    }
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, message: "Unexpected server error" },
      { status: 500 }
    );
  }
}
