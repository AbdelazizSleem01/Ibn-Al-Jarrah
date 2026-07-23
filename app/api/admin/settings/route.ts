import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import dbConnect from "@/lib/db/dbConnect";
import SiteSettings from "@/models/SiteSettings";
import { getAuthUser } from "@/lib/auth/token";
import { settingsSchema } from "@/lib/validation/schemas";
import { uploadImage, deleteImage } from "@/lib/cloudinary/upload";

export async function GET() {
  try {
    await dbConnect();
    let settings = await SiteSettings.findOne({ key: "main_settings" });
    if (!settings) {
      // Create defaults if not exists
      settings = await SiteSettings.create({ key: "main_settings" });
    }

    return NextResponse.json({
      success: true,
      message: "تم جلب إعدادات الموقع بنجاح",
      data: settings,
    });
  } catch (error) {
    console.error("Admin Settings GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب الإعدادات" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالدخول" },
        { status: 401 }
      );
    }

    await dbConnect();
    const body = await request.json();
    const result = settingsSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "بيانات الإدخال غير صحيحة", errors },
        { status: 400 }
      );
    }

    const settingsData = result.data;

    let settings = await SiteSettings.findOne({ key: "main_settings" });
    if (!settings) {
      settings = new SiteSettings({ key: "main_settings" });
    }

    // Handle logo upload
    if (body.logoBase64) {
      try {
        const uploadRes = await uploadImage(body.logoBase64, "dar_aljarrah/branding");
        
        // Delete old logo
        if (settings.logo?.publicId) {
          await deleteImage(settings.logo.publicId);
        }
        
        settings.logo = {
          secureUrl: uploadRes.secureUrl,
          publicId: uploadRes.publicId,
        };
      } catch (err: any) {
        return NextResponse.json(
          { success: false, message: "فشل رفع شعار الموقع" },
          { status: 500 }
        );
      }
    } else if (body.removeLogo === true) {
      if (settings.logo?.publicId) {
        await deleteImage(settings.logo.publicId);
      }
      settings.logo = undefined;
    }

    // Update settings fields
    settings.title = settingsData.title;
    settings.subtitle = settingsData.subtitle;
    settings.description = settingsData.description;
    settings.slogan = settingsData.slogan;
    settings.message = settingsData.message;
    settings.phone = settingsData.phone;
    settings.whatsapp = settingsData.whatsapp;
    settings.facebookUrl = settingsData.facebookUrl;
    settings.whatsappMenGroup = settingsData.whatsappMenGroup;
    settings.whatsappWomenGroup = settingsData.whatsappWomenGroup;
    
    if (settingsData.seo) {
      settings.seo = {
        title: settingsData.seo.title || settings.seo?.title,
        description: settingsData.seo.description || settings.seo?.description,
        keywords: settingsData.seo.keywords || settings.seo?.keywords,
      };
    }

    settings.updatedAt = new Date();
    await settings.save();
    revalidateTag("settings", "max");

    return NextResponse.json({
      success: true,
      message: "تم تحديث إعدادات الموقع بنجاح",
      data: settings,
    });
  } catch (error) {
    console.error("Admin Settings PATCH Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحديث الإعدادات" },
      { status: 500 }
    );
  }
}
