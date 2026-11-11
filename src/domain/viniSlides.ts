import type { SiteContent } from "./content";

export type IdentityCard = SiteContent["cards"][number];
export type StorySection = "profil" | "keahlian" | "karya" | "kontak";
export type StorySlide = {
  section: StorySection;
  label: string;
  items: IdentityCard[];
};

const sectionLabels: Record<StorySection, string> = {
  profil: "Cerita sehari-hari",
  keahlian: "Bisnis dan keahlian",
  karya: "Karya yang kubangun",
  kontak: "Tempatku berbagi",
};

/** Publish visibility and original card order are always respected. */
export function buildViniSlides(cards: IdentityCard[], pageSize: number): StorySlide[] {
  const visible = cards.filter((card) => card.visible);
  const profile = visible.filter((card) => card.type === "profile");
  const groups: { section: StorySection; items: IdentityCard[] }[] = [
    { section: "profil", items: profile.slice(0, 3) },
    { section: "keahlian", items: [
      ...profile.slice(3),
      ...visible.filter((card) => card.type === "skills"),
    ] },
    { section: "karya", items: visible.filter((card) => card.type === "experience") },
    { section: "kontak", items: visible.filter((card) => card.type === "contact") },
  ];
  const slides: StorySlide[] = [];
  for (const group of groups) {
    for (let index = 0; index < group.items.length; index += Math.max(1, pageSize)) {
      slides.push({
        section: group.section,
        label: sectionLabels[group.section],
        items: group.items.slice(index, index + Math.max(1, pageSize)),
      });
    }
  }
  return slides;
}
