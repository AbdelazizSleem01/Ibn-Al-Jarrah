"use client";

import React, { useState, useEffect } from "react";
import { FaUserCog, FaBuilding, FaGlobe, FaSave, FaTimes, FaCamera } from "react-icons/fa";
import Swal from "sweetalert2";

export default function SettingsManager() {
  const [activeTab, setActiveTab] = useState<"account" | "site" | "seo">("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Site Settings Form
  const [siteForm, setSiteForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    slogan: "",
    message: "",
    phone: "",
    whatsapp: "",
    facebookUrl: "",
    whatsappMenGroup: "",
    whatsappWomenGroup: "",
    logoUrl: "",
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [removeLogoFlag, setRemoveLogoFlag] = useState(false);

  // SEO Form
  const [seoForm, setSeoForm] = useState({
    title: "",
    description: "",
    keywords: "",
  });

  // Account Forms
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Fetch Settings on mount
  useEffect(() => {
    // 1. Fetch site settings
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const settings = data.data;
          setSiteForm({
            title: settings.title || "",
            subtitle: settings.subtitle || "",
            description: settings.description || "",
            slogan: settings.slogan || "",
            message: settings.message || "",
            phone: settings.phone || "",
            whatsapp: settings.whatsapp || "",
            facebookUrl: settings.facebookUrl || "",
            whatsappMenGroup: settings.whatsappMenGroup || "",
            whatsappWomenGroup: settings.whatsappWomenGroup || "",
            logoUrl: settings.logo?.secureUrl || "",
          });
          setLogoPreview(settings.logo?.secureUrl || null);

          if (settings.seo) {
            setSeoForm({
              title: settings.seo.title || "",
              description: settings.seo.description || "",
              keywords: settings.seo.keywords || "",
            });
          }
        }
      });

    // 2. Fetch admin user info
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProfileForm({
            name: data.data.name,
            email: data.data.email,
            currentPassword: "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSiteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSiteForm({ ...siteForm, [e.target.name]: e.target.value });
  };

  const handleSeoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSeoForm({ ...seoForm, [e.target.name]: e.target.value });
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "الملف كبير جداً",
          text: "الحد الأقصى لحجم الشعار هو 1 ميجابايت",
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setLogoBase64(reader.result as string);
        setRemoveLogoFlag(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoBase64(null);
    setRemoveLogoFlag(true);
  };

  // Submit Site & Branding Settings
  const handleSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    const payload = {
      ...siteForm,
      seo: seoForm,
      logoBase64: logoBase64 || undefined,
      removeLogo: removeLogoFlag,
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "تم حفظ الإعدادات",
          text: data.message,
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
      } else {
        if (data.errors) setErrors(data.errors);
        Swal.fire({ icon: "error", title: "فشل الحفظ", text: data.message });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع" });
    } finally {
      setSaving(false);
    }
  };

  // Submit profile edit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "نجاح الحفظ",
          text: data.message,
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
        setProfileForm((prev) => ({ ...prev, currentPassword: "" }));
      } else {
        if (data.errors) setErrors(data.errors);
        Swal.fire({ icon: "error", title: "فشل تحديث الحساب", text: data.message });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع" });
    } finally {
      setSaving(false);
    }
  };

  // Submit password change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "تم تغيير كلمة المرور",
          text: data.message,
          confirmButtonText: "موافق",
          confirmButtonColor: "#d4af37",
        });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        if (data.errors) setErrors(data.errors);
        Swal.fire({ icon: "error", title: "فشل تغيير كلمة المرور", text: data.message });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "خطأ", text: "حدث خطأ غير متوقع" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 text-right">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="h-96 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-right transition-colors duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-foreground">إعدادات الموقع والحساب</h1>
        <p className="text-xs text-foreground/60 mt-1">تحديث إعدادات الهوية البصرية، بيانات الاتصال، والأمان</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-color/60 text-xs">
        <button
          onClick={() => {
            setActiveTab("account");
            setErrors({});
          }}
          className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "account" ? "border-primary text-primary" : "border-transparent text-foreground/75"
          }`}
        >
          <FaUserCog className="text-xs" />
          إعدادات الحساب والأمان
        </button>
        <button
          onClick={() => {
            setActiveTab("site");
            setErrors({});
          }}
          className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "site" ? "border-primary text-primary" : "border-transparent text-foreground/75"
          }`}
        >
          <FaBuilding className="text-xs" />
          الهوية والاتصال
        </button>
        <button
          onClick={() => {
            setActiveTab("seo");
            setErrors({});
          }}
          className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "seo" ? "border-primary text-primary" : "border-transparent text-foreground/75"
          }`}
        >
          <FaGlobe className="text-xs" />
          تهيئة الـ SEO والأرشفة
        </button>
      </div>

      {/* Settings Forms container */}
      <div className="bg-card-bg border border-border-color rounded-2xl p-6 md:p-8 shadow-sm transition-colors duration-300">
        
        {activeTab === "account" && (
          // Account Settings Forms
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Profile Info Form */}
            <form onSubmit={handleProfileSubmit} className="md:col-span-6 flex flex-col gap-4 text-xs">
              <h3 className="font-extrabold text-sm md:text-base text-foreground mb-2">تحديث بيانات المشرف</h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-foreground/75">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-foreground/75">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className={`bg-foreground/[0.02] border rounded-lg p-2.5 text-xs focus:outline-none ${
                    errors.email ? "border-red-500" : "border-border-color"
                  }`}
                />
                {errors.email && <span className="text-[10px] text-red-500">{errors.email[0]}</span>}
              </div>

              <div className="flex flex-col gap-1.5 pt-3 border-t border-border-color/50">
                <label className="font-bold text-primary">كلمة المرور الحالية للتأكيد *</label>
                <input
                  type="password"
                  required
                  placeholder="أدخل كلمة مرورك لتأكيد الحفظ"
                  value={profileForm.currentPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                  className={`bg-foreground/[0.02] border rounded-lg p-2.5 text-xs focus:outline-none ${
                    errors.currentPassword ? "border-red-500" : "border-border-color"
                  }`}
                />
                {errors.currentPassword && (
                  <span className="text-[10px] text-red-500">{errors.currentPassword[0]}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow gold-glow active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 self-end mt-2"
              >
                <FaSave />
                {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>
            </form>

            {/* Change Password Form */}
            <form onSubmit={handlePasswordSubmit} className="md:col-span-6 flex flex-col gap-4 text-xs border-t md:border-t-0 md:border-r border-border-color md:pr-8 pt-8 md:pt-0">
              <h3 className="font-extrabold text-sm md:text-base text-foreground mb-2">تغيير كلمة المرور</h3>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-foreground/75">كلمة المرور الحالية *</label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className={`bg-foreground/[0.02] border rounded-lg p-2.5 text-xs focus:outline-none ${
                    errors.currentPassword ? "border-red-500" : "border-border-color"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-foreground/75">كلمة المرور الجديدة *</label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className={`bg-foreground/[0.02] border rounded-lg p-2.5 text-xs focus:outline-none ${
                    errors.newPassword ? "border-red-500" : "border-border-color"
                  }`}
                />
                {errors.newPassword && <span className="text-[10px] text-red-500">{errors.newPassword[0]}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-foreground/75">تأكيد كلمة المرور الجديدة *</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className={`bg-foreground/[0.02] border rounded-lg p-2.5 text-xs focus:outline-none ${
                    errors.confirmPassword ? "border-red-500" : "border-border-color"
                  }`}
                />
                {errors.confirmPassword && (
                  <span className="text-[10px] text-red-500">{errors.confirmPassword[0]}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow gold-glow active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 self-end mt-2"
              >
                <FaSave />
                {saving ? "جاري التغيير..." : "تغيير كلمة المرور"}
              </button>
            </form>

          </div>
        )}

        {activeTab === "site" && (
          // Site and Contact Info Form
          <form onSubmit={handleSiteSubmit} className="flex flex-col md:flex-row gap-8 items-stretch text-xs">
            
            {/* Logo Image selection (Left side) */}
            <div className="w-full md:w-1/3 flex flex-col items-center justify-center bg-foreground/[0.01] border border-border-color rounded-2xl p-6 shrink-0 gap-4">
              <span className="font-bold text-foreground/70 text-center">شعار المؤسسة</span>
              
              <div className="relative w-28 h-28 rounded-full border border-primary/20 bg-card-bg flex items-center justify-center overflow-hidden group shadow-md gold-glow">
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="شعار" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute bottom-2 left-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="حذف الشعار"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <FaCamera className="text-foreground/30 text-3xl" />
                )}
              </div>

              <label className="bg-primary hover:bg-primary-hover text-white font-bold px-4 py-2 rounded-lg text-xs shadow cursor-pointer transition-all">
                رفع شعار جديد
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Site Settings Inputs (Right side) */}
            <div className="w-full md:w-2/3 flex flex-col gap-4">
              <h3 className="font-extrabold text-sm md:text-base text-foreground border-r-4 border-primary pr-3 py-0.5">إعدادات الهوية البصرية وبيانات الاتصال</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Title */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="font-bold text-foreground/75">اسم المؤسسة كامل *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={siteForm.title}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Subtitle */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="font-bold text-foreground/75">العنوان التعريفي (الفرعي)</label>
                  <input
                    type="text"
                    name="subtitle"
                    value={siteForm.subtitle}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="font-bold text-foreground/75">نبذة ووصف الصفحة الرئيسية</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={siteForm.description}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Slogan */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">شعار المؤسسة</label>
                  <input
                    type="text"
                    name="slogan"
                    value={siteForm.slogan}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">الرسالة أو العبارة الترويجية</label>
                  <input
                    type="text"
                    name="message"
                    value={siteForm.message}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">رقم الهاتف للتواصل *</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={siteForm.phone}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Whatsapp */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">رقم الواتساب الدولي (بدون أصفار أو رمز +) *</label>
                  <input
                    type="text"
                    name="whatsapp"
                    required
                    value={siteForm.whatsapp}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Facebook URL */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="font-bold text-foreground/75">رابط صفحة فيسبوك</label>
                  <input
                    type="text"
                    name="facebookUrl"
                    value={siteForm.facebookUrl}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Whatsapp Men Group */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">رابط مجموعة الرجال على واتساب</label>
                  <input
                    type="text"
                    name="whatsappMenGroup"
                    value={siteForm.whatsappMenGroup}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Whatsapp Women Group */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-foreground/75">رابط مجموعة النساء على واتساب</label>
                  <input
                    type="text"
                    name="whatsappWomenGroup"
                    value={siteForm.whatsappWomenGroup}
                    onChange={handleSiteChange}
                    className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                  />
                </div>

              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-2.5 px-8 rounded-lg text-xs shadow gold-glow active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 self-end mt-4"
              >
                <FaSave />
                {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </button>
            </div>

          </form>
        )}

        {activeTab === "seo" && (
          // SEO Metadata settings form
          <form onSubmit={handleSiteSubmit} className="flex flex-col gap-5 text-xs">
            <h3 className="font-extrabold text-sm md:text-base text-foreground border-r-4 border-primary pr-3 py-0.5">محركات البحث والـ SEO</h3>
            <p className="text-[10px] text-foreground/60 leading-relaxed max-w-2xl">
              تساعد هذه الإعدادات في تحسين أرشفة الموقع على محركات البحث مثل جوجل لضمان وصول القراء والباحثين عن الكتب لموقعكم بسهولة.
            </p>

            {/* SEO Form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Meta title */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-bold text-foreground/75">عنوان صفحات محرك البحث (SEO Meta Title)</label>
                <input
                  type="text"
                  name="title"
                  value={seoForm.title}
                  onChange={handleSeoChange}
                  className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                />
              </div>

              {/* Meta Description */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-bold text-foreground/75">وصف صفحات محرك البحث (SEO Meta Description)</label>
                <textarea
                  name="description"
                  rows={3}
                  value={seoForm.description}
                  onChange={handleSeoChange}
                  className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                />
              </div>

              {/* Meta Keywords */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-bold text-foreground/75">الكلمات المفتاحية (SEO Meta Keywords - افصل بينها بفاصلة)</label>
                <input
                  type="text"
                  name="keywords"
                  value={seoForm.keywords}
                  onChange={handleSeoChange}
                  className="bg-foreground/[0.02] border border-border-color rounded-lg p-2.5 text-xs focus:outline-none"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-2.5 px-8 rounded-lg text-xs shadow gold-glow active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 self-end mt-4"
            >
              <FaSave />
              {saving ? "جاري الحفظ..." : "حفظ إعدادات الـ SEO"}
            </button>

          </form>
        )}

      </div>

    </div>
  );
}
