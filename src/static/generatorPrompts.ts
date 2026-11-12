import type { SiteDocument } from "./sites";

function clean(value: string, limit = 220): string {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function clientContext(site: SiteDocument): string {
  const { identity, original } = site.content;
  const name = identity.displayName && identity.displayName !== "Nama klien"
    ? clean(identity.displayName, 80) : "[ISI NAMA KLIEN]";
  const job = identity.profession && identity.profession !== "Profesi"
    ? clean(identity.profession, 100) : "[ISI PROFESI KLIEN]";
  const profile = clean(identity.bio || original?.nama.description || "", 350);
  const career = original?.karir.items.map((x) => clean(x.value)).filter(Boolean).slice(0, 5).join("; ");
  const skills = original?.skill.items.map((x) => clean(x.value)).filter(Boolean).slice(0, 5).join("; ");
  const works = original?.karya.items.map((x) => clean(x.title)).filter(Boolean).slice(0, 3).join("; ");
  const products = original?.produk.items.map((x) => clean(x.title)).filter(Boolean).slice(0, 3).join("; ");
  return [
    "CLIENT NAME: " + name,
    "CLIENT PROFESSION: " + job,
    profile && "PROFILE CONTEXT: " + profile,
    career && "CAREER CONTEXT: " + career,
    skills && "SKILLS: " + skills,
    works && "WORKS: " + works,
    products && "PRODUCTS: " + products,
  ].filter(Boolean).join("\n");
}

export function hasClientPromptContext(site: SiteDocument): boolean {
  const { displayName, profession } = site.content.identity;
  return Boolean(displayName.trim() && displayName.trim() !== "Nama klien"
    && profession.trim() && profession.trim() !== "Profesi");
}

const imageMaster = [
  "REFERENCE PRIORITY:",
  "IMAGE 1 = PRIMARY REFERENCE FOR THE CLIENT'S FACE, BODY PROPORTIONS, AND ORIGINAL OUTFIT.",
  "IMAGE 2 = SECONDARY REFERENCE FOR CINEMATIC LIGHTING, CAMERA, ENVIRONMENT, AND VISUAL STYLE ONLY (if provided).",
  "If the references conflict, IMAGE 1 always wins for identity and clothing.",
  "",
  "GOAL:",
  "Create ONE photorealistic full-body cinematic image of the person in IMAGE 1, already walking confidently toward the viewer in the MIDDLE OF AN ACTIVE STEP. This is an action photograph, not a standing pose or a staged portrait.",
  "",
  "IDENTITY - HIGHEST PRIORITY:",
  "- Preserve the exact recognizable face from IMAGE 1: eyes, eyebrows, nose, lips, jawline, age appearance, skin tone, facial proportions, and natural details.",
  "- Preserve the original outfit, fabric, accessories, and body proportions from IMAGE 1. Do not replace clothing with a generic suit, uniform, or costume.",
  "- Never copy the person or outfit from IMAGE 2. Do not beautify, reshape the face, or replace it with a generic AI face.",
  "",
  "POSITION AND WALKING POSE:",
  "- The person is precisely CENTERED horizontally, fully visible from head to shoes, at a comfortable constant-looking scale in a wide 16:9 cinematic frame.",
  "- Capture a clear forward mid-stride step: one foot advancing, weight transfer visible, natural opposing arm swing, realistic grounded contact with the floor.",
  "- Camera directly in front of the subject at a natural height. No left/right offset, side view, extreme close-up, cropped shoes, or stationary pose.",
  "- Use a natural posture and facial expression appropriate to the CLIENT PROFESSION and profile context, without stereotypes or invented props.",
  "",
  "CINEMATIC DIRECTION:",
  "- Premium, realistic dark-studio atmosphere with a visible grounded floor, subtle depth, believable shadows and controlled cinematic lighting.",
  "- Use IMAGE 2 only as an aesthetic reference when available. Keep the client as the unmistakable main subject.",
  "- Realistic skin texture, hands, feet, fabric folds, physical balance, and clean photographic detail.",
  "",
  "AVOID:",
  "Face drift, changed identity, different clothes, extra limbs, stiff legs, floating feet, side placement, text, logos, watermarks, illustrations, cartoon effects, or an image that looks like the subject is simply standing still.",
  "",
  "FINAL RESULT: ONE photorealistic, center-framed, full-body image of the original client in an active walking step, ready to animate into a continuous video loop.",
].join("\n");

const videoMaster = [
  "INPUT REFERENCES:",
  "CLIENT IMAGE = PRIMARY REFERENCE FOR THE PERSON'S EXACT IDENTITY, ORIGINAL OUTFIT, AND INITIAL MID-STRIDE WALKING POSE.",
  "REFERENCE VIDEO = SECONDARY REFERENCE FOR CINEMATIC ATMOSPHERE, LIGHTING, STUDIO ENVIRONMENT, AND GENERAL WALKING CHARACTERISTICS (if supported).",
  "",
  "PRIORITY ORDER:",
  "1. Preserve the person and original outfit from CLIENT IMAGE.",
  "2. Create uninterrupted, continuously looping forward walking motion.",
  "3. Keep the camera FIXED and the character exactly CENTERED at a CONSTANT SCALE.",
  "4. Move the FLOOR in sync with the walking action so forward movement looks physically real, even though the subject stays centered.",
  "5. Adapt only the natural walking rhythm and facial expression to the CLIENT PROFESSION.",
  "6. Use REFERENCE VIDEO for cinematic appearance, never for replacing identity or copying stops/poses.",
  "",
  "START MOVING IMMEDIATELY:",
  "- Frame one is ALREADY IN MOTION, mid-stride. No initial standing, waiting, fade-in, pose, hesitation, or delayed start.",
  "- Continue walking throughout every frame. Never slow down, stop, turn, gesture to the camera, or pose near the end.",
  "- Maintain a natural forward gait toward the viewer, with believable weight transfer, continuous leg cycles, arm swing, foot planting, and fabric motion.",
  "",
  "MOVING FLOOR - ESSENTIAL:",
  "- The floor must visibly MOVE beneath the walking subject like a continuous treadmill belt. Floor texture, seams, highlights, reflections, and contact shadows progress backward in sync with the walking pace.",
  "- The floor CANNOT remain static while the person walks. Avoid skating, foot sliding, floating, or a mismatched floor speed.",
  "- Keep the feet physically grounded during contact, with plausible friction and step timing. Floor motion and gait must feel like one connected movement.",
  "",
  "CAMERA AND FRAME:",
  "- Locked camera, directly in front, eye-level cinematic perspective. No camera orbit, tracking, pan, zoom, push-in, shake, reframing, or focal-length changes.",
  "- Character stays precisely in the CENTER of a wide 16:9 landscape frame, same size and distance in every frame, full body visible from head to shoes.",
  "- Keep lighting, shadows, studio environment, original wardrobe, skin texture, and face stable over time.",
  "",
  "SEAMLESS LOOP:",
  "- Generate a truly periodic, uninterrupted walking cycle. Match the stride phase, body position, lighting, and floor texture motion at the end and beginning.",
  "- The last frame must transition naturally into the first without a jump, freeze, stop, reset, or visual teleport.",
  "- No dead frames, no still opening, and no slowdown at the ending.",
  "",
  "PROFESSION-ADAPTED PERFORMANCE:",
  "Use the CLIENT PROFESSION and profile context only to guide a natural, confident walking character and expression. Never invent a different outfit, uniform, tools, environment, facial features, credentials, or products.",
  "",
  "AVOID:",
  "Identity changes, face morphing, unrealistic hands or legs, background that stays frozen, static floor, sliding feet, wandering from center, camera motion, approaching the lens, stepping out of frame, cuts, titles, subtitles, logos, watermarks, or sound.",
  "",
  "FINAL RESULT: A photorealistic, centered, full-body walking video that starts mid-stride, remains in motion, features synchronized moving floor motion, and loops continuously without a visible beginning or end.",
].join("\n");

export function buildClientImagePrompt(site: SiteDocument): string {
  return ["NAMINA.PRO - CINEMATIC ACTIVE WALKING PORTRAIT", "",
    "CLIENT DATA (use as context; never invent personal facts):",
    clientContext(site), "", imageMaster].join("\n");
}

export function buildClientVideoPrompt(site: SiteDocument): string {
  return ["NAMINA.PRO - INFINITE CINEMATIC WALKING LOOP", "",
    "CLIENT DATA (use as context; never invent personal facts):",
    clientContext(site), "", videoMaster].join("\n");
}

export function whatsAppNumberFromLink(link: string): string {
  const match = /^https:\/\/wa\.me\/(\d+)/.exec(link);
  const digits = match ? match[1] : link.replace(/\D/g, "");
  return digits.startsWith("62") ? "0" + digits.slice(2) : digits;
}

export function whatsAppLinkFromNumber(input: string, previous = ""): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  const number = digits.startsWith("0") ? "62" + digits.slice(1)
    : digits.startsWith("8") ? "62" + digits : digits;
  const oldQuery = /^https:\/\/wa\.me\/\d+\?/.test(previous) ? new URL(previous).search : "";
  return "https://wa.me/" + number + oldQuery;
}
