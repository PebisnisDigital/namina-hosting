import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AssetUrls, OriginalProfile, SiteContent } from "../domain/content";
import { blankOriginal } from "../static/originalSeed";
import { publicPath } from "../static/publicPath";
import { originalFontFamilies, originalShadowValues } from "../static/originalStyle";
import { NaminaIntroStage, NaminaLogo } from "./NaminaLogo";
import "./ViniCinematic.css";

function getPageSize() {
  if (typeof window === "undefined") return 2;
  if (window.matchMedia("(max-width: 700px)").matches) return 1;
  return 2;
}

type MenuKey = "Nama" | "Karir" | "Skill" | "Karya" | "Produk";
type TickerFact = { label: string; value: string; icon: number };
type VisualCard = {
  id: string;
  title: string;
  eyebrow: string;
  detail: string;
  accent: string;
  glow: string;
  motif: OriginalProfile["karya"]["items"][number]["motif"];
  imageUrl?: string;
  link: string;
  owner: string;
};
type SlideDrag = { pointerId: number; startX: number; startScroll: number; moved: boolean };

const menus: MenuKey[] = ["Nama", "Karir", "Skill", "Karya", "Produk"];

function MenuIcon({ menu }: { menu: MenuKey }) {
  return (
    <svg className="vini-cinema__nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {menu === "Nama" && <><circle cx="12" cy="8" r="3.5" /><path d="M5 20v-2.5A5.5 5.5 0 0 1 10.5 12h3A5.5 5.5 0 0 1 19 17.5V20" /></>}
      {menu === "Karir" && <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18m-10-1v3h2v-3" /></>}
      {menu === "Skill" && <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="var(--namina-bg, #08080c)" /><circle cx="16" cy="12" r="2" fill="var(--namina-bg, #08080c)" /><circle cx="8" cy="18" r="2" fill="var(--namina-bg, #08080c)" /></>}
      {menu === "Karya" && <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 3-3 4 4" /></>}
      {menu === "Produk" && <><path d="M4 9h16l-1 12H5L4 9Zm4 0V7a4 4 0 0 1 8 0v2" /></>}
    </svg>
  );
}

function IntroDescription({ text }: { text: string }) {
  return (
    <p>
      {text.split(/(?<=\.)\s+/).map((sentence, index) => (
        <span className="vini-cinema__description-sentence" key={index}>{sentence}</span>
      ))}
    </p>
  );
}

function CardArtwork({ card }: { card: VisualCard }) {
  if (card.imageUrl) return <img className="vini-cinema__artwork" src={card.imageUrl} alt={`Gambar ${card.title}`} width={950} height={300} loading="lazy" decoding="async" />;
  const gradientId = `visual-gradient-${card.id}`;
  return (
    <svg className="vini-cinema__artwork" viewBox="0 0 950 300" role="img" aria-label={`Ilustrasi ${card.title}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#101017" /><stop offset=".52" stopColor={card.glow} /><stop offset="1" stopColor="#101018" />
        </linearGradient>
      </defs>
      <rect width="950" height="300" fill={`url(#${gradientId})`} />
      <path d="M480 -80 L960 300 M610 -120 L1050 240 M740 -150 L1100 130" stroke={card.accent} strokeWidth="2" opacity=".22" />
      <circle cx="765" cy="145" r="165" fill={card.accent} opacity=".11" />
      <circle cx="765" cy="145" r="119" stroke={card.accent} strokeWidth="2" opacity=".54" fill="none" />
      {card.motif === "music" ? <path d="M660 125V83L820 50v159m-160-84v92m160-8c-15-18-62-13-66 14-5 31 57 33 66 2m-160-8c-16-20-64-13-67 13-3 29 57 34 67 3" fill="none" stroke={card.accent} strokeWidth="15" strokeLinecap="round" /> : null}
      {card.motif === "storm" || card.motif === "community" ? <path d="M778 32L672 161h76l-39 116 137-156h-81l46-89Z" stroke={card.accent} strokeWidth="6" fill={card.accent} fillOpacity=".4" strokeLinejoin="round" /> : null}
      {card.motif === "cinema" || card.motif === "animation" ? <g transform="translate(672 65) rotate(-9 90 70)"><rect width="195" height="142" rx="14" fill="#0b0c17" stroke={card.accent} strokeWidth="6" /><path d="M0 44h195" stroke={card.accent} strokeWidth="5" /><path d="M35 0L72 44M97 0l37 44M157 0l37 44" stroke={card.accent} strokeWidth="7" /><path d="m76 70 66 29-66 28Z" fill={card.accent} /></g> : null}
      {card.motif === "monogram" ? <g transform="translate(692 67)"><rect width="150" height="150" rx="29" fill={card.accent} /><path d="M34 121V30h25l55 73V30" fill="none" stroke="white" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" /></g> : null}
      {card.motif === "road" ? <g transform="translate(635 55)"><path d="M100 215L163 0h40l63 215Z" fill={card.accent} fillOpacity=".30" stroke={card.accent} strokeWidth="5" /><path d="M185 20v35m0 28v35m0 28v35" stroke="#fff8e7" strokeWidth="8" strokeLinecap="round" /></g> : null}
      {card.motif === "bot" ? <g transform="translate(695 52)" stroke={card.accent} strokeWidth="7"><rect width="150" height="162" rx="29" fill="#111c2a" /><path d="M75-28v28M0 95h-25m175 0h25" /><circle cx="45" cy="67" r="11" fill={card.accent}/><circle cx="105" cy="67" r="11" fill={card.accent}/><path d="M42 111q33 25 66 0" fill="none" strokeLinecap="round" /></g> : null}
      <text x="48" y="57" fill={card.accent} fontFamily="Montserrat, sans-serif" fontWeight="700" fontSize="22" letterSpacing="4">{card.eyebrow.toUpperCase()}</text>
      <text x="48" y="177" fill="#fff6f3" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize={card.title.length > 22 ? "39" : card.title.length > 15 ? "48" : "61"} letterSpacing="-2">{card.title}</text>
      <path d="M48 205h248" stroke={card.accent} strokeWidth="5" strokeLinecap="round" />
      <text x="48" y="255" fill="#fff1ea" fontFamily="Montserrat, sans-serif" fontSize="20" letterSpacing="3" opacity=".76">{card.owner} · NAMINA</text>
    </svg>
  );
}

export function ViniCinematic({
  content,
  assetUrls,
  introStartedAt,
  fallbackOriginal,
  previewMode = false,
}: {
  content: SiteContent;
  assetUrls: AssetUrls;
  introStartedAt?: number;
  fallbackOriginal?: OriginalProfile;
  previewMode?: boolean;
}) {
  const emptyOriginal = useMemo(() => blankOriginal(content.identity.displayName), [content.identity.displayName]);
  const original = content.original ?? fallbackOriginal ?? emptyOriginal;
  const customStyle = original.style;
  const [pageSize, setPageSize] = useState(getPageSize);
  const [activeMenu, setActiveMenu] = useState<MenuKey>("Nama");
  const [selectedCard, setSelectedCard] = useState<VisualCard | null>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [usingFallbackVideo, setUsingFallbackVideo] = useState(false);
  const [introElapsed, setIntroElapsed] = useState(false);
  const [introTimedOut, setIntroTimedOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sliderRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<SlideDrag | null>(null);
  const resumeAtRef = useRef(0);
  const suppressCardClickRef = useRef(false);

  const activeSection = original[activeMenu.toLowerCase() as "nama" | "karir" | "skill" | "karya" | "produk"];
  const factColumns = pageSize === 1 ? 1.12 : (customStyle?.factColumns ?? 3);
  const galleryColumns = pageSize === 1 ? 1.12 : (customStyle?.galleryColumns ?? 2);
  const visibleFactColumns = Math.min(factColumns, Math.max(1, original[activeMenu.toLowerCase() as "nama" | "karir" | "skill" | "karya" | "produk"].items.length));
  const styleVariables = customStyle ? {
    "--namina-bg": customStyle.backgroundColor,
    "--namina-ink": customStyle.textColor,
    "--namina-accent": customStyle.accentColor,
    "--namina-button-bg": customStyle.buttonColor,
    "--namina-button-ink": customStyle.buttonTextColor,
    "--namina-line": customStyle.borderColor,
    "--namina-font": originalFontFamilies[customStyle.fontFamily],
    "--namina-title-scale": customStyle.titleScale,
    "--namina-body-scale": customStyle.bodyScale,
    "--namina-content-margin": `${customStyle.contentMargin}px`,
    "--namina-top-spacing": `${customStyle.topSpacing}px`,
    "--namina-card-gap": `${customStyle.cardGap}px`,
    "--namina-button-radius": `${customStyle.buttonRadius}px`,
    "--namina-border-width": `${customStyle.borderWidth}px`,
    "--namina-shadow": originalShadowValues[customStyle.shadow],
  } as CSSProperties : undefined;
  const activeFacts: TickerFact[] = activeMenu === "Nama" || activeMenu === "Karir" || activeMenu === "Skill"
    ? (activeSection as OriginalProfile["nama"]).items : [];
  const activeGallery: VisualCard[] | null = activeMenu === "Karya" || activeMenu === "Produk"
    ? (activeSection as OriginalProfile["karya"]).items.map((item) => ({
      id: item.id,
      title: item.title,
      eyebrow: activeMenu === "Karya" ? "Karya Website" : "Produk",
      detail: item.description,
      accent: item.color,
      glow: "#3e1c29",
      motif: item.motif,
      imageUrl: assetUrls[item.imageAssetId || ""],
      link: item.link,
      owner: content.identity.displayName,
    })) : null;
  const visibleGalleryColumns = Math.min(galleryColumns, Math.max(1, activeGallery?.length ?? 1));
  const mobileVideoId = content.background.mobileVideoAssetId;
  const desktopVideoId = content.background.desktopVideoAssetId;
  const videoSrc = assetUrls[
    (pageSize === 1 && mobileVideoId) || desktopVideoId || ""
  ];
  const activeVideoSrc = usingFallbackVideo ? publicPath("/videos/hero.mp4") : videoSrc;
  const showLoader = !previewMode && (videoSrc ? !introElapsed || (!videoReady && !videoFailed && !introTimedOut) : !introElapsed);

  useEffect(() => {
    const updatePageSize = () => setPageSize(getPageSize());
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  // A continuous native scroll position stays draggable on touch and mouse.
  // Three matching sequences let the offset wrap invisibly in either direction.
  useEffect(() => {
    const viewport = sliderRef.current;
    if (!viewport) return;
    const reset = () => { viewport.scrollLeft = viewport.scrollWidth / 3; };
    reset();
    const observer = new ResizeObserver(reset);
    observer.observe(viewport);
    let frame = 0;
    let previous = performance.now();
    const speed = activeGallery ? 64 : 68; // px/s: legible cards and visible, gentle movement.
    const animate = (now: number) => {
      const delta = Math.min(now - previous, 48) / 1000;
      previous = now;
      if (!dragRef.current && now >= resumeAtRef.current && document.visibilityState === "visible") {
        const sequenceWidth = viewport.scrollWidth / 3;
        if (sequenceWidth > 0) {
          let next = viewport.scrollLeft + speed * delta;
          while (next < sequenceWidth * .5) next += sequenceWidth;
          while (next > sequenceWidth * 1.5) next -= sequenceWidth;
          viewport.scrollLeft = next;
        }
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      dragRef.current = null;
    };
  }, [activeMenu, activeFacts.length, activeGallery?.length, visibleFactColumns, visibleGalleryColumns, pageSize]);

  const onSliderPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressCardClickRef.current = false;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScroll: event.currentTarget.scrollLeft, moved: false };
  };
  const onSliderPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      suppressCardClickRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.currentTarget.scrollLeft = drag.startScroll - distance;
  };
  const onSliderPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    resumeAtRef.current = performance.now() + 1100;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onSliderWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaX) > 0) resumeAtRef.current = performance.now() + 1100;
  };
  const onSliderKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.currentTarget.scrollLeft += event.key === "ArrowRight" ? 110 : -110;
    resumeAtRef.current = performance.now() + 1100;
  };

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const started = introStartedAt || Date.now();
    const elapsed = Date.now() - started;
    const minimum = window.setTimeout(() => setIntroElapsed(true), Math.max(0, 1200 - elapsed));
    const fallback = window.setTimeout(() => setIntroTimedOut(true), Math.max(0, 8000 - elapsed));
    return () => {
      window.clearTimeout(minimum);
      window.clearTimeout(fallback);
    };
  }, [introStartedAt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    if (!pageVisible) {
      video.pause();
    } else {
      void video.play().catch(() => {
        // Some browsers block playback even for muted inline video.
      });
    }
  }, [pageVisible, videoFailed, activeVideoSrc]);

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
    setUsingFallbackVideo(false);
  }, [videoSrc]);

  useEffect(() => {
    if (videoReady || videoFailed || usingFallbackVideo || !videoSrc || !fallbackOriginal) return;
    const timeout = window.setTimeout(() => setUsingFallbackVideo(true), 5500);
    return () => window.clearTimeout(timeout);
  }, [videoReady, videoFailed, usingFallbackVideo, videoSrc, fallbackOriginal]);

  const selectMenu = (menu: MenuKey) => {
    setActiveMenu(menu);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!selectedCard) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedCard(null); };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [selectedCard]);

  const retryVideo = () => {
    setVideoFailed(false);
    setVideoReady(false);
    const video = videoRef.current;
    if (!video) return;
    video.load();
    void video.play().catch(() => setVideoFailed(true));
  };

  const handleVideoError = () => {
    if (!usingFallbackVideo && fallbackOriginal) {
      setUsingFallbackVideo(true);
      setVideoReady(false);
    } else {
      setVideoFailed(true);
    }
  };

  return (
    <main style={styleVariables} className={`vini-cinema${showLoader ? " vini-cinema--loading" : ""}${activeGallery ? " vini-cinema--gallery" : ""}${customStyle ? " vini-cinema--styled" : ""}${customStyle?.buttonVariant === "outline" ? " vini-cinema--button-outline" : ""}`}>
      <div className="vini-cinema__stage" aria-hidden="true">
        {videoSrc && (
          <video
            ref={videoRef}
            className="vini-cinema__video"
            src={activeVideoSrc}
            width={1280}
            height={720}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setVideoReady(true)}
            onError={handleVideoError}
            style={{ objectPosition: `${pageSize === 1 ? (content.background.mobileFocalX ?? content.background.focalX) : content.background.focalX}% ${content.background.focalY}%` }}
          />
        )}
        <div className="vini-cinema__scrim" />
      </div>

      <div className="vini-cinema__layout" aria-hidden={showLoader} inert={showLoader}>
        <header className="vini-cinema__header">
          <button className="vini-cinema__brand" type="button" onClick={() => selectMenu("Nama")} aria-label="NAMINA, kembali ke Nama">
            <NaminaLogo variant="compact" />
          </button>
          <button
            className="vini-cinema__menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="vini-navigation"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? "Tutup" : "Menu"}
          </button>
          <nav id="vini-navigation" className={`vini-cinema__nav${menuOpen ? " vini-cinema__nav--open" : ""}`} aria-label="Navigasi cerita">
            {menus.map((menu) => (
              <button key={menu} type="button" className={activeMenu === menu ? "is-active" : ""} aria-current={activeMenu === menu ? "page" : undefined} onClick={() => selectMenu(menu)}>
                <MenuIcon menu={menu} />
                <span>{menu}</span>
              </button>
            ))}
          </nav>
          {original.contactUrl && <a className="vini-cinema__contact-top" href={original.contactUrl} target="_blank" rel="noopener noreferrer">Japri Saya!</a>}
        </header>

        <div className="vini-cinema__main">
          <div className="vini-cinema__intro">
            <span className="vini-cinema__hello">{activeSection.intro}</span>
            {activeMenu === "Nama" ? (
              <>
                <h1>{content.identity.displayName}<span>{content.identity.profession}</span></h1>
                <IntroDescription text={activeSection.description} />
              </>
            ) : (
              <>
                <h1 className="vini-cinema__section-title">{activeMenu}<span>{activeSection.subtitle}</span></h1>
                <IntroDescription text={activeSection.description} />
              </>
            )}
          </div>

          {activeGallery ? activeGallery.length ? (
            <section ref={sliderRef} tabIndex={0} className="vini-cinema__gallery-viewport" aria-label={`Slider gambar ${activeMenu}, bergerak otomatis, dapat digeser`} aria-roledescription="carousel" key={activeMenu} onPointerDown={onSliderPointerDown} onPointerMove={onSliderPointerMove} onPointerUp={onSliderPointerEnd} onPointerCancel={onSliderPointerEnd} onWheel={onSliderWheel} onKeyDown={onSliderKeyDown}>
              <div
                className="vini-cinema__gallery-track"
                style={{ width: `${activeGallery.length * 300 / visibleGalleryColumns}%`, "--gallery-slots": activeGallery.length * 3 } as CSSProperties}
              >
                {[...activeGallery, ...activeGallery, ...activeGallery].map((card, index) => (
                  <div className="vini-cinema__gallery-slide" key={`${card.id}-${index}`} aria-hidden={index < activeGallery.length || index >= activeGallery.length * 2}>
                    <button type="button" className="vini-cinema__visual-card" onClick={(event) => { if (suppressCardClickRef.current) { suppressCardClickRef.current = false; event.preventDefault(); return; } setSelectedCard(card); }} tabIndex={index >= activeGallery.length && index < activeGallery.length * 2 ? 0 : -1} aria-label={`Lihat detail ${card.title}`}>
                      <CardArtwork card={card} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <p className="vini-cinema__empty">Belum ada {activeMenu.toLowerCase()} yang ditampilkan.</p>
          ) : activeFacts.length ? (
            <section ref={sliderRef} tabIndex={0} className="vini-cinema__highlights" aria-label={`Data ${activeMenu}, bergeser otomatis ke kiri, dapat digeser`} aria-roledescription="carousel" onPointerDown={onSliderPointerDown} onPointerMove={onSliderPointerMove} onPointerUp={onSliderPointerEnd} onPointerCancel={onSliderPointerEnd} onWheel={onSliderWheel} onKeyDown={onSliderKeyDown}>
              <div key={activeMenu} className="vini-cinema__highlight-track" style={{ width: `${activeFacts.length * 300 / visibleFactColumns}%`, "--slot-count": activeFacts.length * 3 } as CSSProperties}>
                {[...activeFacts, ...activeFacts, ...activeFacts].map((item, index) => (
                  <div key={`${item.label}-${item.value}-${index}`} className="vini-cinema__highlight" aria-hidden={index < activeFacts.length || index >= activeFacts.length * 2}>
                    <img src={publicPath(`/animated-icons/${item.icon}.webp`)} width={40} height={40} alt="" decoding="async" />
                    <span>{item.label}<strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <p className="vini-cinema__empty">Belum ada data {activeMenu.toLowerCase()}.</p>
          )}
        </div>
      </div>

      {selectedCard && !showLoader && (
        <div className="vini-cinema__modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCard(null); }}>
          <section className="vini-cinema__modal" role="dialog" aria-modal="true" aria-label={`Detail ${selectedCard.title}`}>
            <button type="button" className="vini-cinema__modal-close" onClick={() => setSelectedCard(null)} aria-label="Tutup detail">×</button>
            <CardArtwork card={selectedCard} />
            <div className="vini-cinema__modal-copy">
              <span>{selectedCard.eyebrow}</span>
              <h2>{selectedCard.title}</h2>
              <p>{selectedCard.detail}</p>
              {selectedCard.link && <a className="vini-cinema__detail-link" href={selectedCard.link} target="_blank" rel="noopener noreferrer">Kunjungi website</a>}
            </div>
          </section>
        </div>
      )}

      {videoFailed && !showLoader && (
        <div className="vini-cinema__video-status" role="status">
          <span>Video belum bisa diputar.</span>
          <button type="button" onClick={retryVideo}>Coba lagi</button>
        </div>
      )}

      {showLoader && (
        <section className="vini-cinema__loading" aria-label="Menyiapkan profil NAMINA" role="status">
          <NaminaIntroStage startedAt={introStartedAt} />
        </section>
      )}
    </main>
  );
}
