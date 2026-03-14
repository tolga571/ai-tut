"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { LEARNING_LANGUAGES, DOC_LANG_CODES } from "@/constants/languages";
import { useTranslations } from "next-intl";

const CATEGORIES = ["blog", "page", "document"] as const;
type Category = (typeof CATEGORIES)[number];

interface PostFormData {
  title: string;
  slug: string;
  content: string;
  category: Category;
  language: string;
  published: boolean;
  isPremium: boolean;
}

interface PostFormProps {
  initialData?: PostFormData & { id: string };
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PostForm({ initialData }: PostFormProps) {
  const t = useTranslations("admin");
  const tLangs = useTranslations("languages");
  const router = useRouter();
  const isEdit = !!initialData;

  const [form, setForm] = useState<PostFormData>({
    title:     initialData?.title     ?? "",
    slug:      initialData?.slug      ?? "",
    content:   initialData?.content   ?? "",
    category:  initialData?.category  ?? "blog",
    language:  initialData?.language  ?? "en",
    published: initialData?.published ?? false,
    isPremium: initialData?.isPremium ?? false,
  });
  const [slugManual, setSlugManual] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Auto-generate slug from title unless user manually edited it
  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((prev) => ({ ...prev, slug: slugify(form.title) }));
    }
  }, [form.title, slugManual]);

  const set = (key: keyof PostFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      return toast.error(t("errors.required"));
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/posts/${initialData!.id}`
        : "/api/admin/posts";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.status === 409) return toast.error(t("errors.slugConflict"));
      if (!res.ok) {
        const data = await res.json();
        return toast.error(data.error?.formErrors?.[0] ?? t("errors.saveFailed"));
      }

      toast.success(isEdit ? t("postUpdated") : t("postCreated"));
      router.push("/admin/posts");
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/posts/${initialData!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("postDeleted"));
      router.push("/admin/posts");
    } catch {
      toast.error(t("errors.deleteFailed"));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const labelCls = "block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className={labelCls}>{t("form.title")}</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputCls}
          placeholder={t("form.titlePlaceholder")}
          required
        />
      </div>

      {/* Slug */}
      <div>
        <label className={labelCls}>{t("form.slug")}</label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => { setSlugManual(true); set("slug", e.target.value); }}
          className={inputCls}
          placeholder="my-post-slug"
          required
        />
        <p className="text-xs text-gray-600 mt-1">{t("form.slugHint")}</p>
      </div>

      {/* Category + Language row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t("form.category")}</label>
          <select
            value={form.category}
            onChange={(e) => {
              const newCat = e.target.value as Category;
              setForm((prev) => ({
                ...prev,
                category: newCat,
                // Reset language to a valid default when switching category tier
                language:
                  newCat === "document" && !(DOC_LANG_CODES as readonly string[]).includes(prev.language)
                    ? "en"
                    : newCat !== "document" && (DOC_LANG_CODES as readonly string[]).includes(prev.language)
                    ? prev.language // doc langs are valid learning langs too
                    : prev.language,
              }));
            }}
            className={`${inputCls} cursor-pointer`}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("form.language")}</label>
          <select
            value={form.language}
            onChange={(e) => set("language", e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            {form.category === "document"
              ? DOC_LANG_CODES.map((code) => (
                  <option key={code} value={code} className="bg-gray-800">
                    {tLangs(code)}
                  </option>
                ))
              : LEARNING_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {lang.nameEn}
                  </option>
                ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div>
        <label className={labelCls}>{t("form.content")}</label>
        <textarea
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          rows={12}
          className={`${inputCls} resize-y`}
          placeholder={t("form.contentPlaceholder")}
          required
        />
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={form.published}
            onClick={() => set("published", !form.published)}
            className={`w-10 h-6 rounded-full transition-colors ${form.published ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"}`}
          >
            <span
              className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${form.published ? "translate-x-4" : "translate-x-0"}`}
            />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">{t("form.published")}</span>
        </label>

        {form.category === "document" && (
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={form.isPremium}
              onClick={() => set("isPremium", !form.isPremium)}
              className={`w-10 h-6 rounded-full transition-colors ${form.isPremium ? "bg-yellow-500" : "bg-gray-300 dark:bg-gray-700"}`}
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${form.isPremium ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t("form.premium")}
              <span className="ml-1 text-yellow-400 text-xs">⭐ {t("form.premiumHint")}</span>
            </span>
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isEdit ? t("form.saveChanges") : t("form.create")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/posts")}
            className="px-5 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 transition-all"
          >
            {t("form.cancel")}
          </button>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={`px-5 py-3 rounded-xl text-sm font-medium transition-all ${
              confirmDelete
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400"
            } disabled:opacity-40`}
          >
            {deleting
              ? t("form.deleting")
              : confirmDelete
              ? t("form.confirmDelete")
              : t("form.delete")}
          </button>
        )}
      </div>
    </form>
  );
}
