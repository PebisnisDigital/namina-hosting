export type ProfileIcon =
  | "person"
  | "pin"
  | "home"
  | "book"
  | "image"
  | "palette"
  | "compass"
  | "chat"
  | "screens"
  | "building"
  | "flag"
  | "mentor"
  | "website"
  | "pencil"
  | "class"
  | "certificate";
export type ProfileCard = {
  id?: string;
  owner?: string;
  imageUrl?: string;
  color?: string;
  label: string;
  value: string;
  story: string;
  animatedIcon: number;
  icon?: ProfileIcon;
  brandIcon?: string;
  kind?: "name" | "work" | "social";
  url?: string;
  linkLabel?: string;
};

export const originalProfileTabs: ProfileCard[] = [
  {
    label: "Nama",
    value: "Vini Junia N",
    icon: "person",
    animatedIcon: 8121295,
    kind: "name",
    story:
      "Aku diberi nama Junia karena lahir pada bulan Juni. Bagiku, nama ini bisa menjadi pengingat sekaligus doa: terus tumbuh dan membawa kebaikan lewat karya.",
  },
  {
    label: "Bandung",
    value: "Kota tempatku tinggal",
    icon: "pin",
    animatedIcon: 8121270,
    story:
      "Di Bandung aku menjalani hari sebagai ibu rumah tangga sambil merintis dan mengerjakan proyek-proyek digital.",
  },
  {
    label: "Rumah",
    value: "Ibu rumah tangga",
    icon: "home",
    animatedIcon: 8121302,
    story:
      "Di sela urusan rumah, aku terus belajar, membuat konten, dan membangun sesuatu yang bisa dibagikan.",
  },
  {
    label: "Cuanify",
    value: "CEO Cuanify ID",
    icon: "building",
    animatedIcon: 8121313,
    story: "Kini aku dipercaya mengelola sebuah rintisan bernama Cuanify ID.",
  },
  {
    label: "Pebisnis",
    value: "Founder Pebisnis.Digital",
    icon: "flag",
    animatedIcon: 8121307,
    story:
      "Lewat Pebisnis.Digital aku berbagi pembelajaran digital marketing, terutama yang dekat dengan keseharian pemula.",
  },
  {
    label: "Mentor",
    value: "WhatsApp marketing",
    icon: "mentor",
    animatedIcon: 8121279,
    story:
      "Aku mendampingi pemula, ibu rumah tangga, dan pelaku usaha kecil memahami cara memakai WhatsApp untuk pemasaran.",
  },
  {
    label: "Produk",
    value: "Produk digital",
    icon: "screens",
    animatedIcon: 8121304,
    story:
      "Aku membuat materi dan produk digital yang bisa dipelajari dan dipraktikkan oleh orang lain.",
  },
  {
    label: "Belajar",
    value: "Belajar lewat praktik",
    icon: "book",
    animatedIcon: 8121312,
    story:
      "Aku banyak mengulik prompt gambar AI lewat eksperimen mandiri. Riwayat pendidikan formalku belum dibagikan di sini.",
  },
  {
    label: "Visual AI",
    value: "Gambar dan prompt AI",
    icon: "palette",
    animatedIcon: 8121272,
    story:
      "Mulanya iseng membuat gambar-gambar lucu. Rasa penasaran itu membawaku terus mencoba berbagai prompt dan gaya visual.",
  },
  {
    label: "PESONAFLIX",
    value: "Website personal sinematik",
    icon: "website",
    animatedIcon: 8121309,
    kind: "work",
    story:
      "Salah satu karya yang kubangun: halaman profil personal dengan pengalaman visual terinspirasi Netflix.",
  },
  {
    label: "Promptional",
    value: "Koleksi prompt visual",
    icon: "pencil",
    animatedIcon: 8121277,
    kind: "work",
    story:
      "Prototipe untuk menjelajahi prompt gambar beserta previewnya, supaya ide visual lebih mudah dicoba.",
  },
  {
    label: "KULWA",
    value: "Kelas via WhatsApp",
    icon: "class",
    animatedIcon: 8121297,
    kind: "work",
    story:
      "Aku berbagi materi lewat kelas WhatsApp. Sesi KULWA biasanya dimulai pukul 19.30 WIB.",
  },
  {
    label: "WhatsApp",
    value: "Komunitas dan pemasaran",
    brandIcon: "whatsapp",
    animatedIcon: 8121267,
    kind: "social",
    story:
      "Status, grup, dan channel adalah ruang yang sering kupakai untuk berbagi materi dan praktik marketing.",
  },
  {
    label: "Telegram",
    value: "Bot, grup, dan channel",
    brandIcon: "telegram",
    animatedIcon: 8121290,
    kind: "social",
    story:
      "Aku menggunakan Telegram untuk aktivitas komunitas dan distribusi konten digital.",
  },
  {
    label: "Threads",
    value: "Prompt dan cerita",
    brandIcon: "threads",
    animatedIcon: 8121316,
    kind: "social",
    story: "Di sini aku mencari inspirasi dan berbagi eksperimen gambar AI.",
  },
  {
    label: "Instagram",
    value: "Konten digital",
    brandIcon: "instagram",
    animatedIcon: 8121262,
    kind: "social",
    story: "Salah satu tempatku berbagi ide visual dan konten kreatif.",
  },
  {
    label: "YouTube",
    value: "Akun belum ditautkan",
    brandIcon: "youtube",
    animatedIcon: 8121299,
    kind: "social",
    story: "Belum ada tautan channel YouTube yang dibagikan untuk kartu ini.",
  },
  {
    label: "TikTok",
    value: "Konten singkat",
    brandIcon: "tiktok",
    animatedIcon: 8121311,
    kind: "social",
    story: "Kanal lain yang kupakai untuk mengeksplorasi konten digital.",
  },
];
