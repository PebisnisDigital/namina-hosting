import type { OriginalProfile } from "../domain/content";

const makeId = (index: number) => `00000000-0000-4000-9001-${String(index).padStart(12, "0")}`;

const nameData: Array<[string, string, number]> = [
  ["Nama", "Vini Junia N", 8121295],
  ["Tanggal Lahir", "8 Juni 1996", 8121312],
  ["Domisili", "Garut", 8121270],
  ["Jenis Kelamin", "Perempuan", 8121295],
  ["Agama", "Islam", 8121302],
  ["Status", "Kawin", 8121302],
  ["Hobi", "Jalan & Jajan", 8121279],
  ["Olahraga", "Badminton", 8121297],
  ["Pendidikan", "TK Kartika", 8121313],
  ["Pendidikan", "SDN Kartika", 8121313],
  ["Pendidikan", "Pondok Pesantren Darul Arqam Muhammadiyah Garut", 8121313],
  ["Pendidikan", "Unpad, Jurusan Keperawatan", 8121313],
];
const careerData = [
  "Founder Cuanify.id", "Founder Pebisnis.digital", "Founder Komunitas BADAI",
  "Founder PESONAFLIX", "Founder NAMINA.PRO", "Internet Marketing",
  "Affiliate Marketer", "Reseller", "Mentor", "Digital Creator", "AI Enthusiast",
];
const skillData = [
  "Digital Marketing", "Sales", "Lead", "Copywriting", "Digital Creation",
  "AI Enthusiast", "WhatsApp Marketing", "AI Automation",
];

type GallerySeed = [string, string, string, OriginalProfile["karya"]["items"][number]["motif"]];
const karyaData: GallerySeed[] = [
  ["Website BADAI", "Website BADAI, bagian dari karya digital Teh Vini untuk komunitas BADAI.", "#ec4151", "storm"],
  ["Website PESONAFLIX", "Website PESONAFLIX, platform portofolio personal bergaya sinematik Netflix.", "#ff4a4a", "cinema"],
  ["Website NAMINA.PRO", "Website NAMINA.PRO, proyek web profil personal dengan video dan interaksi sinematik.", "#ed3441", "monogram"],
  ["Web Asanirwanaselaras.com", "Website Asa Nirwana Selaras untuk layanan transportasi dan rental kendaraan.", "#ffb354", "road"],
];
const produkData: GallerySeed[] = [
  ["MUSICUAN", "MUSICUAN merupakan salah satu produk dalam portofolio Teh Vini.", "#bb73ff", "music"],
  ["BADAI", "BADAI merupakan komunitas dan produk yang dibangun Teh Vini.", "#f65766", "community"],
  ["PESONAFLIX", "PESONAFLIX menyediakan jasa pembuatan website personal dengan nuansa Netflix.", "#ff5454", "cinema"],
  ["NAMINA.PRO", "NAMINA.PRO menawarkan website profil personal bergaya sinematik yang interaktif.", "#ff5665", "monogram"],
  ["Karyawan AI", "Karyawan AI merupakan salah satu produk berbasis AI dalam portofolio Teh Vini.", "#77ccff", "bot"],
  ["CUANIMASI", "CUANIMASI merupakan salah satu produk kreatif Teh Vini.", "#ffb96b", "animation"],
];

export const viniOriginal: OriginalProfile = {
  contactUrl: "https://wa.me/62881022445869?text=Halo%20Teh%20Vini%2C%20saya%20melihat%20profil%20NAMINA%20dan%20ingin%20menghubungi%20Teteh.",
  nama: {
    title: "Nama",
    intro: "Halo, perkenalkan nama saya adalah...",
    subtitle: "",
    description: "Ibu rumah tangga yang jatuh cinta pada AI, digital marketing, dan karya-karya kreatif.",
    items: nameData.map(([label, value, icon], index) => ({ id: makeId(index + 1), label, value, icon })),
  },
  karir: {
    title: "Karir",
    intro: "Pengalaman mengenai...",
    subtitle: "PERJALANAN & PENGALAMAN",
    description: "Peran dan perjalanan karir yang aku tekuni.",
    items: careerData.map((value, index) => ({ id: makeId(101 + index), label: "Karir", value, icon: [8121304, 8121309, 8121299, 8121272][index % 4] })),
  },
  skill: {
    title: "Skill",
    intro: "Aku selalu belajar mengembangkan...",
    subtitle: "KEAHLIAN & KEMAMPUAN",
    description: "Bidang yang aku pelajari dan kembangkan.",
    items: skillData.map((value, index) => ({ id: makeId(201 + index), label: "Skill", value, icon: [8121272, 8121262, 8121290, 8121279][index % 4] })),
  },
  karya: {
    title: "Karya",
    intro: "Dan inilah...",
    subtitle: "YANG SUDAH DIBAGIKAN",
    description: "Kumpulan website yang aku kerjakan. Sentuh kartu untuk melihat detailnya.",
    items: karyaData.map(([title, description, color, motif], index) => ({ id: makeId(301 + index), title, description, color, motif, link: "", imageAssetId: null })),
  },
  produk: {
    title: "Produk",
    intro: "Ambil berkah dan manfaat dari...",
    subtitle: "KREASI & BISNIS",
    description: "Produk dan proyek yang aku bangun. Sentuh kartu untuk melihat detailnya.",
    items: produkData.map(([title, description, color, motif], index) => ({ id: makeId(401 + index), title, description, color, motif, link: "", imageAssetId: null })),
  },
};

export function blankOriginal(displayName: string): OriginalProfile {
  return {
    contactUrl: "",
    nama: {
      title: "Nama",
      intro: "Halo, perkenalkan nama saya adalah...",
      subtitle: "",
      description: "",
      items: [{ id: crypto.randomUUID(), label: "Nama", value: displayName, icon: 8121295 }],
    },
    karir: { title: "Karir", intro: "Pengalaman mengenai...", subtitle: "PERJALANAN & PENGALAMAN", description: "", items: [] },
    skill: { title: "Skill", intro: "Aku selalu belajar mengembangkan...", subtitle: "KEAHLIAN & KEMAMPUAN", description: "", items: [] },
    karya: { title: "Karya", intro: "Dan inilah...", subtitle: "YANG SUDAH DIBAGIKAN", description: "", items: [] },
    produk: { title: "Produk", intro: "Ambil berkah dan manfaat dari...", subtitle: "KREASI & BISNIS", description: "", items: [] },
  };
}

