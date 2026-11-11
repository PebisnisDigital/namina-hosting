export type ThemeCategory = "Sinema" | "Profesional" | "Premium" | "Kreatif" | "Ilustratif";

export type DemoTheme = {
  id: number;
  slug: `gaya${number}`;
  name: string;
  category: ThemeCategory;
  description: string;
  motif: string;
  energy: 1 | 2 | 3;
  rhythm: 1 | 2 | 3;
  motion: 1 | 2 | 3;
};

export const demoThemes: readonly DemoTheme[] = [
  { id: 1, slug: "gaya1", name: "Original Cinematic", category: "Sinema", description: "Video sinematik dengan lima menu profil dan slider kartu yang bergerak otomatis.", motif: "Video panggung dan kartu portofolio bergerak", energy: 3, rhythm: 2, motion: 3 },
  { id: 2, slug: "gaya2", name: "Executive Noir", category: "Profesional", description: "Dossier hitam-putih dengan susunan rapi dan tegas.", motif: "Dokumen eksekutif berbingkai", energy: 2, rhythm: 1, motion: 1 },
  { id: 3, slug: "gaya3", name: "Luxury Gold", category: "Premium", description: "Potret berbingkai lengkung dan tipografi seperti undangan eksklusif.", motif: "Lengkungan emas dan garis halus", energy: 3, rhythm: 2, motion: 2 },
  { id: 4, slug: "gaya4", name: "Clean Professional", category: "Profesional", description: "Profil profesional di atas halaman terang yang lapang.", motif: "Kertas putih dan bidang editorial", energy: 1, rhythm: 2, motion: 1 },
  { id: 5, slug: "gaya5", name: "Neon Futuristic", category: "Kreatif", description: "Identitas dalam antarmuka futuristik dengan penanda koordinat.", motif: "Sudut teknis dan aksen elektrik", energy: 3, rhythm: 3, motion: 3 },
  { id: 6, slug: "gaya6", name: "Chibi 3D", category: "Ilustratif", description: "Panggung ceria dengan kartu empuk dan bentuk mainan.", motif: "Bentuk gemuk dengan bayangan lembut", energy: 3, rhythm: 3, motion: 2 },
  { id: 7, slug: "gaya7", name: "Scrapbook Story", category: "Kreatif", description: "Cerita personal seperti tempelan foto dalam jurnal.", motif: "Polaroid, pita kertas, dan tulisan tangan", energy: 2, rhythm: 3, motion: 2 },
  { id: 8, slug: "gaya8", name: "Islamic Elegance", category: "Premium", description: "Komposisi hijau zamrud dan lengkung arsitektur yang tenang.", motif: "Mihrab geometris dan ornamen terukur", energy: 2, rhythm: 2, motion: 1 },
  { id: 9, slug: "gaya9", name: "Anime Cinematic", category: "Sinema", description: "Judul dramatis dan bingkai adegan bergaya komik layar lebar.", motif: "Panel manga dan garis gerak", energy: 3, rhythm: 3, motion: 3 },
  { id: 10, slug: "gaya10", name: "Clay 3D", category: "Ilustratif", description: "Kartu membulat seperti karya tanah liat berwarna hangat.", motif: "Lapisan clay dan relief bulat", energy: 2, rhythm: 2, motion: 2 },
  { id: 11, slug: "gaya11", name: "Doodle Sketch", category: "Ilustratif", description: "Sketsa spontan dengan bingkai tangan dan kertas gambar.", motif: "Coretan tinta serta garis bebas", energy: 2, rhythm: 3, motion: 2 },
  { id: 12, slug: "gaya12", name: "Retro Arcade", category: "Kreatif", description: "Layar arcade, blok piksel, dan nuansa permainan retro.", motif: "Piksel dan layar CRT", energy: 3, rhythm: 2, motion: 3 },
  { id: 13, slug: "gaya13", name: "Editorial Magazine", category: "Profesional", description: "Sampul majalah dengan judul besar dan kolom cerita.", motif: "Tipografi majalah dan nomor halaman", energy: 2, rhythm: 3, motion: 1 },
  { id: 14, slug: "gaya14", name: "Glassmorphism", category: "Kreatif", description: "Satu panel kaca bening melayang di depan panggung video.", motif: "Satu lapisan kaca sebagai fokus", energy: 2, rhythm: 2, motion: 2 },
  { id: 15, slug: "gaya15", name: "Nature Wellness", category: "Premium", description: "Nuansa daun, tanah, dan ruang bernapas yang menenangkan.", motif: "Lengkungan organik dan bayangan daun", energy: 1, rhythm: 2, motion: 1 },
  { id: 16, slug: "gaya16", name: "Papercut Storybook", category: "Ilustratif", description: "Cerita berlapis kertas dengan panggung seperti buku pop-up.", motif: "Potongan kertas bertingkat", energy: 3, rhythm: 3, motion: 2 },
] as const;

export const demoCategories = ["Semua", "Sinema", "Profesional", "Premium", "Kreatif", "Ilustratif"] as const;

export function getDemoTheme(slug: string): DemoTheme | undefined {
  return demoThemes.find((theme) => theme.slug === slug);
}
