import { z } from "zod";

export const reservedSlugs = new Set([
  "admin",
  "api",
  "login",
  "logout",
  "dashboard",
  "studio",
  "preview",
  "assets",
  "auth",
  "settings",
  "checkout",
  "register",
  "help",
  "www",
  "new",
  "demo",
  "canvas",
  "privacy",
  "terms",
  "support",
  "gaya",
  "templates",
  "formulir",
]);
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/,
    "Gunakan 3–48 huruf kecil, angka, atau tanda hubung.",
  )
  .refine((s) => !reservedSlugs.has(s) && !/^gaya(?:[1-9]|1[0-6])$/.test(s), "Nama ini dipakai sistem.");
export function safeLink(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    const clean = !Array.from(value).some(
      (c) => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127,
    );
    const allowed =
      /^https:\/\//.test(value) ||
      /^mailto:[^\s@]+@[^\s@]+$/.test(value) ||
      /^tel:[+0-9()-]+$/.test(value);
    return (
      allowed &&
      ["https:", "mailto:", "tel:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      clean
    );
  } catch {
    return false;
  }
}
const text = (max: number) => z.string().max(max);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const asset = z.uuid().nullable();
export const cardSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(["profile", "experience", "skills", "contact"]),
    title: text(48).min(1),
    subtitle: text(100),
    description: text(1200),
    visible: z.boolean(),
    color,
    imageAssetId: asset,
    icon: z.enum(["person", "pin", "home", "book", "image", "palette", "compass", "chat", "screens", "building", "flag", "mentor", "website", "pencil", "class", "certificate"]).optional(),
    brandIcon: z.enum(["whatsapp", "telegram", "threads", "instagram", "youtube", "tiktok"]).optional(),
    kind: z.enum(["name", "work", "social"]).optional(),
    animatedIcon: z.number().int().positive().optional(),
    link: text(500).refine(
      safeLink,
      "Gunakan tautan https, email, atau telepon yang valid.",
    ),
    linkLabel: text(80).optional(),
  })
  .strict();
const originalFactSchema = z.object({
  id: z.uuid(),
  label: text(40).min(1),
  value: text(180),
  icon: z.number().int().positive(),
}).strict();
const originalGalleryItemSchema = z.object({
  id: z.uuid(),
  title: text(80).min(1),
  description: text(1200),
  link: text(500).refine((value) => !value || (value.startsWith("https://") && safeLink(value)), "Masukkan URL HTTPS yang valid."),
  imageAssetId: asset,
  color,
  motif: z.enum(["storm", "cinema", "monogram", "road", "music", "community", "bot", "animation"]),
}).strict();
const originalFactSectionSchema = z.object({
  intro: text(120),
  subtitle: text(100),
  description: text(400),
  items: z.array(originalFactSchema).max(30),
}).strict();
const originalGallerySectionSchema = z.object({
  intro: text(120),
  subtitle: text(100),
  description: text(400),
  items: z.array(originalGalleryItemSchema).max(20),
}).strict();
export const originalStyleSchema = z.object({
  backgroundColor: color,
  textColor: color,
  accentColor: color,
  buttonColor: color,
  buttonTextColor: color,
  borderColor: color,
  fontFamily: z.enum(["montserrat", "space", "georgia", "system"]),
  titleScale: z.number().min(0.8).max(1.2),
  bodyScale: z.number().min(0.85).max(1.2),
  contentMargin: z.number().int().min(40).max(150),
  topSpacing: z.number().int().min(0).max(90),
  factColumns: z.number().int().min(2).max(4),
  galleryColumns: z.number().int().min(1).max(3),
  cardGap: z.number().int().min(0).max(28),
  buttonRadius: z.number().int().min(0).max(32),
  borderWidth: z.number().int().min(0).max(3),
  buttonVariant: z.enum(["solid", "outline"]),
  shadow: z.enum(["none", "soft", "strong"]),
}).strict();
export type OriginalStyle = z.infer<typeof originalStyleSchema>;
export const originalProfileSchema = z.object({
  contactUrl: text(500).refine((value) => !value || (value.startsWith("https://") && safeLink(value)), "Gunakan URL WhatsApp HTTPS yang valid."),
  style: originalStyleSchema.optional(),
  nama: originalFactSectionSchema,
  karir: originalFactSectionSchema,
  skill: originalFactSectionSchema,
  karya: originalGallerySectionSchema,
  produk: originalGallerySectionSchema,
}).strict();
export type OriginalProfile = z.infer<typeof originalProfileSchema>;
export const contentSchema = z
  .object({
    schemaVersion: z.literal(1),
    template: z.literal("ORIGINAL"),
    original: originalProfileSchema.optional(),
    identity: z
      .object({
        displayName: text(60).min(1),
        profession: text(70),
        bio: text(300),
        portraitAssetId: asset,
        brandLabel: text(32).optional(),
        introLabel: text(80).optional(),
      })
      .strict(),
    wallet: z
      .object({
        color,
        materialPreset: z.enum(["original", "matte"]),
        animationPreset: z.enum(["normal", "minimal"]),
      })
      .strict(),
    background: z
      .object({
        desktopVideoAssetId: asset,
        mobileVideoAssetId: asset,
        posterAssetId: asset,
        overlayOpacity: z.number().min(0.25).max(0.85),
        focalX: z.number().min(0).max(100),
        mobileFocalX: z.number().min(0).max(100).optional(),
        focalY: z.number().min(0).max(100),
      })
      .strict(),
    theme: z
      .object({
        accent: color,
        fontPreset: z.enum(["original", "system"]),
        headingScale: z.number().min(0.8).max(1.3).optional(),
        cardTitleScale: z.number().min(0.75).max(1.4).optional(),
        cardValueScale: z.number().min(0.75).max(1.4).optional(),
        cardBodyScale: z.number().min(0.75).max(1.4).optional(),
        titleColor: color.optional(),
        roleColor: color.optional(),
        enterKeyAssetId: asset.optional(),
      })
      .strict(),
    cards: z
      .array(cardSchema)
      .min(1)
      .max(24)
      .refine((c) => c.some((x) => x.visible), "Minimal satu kartu terlihat.")
      .refine(
        (c) => new Set(c.map((x) => x.id)).size === c.length,
        "ID kartu harus unik.",
      ),
  })
  .strict();
export type SiteContent = z.infer<typeof contentSchema>;
export type ContentCard = SiteContent["cards"][number];
export type Selection =
  "identity" | "wallet" | "background" | "theme" | `card:${string}`;
export type AssetUrls = Record<string, string>;
export const defaultContent: SiteContent = {
  schemaVersion: 1,
  template: "ORIGINAL",
  identity: {
    displayName: "Nama Anda",
    profession: "Profesi Anda",
    bio: "Tulis perkenalan singkat tentang diri Anda.",
    portraitAssetId: null,
  },
  wallet: {
    color: "#382c28",
    materialPreset: "original",
    animationPreset: "normal",
  },
  background: {
    desktopVideoAssetId: null,
    mobileVideoAssetId: null,
    posterAssetId: null,
    overlayOpacity: 0.4,
    focalX: 50,
    focalY: 50,
  },
  theme: { accent: "#c9a66b", fontPreset: "original" },
  cards: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      type: "profile",
      title: "Tentang saya",
      subtitle: "Kenali saya",
      description: "Ganti contoh ini dengan cerita Anda sendiri.",
      visible: true,
      color: "#ef694e",
      imageAssetId: null,
      link: "",
    },
  ],
};
export function assetIds(content: SiteContent) {
  return [
    ...new Set(
      [
        content.identity.portraitAssetId,
        content.background.desktopVideoAssetId,
        content.background.mobileVideoAssetId,
        content.background.posterAssetId,
        content.theme.enterKeyAssetId,
        ...content.cards.map((c) => c.imageAssetId),
        ...(content.original?.karya.items.map((c) => c.imageAssetId) || []),
        ...(content.original?.produk.items.map((c) => c.imageAssetId) || []),
      ].filter((id): id is string => !!id),
    ),
  ];
}
export function newCard(): ContentCard {
  return {
    ...defaultContent.cards[0],
    id: crypto.randomUUID(),
    title: "Kartu baru",
  };
}
