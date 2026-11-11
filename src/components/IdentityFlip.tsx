import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import "../identity-flip.css";
import "../identity-text-mode.css";
import type { AssetUrls, Selection, SiteContent } from "../domain/content";
import { originalProfileTabs, type ProfileCard, type ProfileIcon } from "../static/originalProfileTabs";
import { NaminaIntroStage } from "./NaminaLogo";

type Phase = "welcome" | "hero";
type ShuffleStage = "rest" | "fan" | "close" | "tuck";
type WalletMotion = "rest" | "exchanging" | "drawing";
const MOTION_OPT_IN_KEY = "namana:wallet-motion-opt-in";
const documentAccents = [
  "#ef694e",
  "#e6b65a",
  "#a4a3f0",
  "#67b5d6",
  "#7dca95",
  "#e4a2c5",
];

type EditableField =
  | "identity.brandLabel"
  | "identity.introLabel"
  | "identity.displayName"
  | "identity.profession"
  | "identity.bio"
  | `card:${string}:title`
  | `card:${string}:subtitle`
  | `card:${string}:description`
  | `card:${string}:linkLabel`;

function EditableText({
  as,
  className,
  value,
  field,
  selection,
  editMode,
  onEditText,
}: {
  as: "span" | "h2" | "p";
  className?: string;
  value: string;
  field: EditableField;
  selection: Selection;
  editMode: boolean;
  onEditText?: (field: EditableField, value: string) => void;
}) {
  const node = useRef<HTMLElement>(null);
  useEffect(() => {
    if (node.current && document.activeElement !== node.current)
      node.current.textContent = value;
  }, [value]);
  return createElement(
    as,
    {
      ref: node,
      className,
      "data-edit": selection,
      "data-edit-field": field,
      contentEditable: editMode,
      suppressContentEditableWarning: true,
      role: editMode ? "textbox" : undefined,
      tabIndex: editMode ? 0 : undefined,
      "aria-label": editMode ? `Edit ${field.split(":").at(-1)?.split(".").at(-1)}` : undefined,
      onPointerDown: editMode ? (event: React.PointerEvent) => event.stopPropagation() : undefined,
      onClick: editMode ? (event: React.MouseEvent) => event.stopPropagation() : undefined,
      onKeyDown: editMode
        ? (event: React.KeyboardEvent) => {
            if (event.key === "Escape") {
              event.currentTarget.textContent = value;
              (event.currentTarget as HTMLElement).blur();
            } else if (event.key === "Enter" && field !== "identity.bio" && !field.endsWith(":description")) {
              event.preventDefault();
              (event.currentTarget as HTMLElement).blur();
            }
            event.stopPropagation();
          }
        : undefined,
      onBlur: editMode
        ? (event: React.FocusEvent<HTMLElement>) => {
            const next = (event.currentTarget.textContent || "").replace(/\u00a0/g, " ").trim();
            if (next !== value && (next || !field.endsWith(":title") && field !== "identity.displayName"))
              onEditText?.(field, next);
            else event.currentTarget.textContent = value;
          }
        : undefined,
    },
    value,
  );
}

function ProfileGlyph({ name }: { name: ProfileIcon }) {
  const symbols = {
    person: (
      <>
        <circle cx="16" cy="10" r="4.5" />
        <path d="M6.5 26v-2.5c0-5 4-8 9.5-8s9.5 3 9.5 8V26" />
      </>
    ),
    pin: (
      <>
        <path d="M25 13c0 7-9 14-9 14S7 20 7 13a9 9 0 1 1 18 0Z" />
        <circle cx="16" cy="13" r="3" />
      </>
    ),
    home: (
      <>
        <path d="m4 14 12-9 12 9M7 13v14h18V13" />
        <path d="M13 27v-9h6v9" />
      </>
    ),
    book: (
      <>
        <path d="M16 27c-3-2-7-2.5-12-2V6c5-.5 9 0 12 2 3-2 7-2.5 12-2v18.5c-5-.5-9 0-12 2.5Z" />
        <path d="M16 8v19M8 12h4M20 12h4" />
      </>
    ),
    image: (
      <>
        <rect x="4" y="6" width="24" height="20" rx="2" />
        <circle cx="11" cy="12" r="2" />
        <path d="m5 23 7-7 5 5 4-4 6 6" />
      </>
    ),
    palette: (
      <>
        <path d="M16 4C9 4 4 9 4 16s5 12 12 12c2.5 0 4-2 3-4-.5-1.5 0-3 2-3h2c3 0 5-2.5 5-5C28 9 22 4 16 4Z" />
        <circle cx="10" cy="14" r="1.4" />
        <circle cx="15" cy="9" r="1.4" />
        <circle cx="21" cy="12" r="1.4" />
        <circle cx="10.5" cy="20" r="1.4" />
      </>
    ),
    compass: (
      <>
        <circle cx="16" cy="16" r="11" />
        <path d="m20 12-3 7-5 1 3-7 5-1Z" />
        <path d="M16 3v2M16 27v2M3 16h2M27 16h2" />
      </>
    ),
    chat: (
      <>
        <path d="M6 7h20v15H13l-7 5V7Z" />
        <path d="M10 13h12M10 17h8" />
      </>
    ),
    screens: (
      <>
        <rect x="3" y="6" width="19" height="16" rx="2" />
        <path d="M7 26h13M12.5 22v4" />
        <rect x="23" y="13" width="6" height="14" rx="1.5" />
      </>
    ),
    building: (
      <>
        <path d="M7 27V5h15v22M22 13h4v14M4 27h24" />
        <path d="M11 10h2M17 10h2M11 15h2M17 15h2M11 20h2M17 20h2" />
      </>
    ),
    flag: (
      <>
        <path d="M7 28V5M7 6c4-3 7 3 11 0s6 0 8 1v13c-4-2-6-4-10-1s-6-2-9 0" />
      </>
    ),
    mentor: (
      <>
        <circle cx="12" cy="10" r="4" />
        <path d="M4 26v-3c0-4 3-7 8-7s8 3 8 7v3" />
        <path d="M22 6h6v9h-6l-3 3V9c0-2 1-3 3-3Z" />
      </>
    ),
    website: (
      <>
        <rect x="3" y="6" width="26" height="20" rx="2" />
        <path d="M3 12h26M7 9h.5M11 9h.5M8 18h8M8 22h13" />
      </>
    ),
    pencil: (
      <>
        <path d="M7 4h14l4 4v18H7V4Z" />
        <path d="M20 4v5h5M11 14h9M11 18h7M11 22h4" />
        <path d="m18 25 8-8 2 2-8 8-4 1 2-3Z" />
      </>
    ),
    class: (
      <>
        <rect x="4" y="5" width="24" height="18" rx="2" />
        <path d="m14 10 7 4-7 4v-8ZM10 27h12M16 23v4" />
      </>
    ),
    certificate: (
      <>
        <rect x="6" y="4" width="20" height="19" rx="2" />
        <path d="M10 9h12M10 13h9M10 17h6" />
        <circle cx="22" cy="22" r="5" />
        <path d="m19 26-1 4 4-2 4 2-1-4" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {symbols[name]}
    </svg>
  );
}

function cardPosition(offset: number, compact: boolean, fanned = false) {
  const depth = Math.max(0, offset);
  if (depth === 0) {
    return {
      x: 0,
      y: 0,
      z: fanned ? 110 : 88,
      rotateX: fanned ? -4 : -1,
      rotateY: fanned ? -7 : 0,
      rotateZ: fanned ? -2 : 0,
      scale: 1,
      opacity: 1,
    };
  }

  return {
    // Fan outward in actual 3D space, then return to a readable, physical stack.
    x: depth * (compact ? 7 : 120) + (fanned ? depth * (compact ? 8 : 20) : 0),
    y: depth * (compact ? 61 : 5) + (fanned ? depth * (compact ? 16 : -11) : 0),
    z: -depth * (compact ? 5 : 15) + (fanned ? depth * 18 : 0),
    rotateX: depth * (fanned ? 3.5 : 0.7),
    rotateY: -depth * (fanned ? 9 : 3),
    rotateZ: depth * (fanned ? (compact ? 2.4 : -2.8) : 0.4),
    scale: 1 - depth * (fanned ? 0.006 : 0.012),
    opacity: 1 - depth * 0.12,
  };
}

const CARD_SPRING = {
  type: "spring" as const,
  stiffness: 190,
  damping: 27,
  mass: 1.08,
  restSpeed: 0.02,
  restDelta: 0.02,
};

function walletCardOrigin(compact: boolean) {
  return {
    x: compact ? 0 : -310,
    y: compact ? -220 : 25,
    z: 105,
    rotateX: -8,
    rotateY: -30,
    rotateZ: compact ? -6 : 9,
    scale: compact ? 0.31 : 0.39,
    opacity: 0.75,
  };
}

const CARD_EXIT = {
  exit: ({ compact }: { compact: boolean }) => ({
    x: compact ? [0, 0, 0] : [0, -115, -310],
    y: compact ? [0, -105, -220] : [0, 4, 25],
    z: [88, -90, -220],
    rotateX: [-1, 8, 14],
    rotateY: [0, 23, 34],
    rotateZ: [0, compact ? 5 : -5, compact ? 9 : -11],
    scale: [1, 0.7, compact ? 0.28 : 0.33],
    opacity: [1, 0.85, 0.42],
    zIndex: 4,
    transition: {
      duration: 0.88,
      times: [0, 0.48, 1],
      ease: [0.42, 0, 0.62, 1] as [number, number, number, number],
    },
  }),
};

function SwipeProfileCard({
  item,
  index,
  offset,
  compact,
  shuffleStage,
  fromWallet,
  exchangeFront,
  onSwipe,
  onSelect,
  totalCards,
  minimal = false,
  editMode = false,
  onEditText,
}: {
  item: ProfileCard;
  index: number;
  totalCards: number;
  minimal?: boolean;
  offset: number;
  compact: boolean;
  shuffleStage: ShuffleStage;
  fromWallet: boolean;
  exchangeFront: boolean;
  onSwipe: (direction: -1 | 1) => void;
  onSelect: (index: number) => void;
  editMode?: boolean;
  onEditText?: (field: EditableField, value: string) => void;
}) {
  const active = offset === 0;
  const reduceMotion = useReducedMotion() || minimal;
  const dragX = useMotionValue(0);
  const dragTilt = useTransform(dragX, [-280, 0, 280], [-21, 0, 21]);
  const leftStamp = useTransform(dragX, [-150, -42, 0], [1, 0, 0]);
  const rightStamp = useTransform(dragX, [0, 42, 150], [0, 0, 1]);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const gestureNavigated = useRef(false);

  return (
    <motion.article
      data-edit={item.id ? `card:${item.id}` : undefined}
      className={`cinematic-hero__card cinematic-hero__document${active ? " cinematic-hero__card--active" : " cinematic-hero__card--next"}${item.kind ? ` cinematic-hero__card--${item.kind}` : ""}${item.label.length > 10 ? " cinematic-hero__card--long-title" : ""}`}
      initial={
        reduceMotion
          ? false
          : fromWallet
            ? walletCardOrigin(compact)
            : cardPosition(Math.max(offset, 1), compact)
      }
      animate={cardPosition(offset, compact, shuffleStage === "fan")}
      exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : "exit"}
      variants={CARD_EXIT}
      transition={
        reduceMotion
          ? { duration: 0 }
          : fromWallet
            ? {
                type: "spring",
                stiffness: 125,
                damping: 23,
                mass: 1.05,
                delay: exchangeFront ? 0.16 : 0,
              }
            : CARD_SPRING
      }
      style={
        {
          zIndex: active ? 24 : 12 - offset,
          pointerEvents: active || offset < 3 ? "auto" : "none",
          "--document-accent":
            item.color || documentAccents[index % documentAccents.length],
        } as CSSProperties
      }
      aria-label={`Dokumen ${item.label}, ${index + 1} dari ${totalCards}`}
    >
      <motion.div
        className="cinematic-hero__card-swipe"
        drag={active && !editMode ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.95}
        dragMomentum={false}
        style={{ x: dragX, rotateZ: dragTilt, touchAction: "pan-y" }}
        whileDrag={{ scale: 1.025, cursor: "grabbing" }}
        onPointerDown={(event) => {
          if (!active) return;
          pointerStart.current = { x: event.clientX, y: event.clientY };
          suppressClick.current = false;
          gestureNavigated.current = false;
        }}
        onPointerUp={(event) => {
          const start = pointerStart.current;
          pointerStart.current = null;
          if (!active || !start || gestureNavigated.current) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          suppressClick.current = Math.hypot(dx, dy) > 12;
          if (
            Math.abs(dx) >= (compact ? 52 : 78) &&
            Math.abs(dx) > Math.abs(dy) * 1.1
          ) {
            gestureNavigated.current = true;
            onSwipe(dx > 0 ? 1 : -1);
          }
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
          suppressClick.current = true;
        }}
        onDragEnd={(_event, info) => {
          if (!active || gestureNavigated.current) return;
          if (
            Math.abs(info.offset.x) >= (compact ? 52 : 78) ||
            Math.abs(info.velocity.x) > 650
          ) {
            gestureNavigated.current = true;
            suppressClick.current = true;
            const direction =
              Math.abs(info.offset.x) > 12 ? info.offset.x : info.velocity.x;
            onSwipe(direction > 0 ? 1 : -1);
          }
        }}
        onClick={(event) => {
          if (!active || suppressClick.current || gestureNavigated.current)
            return;
          if ((event.target as HTMLElement).closest("a, button")) return;
          if (!editMode) onSwipe(-1);
        }}
      >
        {active && (
          <>
            <motion.span
              className="cinematic-hero__swipe-stamp cinematic-hero__swipe-stamp--left"
              style={{ opacity: leftStamp }}
              aria-hidden="true"
            >
              BERIKUTNYA
            </motion.span>
            <motion.span
              className="cinematic-hero__swipe-stamp cinematic-hero__swipe-stamp--right"
              style={{ opacity: rightStamp }}
              aria-hidden="true"
            >
              SEBELUMNYA
            </motion.span>
          </>
        )}
        {!active && (
          <button
            type="button"
            className="cinematic-hero__card-trigger"
            aria-label={`Buka kartu ${item.label}`}
            onClick={() => onSelect(index)}
          >
            <span className="cinematic-hero__card-eyebrow">NAMINA</span>
            <span className="cinematic-hero__card-chip" aria-hidden="true" />
            <strong>{item.label}</strong>
          </button>
        )}
        {active && (
          <div className="cinematic-hero__card-body">
            {item.id ? (
              <EditableText as="h2" className="cinematic-hero__document-title" value={item.label} field={`card:${item.id}:title`} selection={`card:${item.id}`} editMode={editMode} onEditText={onEditText} />
            ) : <h2 className="cinematic-hero__document-title">{item.label}</h2>}
            <div className="cinematic-hero__story" key={item.label}>
              <span className="cinematic-hero__story-icon" data-edit={item.id ? `card:${item.id}` : undefined} data-edit-media={item.id ? `card:${item.id}` : undefined} aria-hidden="true">
                <img
                  className="cinematic-hero__flaticon"
                  src={
                    item.imageUrl || `/animated-icons/${item.animatedIcon}.webp`
                  }
                  width={64}
                  height={64}
                  alt=""
                  decoding="async"
                />
                {item.brandIcon ? (
                  <span
                    className={`cinematic-hero__social-icon cinematic-hero__story-brand cinematic-hero__social-icon--${item.brandIcon}`}
                  />
                ) : item.icon ? (
                  <span className="cinematic-hero__story-static">
                    <ProfileGlyph name={item.icon} />
                  </span>
                ) : null}
              </span>
              {item.id ? (
                <EditableText as="p" className="cinematic-hero__story-value" value={item.value} field={`card:${item.id}:subtitle`} selection={`card:${item.id}`} editMode={editMode} onEditText={onEditText} />
              ) : <p className="cinematic-hero__story-value">{item.value}</p>}
              {item.id ? (
                <EditableText as="p" className="cinematic-hero__story-copy" value={item.story} field={`card:${item.id}:description`} selection={`card:${item.id}`} editMode={editMode} onEditText={onEditText} />
              ) : <p className="cinematic-hero__story-copy">{item.story}</p>}
              {(item.kind === "social" || item.url) &&
                (item.url ? (
                  editMode && item.id ? (
                    <EditableText as="span" className="cinematic-hero__story-link" value={item.linkLabel || `Buka ${item.label}`} field={`card:${item.id}:linkLabel`} selection={`card:${item.id}`} editMode onEditText={onEditText} />
                  ) : (
                    <a
                      className="cinematic-hero__story-link"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Buka tautan ${item.label}`}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      {item.linkLabel || `Buka ${item.label}`}
                    </a>
                  )
                ) : (
                  <span className="cinematic-hero__story-unlinked">
                    Tautan akun belum ditambahkan
                  </span>
                ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.article>
  );
}

function FlyingDocument({
  item,
  index,
  direction,
  exchanging,
  onDrawComplete,
}: {
  item: ProfileCard;
  index: number;
  direction: "in" | "out";
  exchanging: boolean;
  onDrawComplete?: () => void;
}) {
  return (
    <div
      className={`cinematic-hero__flight-sheet cinematic-hero__flight-sheet--${direction}${exchanging ? " cinematic-hero__flight-sheet--exchange" : ""} cinematic-hero__document`}
      style={
        {
          "--document-accent":
            item.color || documentAccents[index % documentAccents.length],
        } as CSSProperties
      }
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (
          direction === "in" &&
          event.target === event.currentTarget &&
          (event.animationName === "cinematic-paper-draw" ||
            event.animationName === "cinematic-enter-card-drop-bounce")
        ) {
          onDrawComplete?.();
        }
      }}
    >
      <div className="cinematic-hero__card-swipe">
        <div className="cinematic-hero__card-body">
          <h2 className="cinematic-hero__document-title">{item.label}</h2>
          <div className="cinematic-hero__story">
            <span className="cinematic-hero__story-icon">
              <img
                className="cinematic-hero__flaticon"
                src={
                  item.imageUrl || `/animated-icons/${item.animatedIcon}.webp`
                }
                width={64}
                height={64}
                alt=""
              />
            </span>
            <p className="cinematic-hero__story-value">{item.value}</p>
            <p className="cinematic-hero__story-copy">{item.story}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A physical Enter key is the single trigger for the card cascade. */
export function EnterKeycap({
  pressed,
  inactive,
  firstActivation,
  nextCard,
  onEnter,
  imageSrc,
  editMode,
  textMode = false,
}: {
  pressed: boolean;
  inactive: boolean;
  firstActivation: boolean;
  nextCard: string;
  onEnter: () => void;
  imageSrc: string;
  editMode: boolean;
  textMode?: boolean;
}) {
  return (
    <button
      type="button"
      data-edit={editMode ? "theme" : undefined}
      data-edit-media={editMode ? "enterKey" : undefined}
      className={`cinematic-hero__enter-key${pressed ? " cinematic-hero__enter-key--pressed" : ""}`}
      aria-label={textMode ? `ENTER, tampilkan cerita ${nextCard}` : firstActivation ? `Aktifkan animasi dan tampilkan kartu ${nextCard}` : `ENTER, tampilkan kartu ${nextCard}`}
      title={textMode ? "Tampilkan cerita berikutnya" : firstActivation ? "Aktifkan animasi kartu" : "Tekan ENTER untuk menjatuhkan kartu berikutnya"}
      onClick={onEnter}
      disabled={inactive}
    >
      <img src={imageSrc} alt="" width={512} height={512} fetchPriority="high" draggable={false} />
      <span className="cinematic-hero__sr-only">{textMode ? "Tampilkan cerita" : firstActivation ? "Aktifkan gerakan kartu" : "Keluarkan kartu"}</span>
    </button>
  );
}

/** The same profile data, presented as an editorial story instead of a physical card. */
function TextProfileStory({
  items,
  page,
  pageSize,
  editMode,
  reduceMotion,
  onEditText,
}: {
  items: ProfileCard[];
  page: number;
  pageSize: number;
  editMode: boolean;
  reduceMotion: boolean;
  onEditText?: (field: EditableField, value: string) => void;
}) {
  const visibleItems = items.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <section className="namana-text-story" aria-label="Cerita Teh Vini">
      <AnimatePresence mode="wait" initial={false}>
        {page < 0 ? (
          <motion.div
            key="invite"
            className="namana-text-story__invite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="namana-text-story__overline">Kenali lebih dekat</span>
            <p>Tekan ENTER untuk membaca ceritaku.</p>
          </motion.div>
        ) : (
          <motion.div
            key={`story-${page}-${pageSize}`}
            className="namana-text-story__chapter"
            initial={reduceMotion ? false : { opacity: 0, y: 26, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -20, filter: "blur(3px)" }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="namana-text-story__entries">
              {visibleItems.map((item, index) => (
                <motion.article
                  key={item.id || item.label}
                  className="namana-text-story__entry"
                  data-edit={item.id ? `card:${item.id}` : undefined}
                  initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduceMotion ? 0 : index * 0.12, duration: reduceMotion ? 0 : 0.42 }}
                >
                  <div className="namana-text-story__topline">
                    <span className="namana-text-story__icon" data-edit-media={item.id ? `card:${item.id}` : undefined} aria-hidden="true">
                      <img
                        src={item.imageUrl || `/animated-icons/${item.animatedIcon}.webp`}
                        alt=""
                        width={54}
                        height={54}
                        decoding="async"
                      />
                      {item.icon && <span className="namana-text-story__static-glyph"><ProfileGlyph name={item.icon} /></span>}
                    </span>
                    <div className="namana-text-story__copy">
                      {editMode && item.id && (
                        <EditableText as="span" className="namana-text-story__label" value={item.label} field={`card:${item.id}:title`} selection={`card:${item.id}`} editMode={editMode} onEditText={onEditText} />
                      )}
                      {item.id ? (
                        <EditableText as="h2" className="namana-text-story__value" value={item.value} field={`card:${item.id}:subtitle`} selection={`card:${item.id}`} editMode={editMode} onEditText={onEditText} />
                      ) : (
                        <h2 className="namana-text-story__value">{item.value}</h2>
                      )}
                    </div>
                  </div>
                  {item.id ? (
                    <EditableText as="p" className="namana-text-story__description" value={item.story} field={`card:${item.id}:description`} selection={`card:${item.id}`} editMode={editMode} onEditText={onEditText} />
                  ) : (
                    <p className="namana-text-story__description">{item.story}</p>
                  )}
                  {item.url && (
                    editMode && item.id ? (
                      <EditableText as="span" className="namana-text-story__external" value={item.linkLabel || `Buka ${item.label}`} field={`card:${item.id}:linkLabel`} selection={`card:${item.id}`} editMode onEditText={onEditText} />
                    ) : (
                      <a className="namana-text-story__external" href={item.url} target="_blank" rel="noopener noreferrer">{item.linkLabel || `Buka ${item.label}`}</a>
                    )
                  )}
                </motion.article>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function IdentityFlip({
  content,
  assetUrls = {},
  editMode = false,
  onSelect,
  startOpen = false,
  selectedCardId,
  onEditText,
  textMode = false,
  introStartedAt,
}: {
  content?: SiteContent;
  assetUrls?: AssetUrls;
  editMode?: boolean;
  onSelect?: (selection: Selection) => void;
  startOpen?: boolean;
  selectedCardId?: string;
  onEditText?: (field: EditableField, value: string) => void;
  textMode?: boolean;
  introStartedAt?: number;
}) {
  const profileTabs: ProfileCard[] = content
    ? content.cards
        .filter((c) => c.visible)
        .map((c) => ({
          id: c.id,
          label: c.title,
          value: c.subtitle,
          story: c.description,
          animatedIcon: c.animatedIcon || 8121295,
          icon: c.icon,
          brandIcon: c.brandIcon,
          kind: c.kind || (c.link ? "social" : undefined),
          url: c.link,
          linkLabel: c.linkLabel,
          owner: content.identity.displayName,
          color: c.color,
          imageUrl: c.imageAssetId ? assetUrls[c.imageAssetId] : undefined,
        }))
    : originalProfileTabs;
  const totalCards = profileTabs.length;
  const [phase, setPhase] = useState<Phase>(startOpen ? "hero" : "welcome");
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [enterPending, setEnterPending] = useState(false);
  const [introElapsed, setIntroElapsed] = useState(() => Boolean(introStartedAt && Date.now() - introStartedAt >= 5000));
  const [introTimedOut, setIntroTimedOut] = useState(() => Boolean(introStartedAt && Date.now() - introStartedAt >= 12000));
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroHeading = useRef<HTMLHeadingElement>(null);
  const heroStage = useRef<HTMLElement>(null);
  const lastWheelAt = useRef(0);
  const wheelDelta = useRef(0);
  const lastWheelEventAt = useRef(0);
  const [activeTab, setActiveTab] = useState(-1);
  const [outgoingTab, setOutgoingTab] = useState<number | null>(null);
  const [walletMotion, setWalletMotion] = useState<WalletMotion>("rest");
  const deviceReducedMotion = Boolean(useReducedMotion());
  const [motionOptIn, setMotionOptIn] = useState(() => {
    try {
      return window.localStorage.getItem(MOTION_OPT_IN_KEY) === "yes";
    } catch {
      return false;
    }
  });
  const needsMotionOptIn =
    !textMode && deviceReducedMotion && !motionOptIn && content?.wallet.animationPreset !== "minimal";
  const reduceMotion =
    (deviceReducedMotion && !motionOptIn) ||
    content?.wallet.animationPreset === "minimal";
  const [compactDeck, setCompactDeck] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(textMode ? "(max-width: 900px)" : "(max-width: 600px)").matches,
  );
  const storyPageSize = compactDeck ? 1 : 3;
  const totalStoryPages = Math.ceil(totalCards / storyPageSize);
  const videoUrl = content
    ? assetUrls[
        (compactDeck && content.background.mobileVideoAssetId) ||
          content.background.desktopVideoAssetId ||
          ""
      ]
    : "/videos/hero.mp4";

  useEffect(() => {
    if (!editMode || !content) return;
    const index = content.cards
      .filter((c) => c.visible)
      .findIndex((c) => c.id === selectedCardId);
    if (index >= 0) {
      setActiveTab(textMode ? Math.floor(index / storyPageSize) : index);
      setWalletMotion("rest");
      setOutgoingTab(null);
    } else if (activeTab !== 0 && content.cards.some((c) => c.visible)) {
      setActiveTab(0);
    }
  }, [selectedCardId, editMode, content, activeTab, textMode, storyPageSize]);

  useEffect(() => {
    const media = window.matchMedia(textMode ? "(max-width: 900px)" : "(max-width: 600px)");
    const onChange = () => setCompactDeck(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [textMode]);

  useEffect(() => {
    if (!textMode) return;
    setActiveTab((current) => current >= totalStoryPages ? totalStoryPages - 1 : current);
  }, [textMode, totalStoryPages]);

  useEffect(() => {
    setVideoFailed(false);
    setVideoReady(false);
  }, [videoUrl]);

  // WELCOME is the loading screen. Decode one persistent video under it.
  useEffect(() => {
    if (textMode && enterPending && videoReady) {
      setPhase("hero");
      setEnterPending(false);
    }
  }, [textMode, enterPending, videoReady]);

  // The logo is a five-second intro, not a fake measure of video download bytes.
  useEffect(() => {
    if (!textMode || phase !== "welcome" || !introStartedAt) return;
    setIntroElapsed(false);
    setIntroTimedOut(false);
    const elapsed = Date.now() - introStartedAt;
    const introTimer = window.setTimeout(() => setIntroElapsed(true), Math.max(0, 5000 - elapsed));
    const fallbackTimer = window.setTimeout(() => setIntroTimedOut(true), Math.max(0, 12000 - elapsed));
    return () => {
      window.clearTimeout(introTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [textMode, phase, introStartedAt]);

  useEffect(() => {
    if (textMode && phase === "welcome" && introStartedAt && introElapsed && (videoReady || videoFailed || introTimedOut)) {
      setPhase("hero");
    }
  }, [textMode, phase, introStartedAt, introElapsed, videoReady, videoFailed, introTimedOut]);

  const finishWalletMotion = useCallback(() => {
    setWalletMotion("rest");
    setOutgoingTab(null);
  }, []);

  useEffect(() => {
    if (walletMotion !== "drawing" && walletMotion !== "exchanging") return;
    if (reduceMotion) {
      finishWalletMotion();
      return;
    }

    // The incoming sheet ends the exchange. This is only a backup if the
    // browser drops the animationend event while the tab is backgrounded.
    const timer = window.setTimeout(finishWalletMotion, 2900);
    return () => window.clearTimeout(timer);
  }, [walletMotion, reduceMotion, finishWalletMotion]);

  useEffect(() => {
    if ((phase !== "hero" && !textMode) || videoFailed) return;
    if (phase === "hero") heroHeading.current?.focus({ preventScroll: true });
    const video = videoRef.current;
    if (!video) return;

    // Keep the background silent and inline so mobile browsers permit autoplay.
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;

    const resumeVideo = () => {
      if (document.visibilityState !== "visible") return;
      void video.play().catch(() => {
        // Browser-level autoplay restrictions cannot be overridden by the page.
      });
    };

    resumeVideo();
    video.addEventListener("canplay", resumeVideo);
    window.addEventListener("pageshow", resumeVideo);
    document.addEventListener("visibilitychange", resumeVideo);
    return () => {
      video.removeEventListener("canplay", resumeVideo);
      window.removeEventListener("pageshow", resumeVideo);
      document.removeEventListener("visibilitychange", resumeVideo);
    };
  }, [
    phase,
    videoFailed,
    videoUrl,
  ]);

  const enterExperience = () => {
    if (phase !== "welcome") return;
    if (textMode && videoFailed) {
      setVideoFailed(false);
      setVideoReady(false);
      setEnterPending(true);
      return;
    }
    if (textMode && !videoReady) {
      setEnterPending(true);
      return;
    }
    setPhase("hero");
  };

  const requestCard = useCallback(
    (nextIndex: number) => {
      if (totalCards === 0 || walletMotion !== "rest" || nextIndex === activeTab) return;
      if (reduceMotion) {
        setActiveTab(nextIndex);
        setOutgoingTab(null);
        return;
      }
      if (activeTab < 0) {
        setOutgoingTab(null);
        setActiveTab(nextIndex);
        setWalletMotion("drawing");
        return;
      }

      // Keep both document faces visible throughout their overlapping flight paths.
      setOutgoingTab(activeTab);
      setWalletMotion("exchanging");
      setActiveTab(nextIndex);
    },
    [activeTab, walletMotion, reduceMotion, totalCards],
  );

  const navigateCards = useCallback(
    (direction: -1 | 1) => {
      if (activeTab < 0) return;
      if (textMode) {
        setActiveTab((activeTab + direction + totalStoryPages) % totalStoryPages);
        return;
      }
      requestCard((activeTab + direction + totalCards) % totalCards);
    },
    [activeTab, requestCard, totalCards, textMode, totalStoryPages],
  );

  const swipeCard = (direction: -1 | 1) => {
    if (activeTab >= 0)
      requestCard(
        (activeTab + (direction === -1 ? 1 : -1) + totalCards) % totalCards,
      );
  };

  const triggerEnter = useCallback(() => {
    if (totalCards === 0 || walletMotion !== "rest") return;
    if (textMode) {
      setActiveTab((current) => (current + 1) % totalStoryPages);
      return;
    }
    const nextIndex = (activeTab + 1) % totalCards;
    if (needsMotionOptIn) {
      try {
        window.localStorage.setItem(MOTION_OPT_IN_KEY, "yes");
      } catch {
        // The animation still works for this visit if storage is unavailable.
      }
      setMotionOptIn(true);
      setOutgoingTab(activeTab >= 0 ? activeTab : null);
      setWalletMotion(activeTab >= 0 ? "exchanging" : "drawing");
      setActiveTab(nextIndex);
      return;
    }
    requestCard(nextIndex);
  }, [activeTab, needsMotionOptIn, requestCard, totalCards, walletMotion, textMode, totalStoryPages]);

  useEffect(() => {
    const stage = heroStage.current;
    if (phase !== "hero" || !stage || editMode) return;

    const handleWheel = (event: globalThis.WheelEvent) => {
      const primaryDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (Math.abs(primaryDelta) < 1 || walletMotion !== "rest" || totalCards === 0) return;

      // Scrolling also browses the cards; touch devices keep native scrolling.
      if (!compactDeck) event.preventDefault();
      const now = Date.now();
      if (now - lastWheelEventAt.current > 220) wheelDelta.current = 0;
      lastWheelEventAt.current = now;
      if (now - lastWheelAt.current < 750) {
        wheelDelta.current = 0;
        return;
      }

      const pixels =
        event.deltaMode === 1
          ? primaryDelta * 16
          : event.deltaMode === 2
            ? primaryDelta * window.innerHeight
            : primaryDelta;
      wheelDelta.current += pixels;
      if (Math.abs(wheelDelta.current) < 36) return;

      const direction = wheelDelta.current > 0 ? 1 : -1;
      lastWheelAt.current = now;
      wheelDelta.current = 0;
      if (activeTab < 0) triggerEnter();
      else navigateCards(direction);
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [phase, editMode, navigateCards, triggerEnter, activeTab, walletMotion, totalCards, compactDeck]);

  return (
    <main
      className={`cinematic-page cinematic-page--${phase}${content ? " cinematic-page--custom" : ""}${editMode ? " cinematic-page--editing" : ""}${textMode ? " cinematic-page--text-mode" : ""}${content?.wallet.materialPreset === "matte" ? " cinematic-page--matte" : ""}${content?.wallet.animationPreset === "minimal" ? " cinematic-page--minimal" : ""}${deviceReducedMotion && motionOptIn && !reduceMotion ? " cinematic-page--motion-opt-in" : ""}`}
      style={
        content
          ? ({
              "--namana-wallet": content.wallet.color,
              "--namana-accent": content.theme.accent,
              "--namana-heading-scale": content.theme.headingScale || 1,
              "--namana-card-title-scale": content.theme.cardTitleScale || 1,
              "--namana-card-value-scale": content.theme.cardValueScale || 1,
              "--namana-card-body-scale": content.theme.cardBodyScale || 1,
              "--namana-title-color": content.theme.titleColor || "#f8f3e8",
              "--namana-role-color": content.theme.roleColor || "#d8ad67",
              fontFamily:
                content.theme.fontPreset === "system"
                  ? "system-ui, sans-serif"
                  : undefined,
            } as CSSProperties)
          : undefined
      }
      onClickCapture={(event) => {
        if (!editMode || !onSelect) return;
        const target = (event.target as HTMLElement).closest("[data-edit]");
        if (target) {
          onSelect(target.getAttribute("data-edit") as Selection);
          if (!(event.target as HTMLElement).closest("[data-edit-field]")) {
            event.preventDefault();
            event.stopPropagation();
          }
        }
      }}
    >
      {phase !== "hero" && (
        <section
          className="cinematic-welcome"
          aria-label="Selamat datang di NAMINA"
        >
          {textMode ? (
            <div className="cinematic-welcome__solo">
              <NaminaIntroStage startedAt={introStartedAt} />
              <span className="cinematic-welcome__sr-only" role="status">
                Menyiapkan video profil.
              </span>
            </div>
          ) : (
            <>
              <div className="cinematic-welcome__beam cinematic-welcome__beam--left" aria-hidden="true" />
              <div className="cinematic-welcome__beam cinematic-welcome__beam--right" aria-hidden="true" />
              <div className="cinematic-welcome__nav">
                <span className="cinematic-brand">{content?.identity.brandLabel || "NAMINA"}</span>
                <span className="cinematic-welcome__edition">PROFIL PERSONAL</span>
              </div>
              <div className="cinematic-welcome__content">
                <span className="cinematic-kicker"><i aria-hidden="true" /> SEBUAH CERITA DIMULAI</span>
                <h1 className="cinematic-welcome__title">
                  <span>WELCOME</span>
                  <small>TO</small>
                  <strong>NAMINA</strong>
                </h1>
                <p>{content ? content.identity.bio : "Satu kartu, satu cerita. Geser untuk mengenal Teh Vini lebih dekat."}</p>
                <button type="button" className="cinematic-welcome__enter" onClick={enterExperience} aria-busy={enterPending && !videoFailed}>
                  <span>{videoFailed ? "COBA LAGI" : enterPending ? "MENYIAPKAN VIDEO..." : "LIHAT PROFIL"}</span>
                  <span className="cinematic-welcome__enter-arrow" aria-hidden="true">↗</span>
                </button>
              </div>
              <div className="cinematic-welcome__footer">
                <span>{content?.identity.displayName || "TEH VINI"}</span>
                <span>{content?.identity.profession || (content ? "" : "AI ENTHUSIAST")}</span>
              </div>
            </>
          )}
        </section>
      )}

      {(phase === "hero" || textMode) && (
        <section
          ref={heroStage}
          className={`cinematic-hero cinematic-hero--enter${phase !== "hero" ? " cinematic-hero--preparing" : ""}`}
          data-edit="background"
          aria-label="Profil digital cinematic"
          aria-hidden={phase !== "hero"}
          inert={phase !== "hero"}
        >
          <div
            className="cinematic-hero__video"
            data-edit="background"
            style={{
              background: "#151310",
              backgroundImage:
                !textMode && content?.background.posterAssetId &&
                assetUrls[content.background.posterAssetId]
                  ? `url("${assetUrls[content.background.posterAssetId]}")`
                  : content
                    ? undefined
                    : 'url("/videos/hero-poster.jpg")',
              backgroundSize: "cover",
            }}
          />
          {!videoFailed &&
            (!content ||
              !!assetUrls[
                (compactDeck && content.background.mobileVideoAssetId) ||
                  content.background.desktopVideoAssetId ||
                  ""
              ]) && (
              <video
                key={videoUrl}
                ref={videoRef}
                className="cinematic-hero__video"
                data-edit="background"
                autoPlay
                muted
                loop
                playsInline
                preload={textMode ? "auto" : "metadata"}
                width={1280}
                height={720}
                aria-hidden="true"
                onError={() => setVideoFailed(true)}
                onPlaying={() => setVideoReady(true)}
                poster={
                  textMode
                    ? undefined
                    : content?.background.posterAssetId
                    ? assetUrls[content.background.posterAssetId]
                    : content
                      ? undefined
                      : "/videos/hero-poster.jpg"
                }
                style={
                  content
                    ? {
                        objectPosition: `${content.background.focalX}% ${content.background.focalY}%`,
                      }
                    : undefined
                }
              >
                <source
                  src={
                    content
                      ? assetUrls[
                          (compactDeck &&
                            content.background.mobileVideoAssetId) ||
                            content.background.desktopVideoAssetId ||
                            ""
                        ]
                      : "/videos/hero.mp4"
                  }
                  type="video/mp4"
                />
              </video>
            )}
          <div
            className="cinematic-hero__shade"
            aria-hidden="true"
            style={
              content
                ? { opacity: content.background.overlayOpacity }
                : undefined
            }
          />
          <div className="cinematic-hero__grain" aria-hidden="true" />

          {!textMode && (
            <header className="cinematic-hero__nav">
              <EditableText as="span" className="cinematic-brand" value={content?.identity.brandLabel || "NAMINA"} field="identity.brandLabel" selection="identity" editMode={editMode && !!content} onEditText={onEditText} />
            </header>
          )}

          <div className="cinematic-hero__content">
            <div className="cinematic-hero__headline-row">
              <EnterKeycap
                pressed={!textMode && walletMotion !== "rest"}
                inactive={(!textMode && walletMotion !== "rest") || totalCards === 0}
                firstActivation={needsMotionOptIn}
                nextCard={textMode ? profileTabs[((activeTab + 1) * storyPageSize) % totalCards]?.label || "pertama" : profileTabs[(activeTab + 1) % totalCards]?.label || "pertama"}
                onEnter={triggerEnter}
                imageSrc={content?.theme.enterKeyAssetId && assetUrls[content.theme.enterKeyAssetId] || "/images/enter-key-square-tight.webp"}
                editMode={editMode}
                textMode={textMode}
              />
              <div className="cinematic-hero__identity" data-edit="identity">
                <EditableText as="span" className="cinematic-kicker" value={content?.identity.introLabel || (textMode ? "Hallo, Kenalin Saya adalah..." : "Hello, kenalain saya")} field="identity.introLabel" selection="identity" editMode={editMode && !!content} onEditText={onEditText} />
                <h1 ref={heroHeading} tabIndex={-1}>
                  <EditableText as="span" className="cinematic-hero__stamp cinematic-hero__stamp--name" value={content?.identity.displayName || "TEH VINI"} field="identity.displayName" selection="identity" editMode={editMode && !!content} onEditText={onEditText} />
                  <EditableText as="span" className="cinematic-hero__stamp cinematic-hero__stamp--role" value={content ? content.identity.profession : "AI ENTHUSIAST"} field="identity.profession" selection="identity" editMode={editMode && !!content} onEditText={onEditText} />
                </h1>
                {content?.identity.portraitAssetId &&
                  assetUrls[content.identity.portraitAssetId] && (
                    <img
                      data-edit="identity"
                      data-edit-media="portrait"
                      className="namana-portrait"
                      src={assetUrls[content.identity.portraitAssetId]}
                      alt={`Foto ${content.identity.displayName}`}
                      width={140}
                      height={140}
                    />
                  )}
              </div>
            </div>

            <div className="cinematic-hero__details">
              {textMode ? (
                <TextProfileStory
                  items={profileTabs}
                  page={activeTab}
                  pageSize={storyPageSize}
                  editMode={editMode}
                  reduceMotion={reduceMotion}
                  onEditText={onEditText}
                />
              ) : (
              <div
                className="cinematic-hero__panel"
                aria-label="Koleksi kartu profil 3D"
              >
                <div
                  className="cinematic-hero__card-viewport cinematic-hero__card-viewport--wallet-draw cinematic-hero__card-viewport--file-wallet cinematic-hero__card-viewport--enter"
                  aria-label="Dokumen profil. Tekan tombol ENTER atau scroll untuk menampilkan kartu berikutnya."
                  role="group"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      navigateCards(1);
                    }
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      navigateCards(-1);
                    }
                  }}
                >
                  <div
                    data-edit={
                      activeTab >= 0
                        ? `card:${profileTabs[activeTab]?.id}`
                        : undefined
                    }
                    className={`cinematic-hero__card-track${walletMotion !== "rest" ? " cinematic-hero__card-track--in-flight" : ""}`}
                    aria-label="Kartu profil saat ini"
                    aria-hidden={walletMotion !== "rest"}
                    style={
                      activeTab >= 0 && profileTabs[activeTab]?.color
                        ? ({
                            "--document-accent": profileTabs[activeTab].color,
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    <AnimatePresence
                      initial={false}
                      mode="sync"
                      custom={{ compact: compactDeck }}
                    >
                      {activeTab >= 0 && (
                        <SwipeProfileCard
                          key={profileTabs[activeTab].label}
                          item={profileTabs[activeTab]}
                          index={activeTab}
                          totalCards={totalCards}
                          minimal={reduceMotion || walletMotion !== "rest"}
                          editMode={editMode}
                          onEditText={onEditText}
                          offset={0}
                          compact={compactDeck}
                          shuffleStage="rest"
                          fromWallet
                          exchangeFront={walletMotion === "exchanging"}
                          onSwipe={swipeCard}
                          onSelect={requestCard}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  {walletMotion !== "rest" && activeTab >= 0 && (
                    <div
                      className="cinematic-hero__flight-layer"
                      aria-hidden="true"
                    >
                      <span className="cinematic-hero__impact-shadow" />
                      {outgoingTab !== null && (
                        <FlyingDocument
                          item={profileTabs[outgoingTab]}
                          index={outgoingTab}
                          direction="out"
                          exchanging
                        />
                      )}
                      <FlyingDocument
                        item={profileTabs[activeTab]}
                        index={activeTab}
                        direction="in"
                        exchanging={walletMotion === "exchanging"}
                        onDrawComplete={finishWalletMotion}
                      />
                    </div>
                  )}
                </div>
                <span
                  className="cinematic-hero__sr-only"
                  role="status"
                  aria-live="polite"
                >
                  {textMode
                    ? activeTab < 0
                      ? "Tekan ENTER untuk membaca cerita pertama."
                      : `Cerita ${activeTab + 1} dari ${totalStoryPages}: ${profileTabs.slice(activeTab * storyPageSize, (activeTab + 1) * storyPageSize).map((item) => item.label).join(", ")}.`
                    : walletMotion === "exchanging"
                    ? "Satu kartu baru jatuh, memantul di lantai, lalu menggantikan kartu sebelumnya."
                    : activeTab < 0
                      ? "Belum ada dokumen. Tekan ENTER untuk menampilkan kartu pertama."
                      : `Dokumen ${profileTabs[activeTab].label}, ${activeTab + 1} dari ${totalCards}`}
                </span>
              </div>
              )}
            </div>
          </div>
          {textMode && (
            <details className="namana-text-credits">
              <summary aria-label="Lihat kredit ikon animasi" title="Kredit ikon animasi">i</summary>
              <p>
                Ikon animasi oleh{" "}
                <a href="https://www.flaticon.com/authors/magnific" target="_blank" rel="noopener noreferrer">Magnific</a>
                {" "}melalui{" "}
                <a href="https://www.flaticon.com/" target="_blank" rel="noopener noreferrer">Flaticon</a>.
              </p>
            </details>
          )}
        </section>
      )}
      {phase === "hero" && !textMode && (
        <footer className="cinematic-credits">
          Ikon animasi oleh{" "}
          <a href="https://www.flaticon.com/authors/magnific" target="_blank" rel="noopener noreferrer">Magnific</a>
          {" "}melalui{" "}
          <a href="https://www.flaticon.com/" target="_blank" rel="noopener noreferrer">Flaticon</a>.
        </footer>
      )}
    </main>
  );
}
