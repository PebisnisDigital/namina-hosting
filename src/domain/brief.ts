import { z } from "zod";
import { slugSchema } from "./content.js";

const short = (limit = 140) => z.string().trim().max(limit);
const longer = (limit = 4000) => z.string().trim().max(limit);
const optionalHttps = z.string().trim().max(600).refine((value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}, "Gunakan tautan HTTPS yang lengkap.");

export const clientBriefSchema = z.object({
  fullName: z.string().trim().min(2, "Nama lengkap wajib diisi.").max(120),
  displayName: short(120),
  profession: z.string().trim().min(2, "Profesi wajib diisi.").max(120),
  brand: short(120),
  birthPlace: short(120),
  birthDate: z.union([z.iso.date(), z.literal("")]),
  city: short(150),
  address: longer(500),
  email: z.union([z.email("Format email belum tepat."), z.literal("")]),
  whatsapp: z.string().trim().min(8, "Nomor WhatsApp wajib diisi.").max(32)
    .regex(/^\+?[0-9\s()-]{8,32}$/, "Gunakan nomor WhatsApp yang valid."),
  bio: longer(1500),
  education: longer(),
  skills: longer(),
  experience: longer(),
  achievements: longer(),
  certificates: longer(),
  hobbies: longer(600),
  services: longer(),
  products: longer(),
  audience: longer(1000),
  portfolio: longer(),
  testimonials: longer(1600),
  instagram: optionalHttps,
  facebook: optionalHttps,
  tiktok: optionalHttps,
  youtube: optionalHttps,
  linkedin: optionalHttps,
  website: optionalHttps,
  photoUrl: optionalHttps,
  videoUrl: optionalHttps,
  headline: short(200),
  preferredStyle: short(120),
  characterNotes: longer(700),
  specialRequest: longer(1600),
  requestedSlug: z.union([slugSchema, z.literal("")]),
  consent: z.literal(true, "Mohon setujui pemrosesan data sebelum mengirim."),
}).strict();

export type ClientBrief = z.infer<typeof clientBriefSchema>;
export type BriefStatus = "pending" | "in_progress" | "completed";
export type BriefSummary = {
  id: string;
  full_name: string;
  profession: string;
  status: BriefStatus;
  requested_slug: string | null;
  website_slug: string | null;
  created_at: string;
};
export type BriefRecord = BriefSummary & { details: ClientBrief };

export const briefStatusLabel: Record<BriefStatus, string> = {
  pending: "Belum dibuatkan website",
  in_progress: "Sedang dikerjakan",
  completed: "Website selesai",
};
