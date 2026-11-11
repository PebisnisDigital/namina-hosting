import assert from "node:assert/strict";
import test from "node:test";
import { clientBriefSchema } from "../src/domain/brief";

const fullBrief = {
  fullName: "Klien Uji",
  displayName: "",
  profession: "Pengajar",
  brand: "",
  birthPlace: "",
  birthDate: "",
  city: "",
  address: "",
  email: "",
  whatsapp: "0812 3456 7890",
  bio: "",
  education: "",
  skills: "",
  experience: "",
  achievements: "",
  certificates: "",
  hobbies: "",
  services: "",
  products: "",
  audience: "",
  portfolio: "",
  testimonials: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  youtube: "",
  linkedin: "",
  website: "",
  photoUrl: "",
  videoUrl: "",
  headline: "",
  preferredStyle: "",
  characterNotes: "",
  specialRequest: "",
  requestedSlug: "",
  consent: true,
};

test("brief accepts essential identity and contact while optional biodata stays empty", () => {
  assert.equal(clientBriefSchema.safeParse(fullBrief).success, true);
});

test("brief rejects missing consent and malformed dates", () => {
  assert.equal(clientBriefSchema.safeParse({ ...fullBrief, consent: false }).success, false);
  assert.equal(clientBriefSchema.safeParse({ ...fullBrief, birthDate: "09-11-2026" }).success, false);
});

test("brief rejects dangerous URL schemes and unrelated fields", () => {
  assert.equal(clientBriefSchema.safeParse({ ...fullBrief, photoUrl: "javascript:alert(1)" }).success, false);
  assert.equal(clientBriefSchema.safeParse({ ...fullBrief, requestedSlug: "../admin" }).success, false);
  assert.equal(clientBriefSchema.safeParse({ ...fullBrief, identityCardNumber: "123456" }).success, false);
});
