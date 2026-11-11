# Design QA — Square ENTER Keycap

Date: 2026-11-08
Result: **passed**

- Desktop (1920 px): photorealistic square black keycap on the left of the name; button is 200 × 200 px and its top aligns within 2 px of the 210 px-high two-line heading.
- Tablet (820 px): responsive square control retains the name/title hierarchy.
- Mobile (390 px): 74 × 74 px keycap; heading remains legible, character video stays visible, and no horizontal overflow is present.
- Interaction: ENTER remains a working button, advances card content, and retains keyboard focus styling.
- Drop physics: one incoming card per press; its 2.35-second flight hits the reading surface, rebounds three times with decreasing height, then settles. The old three miniature card trails were removed.
- Floor feedback: an elliptical contact shadow intensifies at each bounce; outgoing cards quietly fade rather than appearing as a second falling card.
- Completion: the flying layer is removed at animation end and ENTER is enabled again; verified on desktop and mobile (390 px), including the mobile-specific bounce keyframes.
- Background: autoplay cinematic video is not obscured and remains playing after ENTER is clicked.
- Accessibility: button has a descriptive `aria-label`; imagery inside is decorative.
- Verification: TypeScript typecheck, Vite production build, and all 24 automated tests passed. Inspected deployment preview on desktop and mobile.

Bounce preview verified: https://namana-l4dszifbi-jualdigital.vercel.app/vini

---

# NAMINA /vini — Design QA

Date: 2026-11-10

## Reference and scope

- Visual reference: `../NAMINA-PC-Redesign-Konsep.png` (desktop concept selected by Teh Vini).
- Implemented route: `/vini` only. Other client routes, Studio, and demo styles retain their existing renderer.
- Key requested change: the ENTER action is gone; published identity data advances automatically in a repeating slide sequence.

## Desktop visual review (1363 × 935 browser viewport)

| Check | Outcome |
| --- | --- |
| Dark charcoal / NAMINA red palette | PASS — reused official brand logo and accent. |
| Large left-aligned name and profession | PASS — content remains clear against the gradient. |
| Existing moving client video on the right | PASS — Dropbox video played successfully in the local browser preview, muted and looping. |
| Header/nav, contact action and footer specialties | PASS — visible without obscuring the main title. |
| Identity slide content | PASS — two items per desktop slide with full descriptions, not ellipsis-truncated. |
| Visual comparison with concept | PASS with an intentional addition: the rotating information panel lives between the hero introduction and CTAs. The hero uses the real existing video rather than the concept's static image. |

## Behavior and content review

| Check | Outcome |
| --- | --- |
| No ENTER button or click gate | PASS. |
| Automatically advances | PASS — observed multiple slide changes in browser. |
| Repeats after last slide | PASS — the last slide returns to slide 01. |
| Pause/resume and previous/next controls | PASS — clicked in browser; pause switched to resume state. |
| Section navigation | PASS — sections have direct slide targets. |
| Content integrity | PASS — each `visible` card is included once; non-public cards remain hidden. |
| Accessibility | PASS — landmark/nav labels, semantic buttons, visible focus and reduced-motion preference. |
| Mobile viewport | Responsive breakpoints and single-item slides implemented; direct mobile-width screenshot was not available in this browser session. |

## Verification

- `npm run build`: PASS.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS, one pre-existing warning in `IdentityFlip.tsx` (not on `/vini`).
- `node --import tsx --test tests/*.test.ts`: PASS.

Delivery gate: **PASS for requested desktop implementation**, with mobile-specific visual review deferred until a mobile viewport is available.
