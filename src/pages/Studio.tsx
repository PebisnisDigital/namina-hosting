import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  contentSchema,
  defaultContent,
  newCard,
  assetIds,
  type AssetUrls,
  type Selection,
  type SiteContent,
} from "../domain/content";
import {
  loadDraft,
  listSites,
  uploadMedia,
  type Draft,
  type Version,
} from "../platform/sites";
import { db, rpc } from "../platform/client";
import { Notice, Protected, Shell } from "./shared";
import { useLoad, useMediaUrls } from "../platform/hooks";
import { IdentityFlip } from "../components/IdentityFlip";
import { MediaLibrary } from "./MediaLibrary";

type CanvasMessage = {
  type: "namana:content";
  content: SiteContent;
  urls: AssetUrls;
  edit: boolean;
  selected: Selection;
};
export function Canvas() {
  const [state, setState] = useState<CanvasMessage | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== parent ||
        parent === window ||
        event.data?.type !== "namana:content"
      )
        return;
      const parsed = contentSchema.safeParse(event.data.content);
      if (parsed.success) setState({ ...event.data, content: parsed.data });
    };
    window.addEventListener("message", receive);
    parent.postMessage({ type: "namana:ready" }, location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  if (!state) return <Notice>Memuat kanvas privat…</Notice>;
  return (
    <IdentityFlip
      key={state.content.cards.map((c) => `${c.id}:${c.visible}`).join()}
      content={state.content}
      assetUrls={state.urls}
      editMode={state.edit}
      startOpen
      selectedCardId={
        state.selected.startsWith("card:") ? state.selected.slice(5) : undefined
      }
      onSelect={(selected) =>
        parent.postMessage({ type: "namana:select", selected }, location.origin)
      }
    />
  );
}
export function Studio({ siteId }: { siteId?: string }) {
  return (
    <Protected>
      <StudioLoader siteId={siteId} />
    </Protected>
  );
}
function StudioLoader({ siteId }: { siteId?: string }) {
  const { data, error, reload } = useLoad(async () => {
    const sites = await listSites();
    const site = siteId ? sites.find((s) => s.id === siteId) : sites[0];
    if (!site) return null;
    return { site, draft: await loadDraft(site.id) };
  }, [siteId]);
  if (error)
    return (
      <Shell>
        <main className="page">
          <Notice error>{error}</Notice>
          <button onClick={reload}>Coba lagi</button>
        </main>
      </Shell>
    );
  if (!data)
    return (
      <Shell>
        <main className="page">
          <Notice>Website belum tersedia atau masih dimuat.</Notice>
          <a href="/dashboard">Kembali ke dashboard</a>
        </main>
      </Shell>
    );
  return (
    <StudioEditor
      key={data.site.id}
      initial={data.draft}
      slug={data.site.slug}
      suspended={data.site.status === "suspended"}
    />
  );
}
function useDraft(initial: Draft) {
  const [history, setHistory] = useState({
    past: [] as SiteContent[],
    present: initial.content,
    future: [] as SiteContent[],
  });
  const [status, setStatus] = useState("Tersimpan");
  const current = useRef(initial.content);
  const saved = useRef(JSON.stringify(initial.content));
  const revision = useRef(initial.revision);
  const inflight = useRef<Promise<void> | null>(null);
  current.current = history.present;
  const flush = useCallback(async (): Promise<void> => {
    if (inflight.current) {
      await inflight.current;
      if (saved.current !== JSON.stringify(current.current)) return flush();
      return;
    }
    const work = async () => {
      while (saved.current !== JSON.stringify(current.current)) {
        const snapshot = contentSchema.parse(current.current);
        const serial = JSON.stringify(snapshot);
        setStatus("Menyimpan…");
        try {
          revision.current = await rpc<number>("save", {
            p_site: initial.site_id,
            p_revision: revision.current,
            p_content: snapshot,
          });
          saved.current = serial;
        } catch (e) {
          setStatus((e as Error).message);
          throw e;
        }
      }
      setStatus("Tersimpan");
    };
    inflight.current = work();
    try {
      await inflight.current;
    } finally {
      inflight.current = null;
    }
  }, [initial.site_id]);
  useEffect(() => {
    if (JSON.stringify(history.present) === saved.current) return;
    const parsed = contentSchema.safeParse(history.present);
    if (!parsed.success) {
      setStatus(parsed.error.issues[0]?.message || "Konten belum valid.");
      return;
    }
    setStatus("Perubahan belum disimpan");
    const timer = setTimeout(() => void flush().catch(() => {}), 900);
    return () => clearTimeout(timer);
  }, [history.present, flush]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (saved.current !== JSON.stringify(current.current)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const offline = () =>
      setStatus(
        "Offline. Perubahan masih di tab ini. Jangan tutup sebelum tersimpan.",
      );
    window.addEventListener("beforeunload", guard);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("beforeunload", guard);
      window.removeEventListener("offline", offline);
    };
  }, []);
  const change = (updater: (draft: SiteContent) => void) =>
    setHistory((h) => {
      const next = structuredClone(h.present);
      updater(next);
      return {
        past: [...h.past.slice(-49), h.present],
        present: next,
        future: [],
      };
    });
  const undo = () =>
    setHistory((h) =>
      h.past.length
        ? {
            past: h.past.slice(0, -1),
            present: h.past.at(-1)!,
            future: [h.present, ...h.future],
          }
        : h,
    );
  const redo = () =>
    setHistory((h) =>
      h.future.length
        ? {
            past: [...h.past, h.present],
            present: h.future[0],
            future: h.future.slice(1),
          }
        : h,
    );
  const reset = (draft: Draft) => {
    current.current = draft.content;
    saved.current = JSON.stringify(draft.content);
    revision.current = draft.revision;
    setHistory({ past: [], present: draft.content, future: [] });
    setStatus("Tersimpan");
  };
  return {
    content: history.present,
    change,
    undo,
    redo,
    canUndo: !!history.past.length,
    canRedo: !!history.future.length,
    flush,
    revision,
    status,
    reset,
  };
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function StudioEditor({
  initial,
  slug,
  suspended,
}: {
  initial: Draft;
  slug: string;
  suspended: boolean;
}) {
  const draft = useDraft(initial);
  const { content, change } = draft;
  const [selected, setSelected] = useState<Selection>("identity");
  const [edit, setEdit] = useState(
    new URLSearchParams(location.search).get("mode") !== "preview",
  );
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const { urls, error: mediaError } = useMediaUrls(content);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const iframe = useRef<HTMLIFrameElement>(null);
  const frameContainer = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 1280, height: 900 });
  useEffect(() => {
    const frame = frameContainer.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) =>
      setFrameSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  const canvasScale =
    device === "desktop" ? Math.min(1, frameSize.width / 1280) : 1;
  const sendRef = useRef<() => void>(() => {});
  const dragged = useRef<string>("");
  const card = selected.startsWith("card:")
    ? content.cards.find((c) => c.id === selected.slice(5))
    : null;
  sendRef.current = () =>
    iframe.current?.contentWindow?.postMessage(
      { type: "namana:content", content, urls, edit, selected },
      location.origin,
    );
  useEffect(() => {
    sendRef.current();
  }, [content, urls, edit, selected]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== iframe.current?.contentWindow
      )
        return;
      if (event.data?.type === "namana:ready") sendRef.current();
      if (
        event.data?.type === "namana:select" &&
        typeof event.data.selected === "string" &&
        /^(identity|wallet|background|theme|card:[a-f0-9-]{36})$/.test(
          event.data.selected,
        )
      )
        setSelected(event.data.selected);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  const action = async (work: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (e) {
      setMessage((e as Error).message || "Operasi gagal.");
    } finally {
      setBusy(false);
    }
  };
  async function history() {
    const { data, error } = await db()
      .from("namana_versions")
      .select("id,created_at,revision")
      .eq("site_id", initial.site_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    setVersions(data);
  }
  async function publish() {
    await draft.flush();
    await rpc("publish", {
      p_site: initial.site_id,
      p_revision: draft.revision.current,
    });
    setMessage("Website berhasil dipublikasikan.");
    await history();
  }
  async function share() {
    await draft.flush();
    const token = await rpc<string>("create_preview", {
      p_site: initial.site_id,
      p_revision: draft.revision.current,
    });
    setPreview(`${location.origin}/preview/${token}`);
  }
  async function upload(file: File | null, target: string) {
    if (!file) return;
    await action(async () => {
      const id = await uploadMedia(initial.site_id, file);
      change((d) => {
        if (target === "portrait") d.identity.portraitAssetId = id;
        else if (target.startsWith("card:")) {
          const c = d.cards.find((c) => c.id === target.slice(5));
          if (c) c.imageAssetId = id;
        } else
          d.background[
            target as
              "desktopVideoAssetId" | "mobileVideoAssetId" | "posterAssetId"
          ] = id;
      });
      setMessage("Media terverifikasi dan ditambahkan ke draft.");
    });
  }
  function reorder(id: string, offset: number) {
    change((d) => {
      const index = d.cards.findIndex((c) => c.id === id);
      const to = index + offset;
      if (index < 0 || to < 0 || to >= d.cards.length) return;
      const [c] = d.cards.splice(index, 1);
      d.cards.splice(to, 0, c);
    });
  }
  function mediaControl(
    label: string,
    target: string,
    accept: string,
    currentId: string | null,
  ): ReactNode {
    return (
      <div className="media-control">
        <label>
          {label}
          <input
            type="file"
            accept={accept}
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files?.[0] || null, target);
              e.target.value = "";
            }}
          />
        </label>
        {currentId && (
          <button
            onClick={() =>
              change((d) => {
                if (target === "portrait") d.identity.portraitAssetId = null;
                else if (target.startsWith("card:")) {
                  const c = d.cards.find((c) => c.id === target.slice(5));
                  if (c) c.imageAssetId = null;
                } else d.background[target as "posterAssetId"] = null;
              })
            }
          >
            Lepas media
          </button>
        )}
      </div>
    );
  }
  function updateCard(field: string, value: unknown) {
    change((d) => {
      const c = d.cards.find((c) => c.id === card?.id);
      if (c) Object.assign(c, { [field]: value });
    });
  }
  return (
    <div className="studio">
      <header className="studio-toolbar">
        <a href="/dashboard" className="wordmark">
          NAMINA<span> Studio</span>
        </a>
        <span>/{slug}</span>
        <div className="toolbar-group">
          <button
            onClick={() =>
              setDevice(device === "desktop" ? "mobile" : "desktop")
            }
            aria-pressed={device === "mobile"}
          >
            {device === "desktop" ? "Desktop" : "HP"} preview
          </button>
          <button onClick={() => setEdit(!edit)} aria-pressed={edit}>
            {edit ? "Mode Edit" : "Mode Preview"}
          </button>
          <button disabled={!draft.canUndo || busy} onClick={draft.undo}>
            Undo
          </button>
          <button disabled={!draft.canRedo || busy} onClick={draft.redo}>
            Redo
          </button>
          <button disabled={busy} onClick={() => void action(draft.flush)}>
            Simpan / coba lagi
          </button>
          <button
            className="primary"
            disabled={busy || suspended}
            onClick={() => void action(publish)}
          >
            {busy ? "Memproses…" : "Publish"}
          </button>
        </div>
      </header>
      <div className="studio-status" role="status">
        {draft.status}
        {suspended && " • Website ditangguhkan; publish tidak tersedia."}
      </div>
      {message && <Notice>{message}</Notice>}
      {mediaError && <Notice error>{mediaError}</Notice>}
      <div className="studio-workspace">
        <aside className="studio-layers" aria-label="Struktur website">
          <h2>Elemen</h2>
          {(["identity", "wallet", "background", "theme"] as Selection[]).map(
            (selection, i) => (
              <button
                key={selection}
                aria-pressed={selected === selection}
                onClick={() => setSelected(selection)}
              >
                {["Identitas & foto", "Dompet", "Latar & video", "Tema"][i]}
              </button>
            ),
          )}
          <h2>
            Kartu <small>{content.cards.length}/24</small>
          </h2>
          <ol>
            {content.cards.map((c, i) => (
              <li
                key={c.id}
                draggable
                onDragStart={() => {
                  dragged.current = c.id;
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  reorder(
                    dragged.current,
                    i -
                      content.cards.findIndex((x) => x.id === dragged.current),
                  );
                }}
              >
                <button
                  onClick={() => setSelected(`card:${c.id}`)}
                  aria-pressed={card?.id === c.id}
                >
                  {c.title}
                  {!c.visible ? " (tersembunyi)" : ""}
                </button>
                <div className="card-reorder">
                  <button
                    aria-label={`Naikkan ${c.title}`}
                    disabled={i === 0}
                    onClick={() => reorder(c.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Turunkan ${c.title}`}
                    disabled={i === content.cards.length - 1}
                    onClick={() => reorder(c.id, 1)}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            disabled={content.cards.length >= 24}
            onClick={() => {
              const c = newCard();
              change((d) => {
                d.cards.push(c);
              });
              setSelected(`card:${c.id}`);
            }}
          >
            Tambah kartu
          </button>
          <hr />
          <button disabled={busy} onClick={() => void action(share)}>
            Buat tautan preview 1 jam
          </button>
          {preview && (
            <div className="preview-share">
              <a href={preview} target="_blank" rel="noopener noreferrer">
                Buka preview sementara
              </a>
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(preview)
                    .then(() => setMessage("Tautan preview disalin."))
                    .catch(() =>
                      setMessage("Salin tautan dari halaman preview."),
                    )
                }
              >
                Salin tautan preview
              </button>
            </div>
          )}
          <button
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await rpc("revoke_previews", { p_site: initial.site_id });
                setPreview("");
                setMessage("Tautan preview telah dicabut.");
              })
            }
          >
            Cabut semua tautan preview
          </button>
          <MediaLibrary
            siteId={initial.site_id}
            revisionKey={assetIds(content).join(",")}
            selected={selected}
            onChoose={(id, video) =>
              change((d) => {
                if (selected === "identity") d.identity.portraitAssetId = id;
                else if (selected === "background") {
                  if (video) d.background.desktopVideoAssetId = id;
                  else d.background.posterAssetId = id;
                } else if (selected.startsWith("card:")) {
                  const c = d.cards.find((c) => c.id === selected.slice(5));
                  if (c) c.imageAssetId = id;
                }
              })
            }
          />
          <button onClick={() => void action(history)}>Riwayat versi</button>
          {versions.map((v) => (
            <div key={v.id} className="version">
              <span>
                Rev {v.revision} •{" "}
                {new Date(v.created_at).toLocaleString("id-ID")}
              </span>
              <button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await draft.flush();
                    await rpc("restore", {
                      p_site: initial.site_id,
                      p_version: v.id,
                      p_revision: draft.revision.current,
                    });
                    draft.reset(await loadDraft(initial.site_id));
                    setMessage(
                      "Versi dipulihkan ke draft. Publish untuk menayangkannya.",
                    );
                  })
                }
              >
                Pulihkan ke draft
              </button>
            </div>
          ))}
        </aside>
        <section className="studio-stage" aria-label="Kanvas website">
          <p>
            {edit
              ? "Klik elemen di kanvas atau pilih dari daftar."
              : "Preview: animasi dan tautan berfungsi seperti website publik."}
          </p>
          <div
            ref={frameContainer}
            className={`canvas-frame canvas-frame--${device}`}
          >
            <iframe
              ref={iframe}
              src="/canvas"
              title={`${device === "mobile" ? "HP" : "Desktop"} preview website`}
              style={
                device === "desktop"
                  ? {
                      width: 1280,
                      height: Math.max(
                        900,
                        Math.round(frameSize.height / canvasScale),
                      ),
                      transform: `scale(${canvasScale})`,
                      transformOrigin: "top left",
                    }
                  : undefined
              }
              onLoad={() => sendRef.current()}
            />
          </div>
        </section>
        <aside className="studio-inspector" aria-label="Properti elemen">
          <h2>
            {card
              ? card.title
              : (
                  {
                    identity: "Identitas",
                    wallet: "Dompet",
                    background: "Latar",
                    theme: "Tema",
                  } as Record<string, string>
                )[selected] || "Pilih elemen"}
          </h2>
          <div className="form-stack">
            {selected === "identity" && (
              <>
                <Field
                  label="Nama tampilan"
                  value={content.identity.displayName}
                  maxLength={60}
                  onChange={(v) =>
                    change((d) => {
                      d.identity.displayName = v;
                    })
                  }
                />
                <Field
                  label="Profesi"
                  value={content.identity.profession}
                  maxLength={70}
                  onChange={(v) =>
                    change((d) => {
                      d.identity.profession = v;
                    })
                  }
                />
                <label>
                  Perkenalan
                  <textarea
                    maxLength={300}
                    value={content.identity.bio}
                    onChange={(e) =>
                      change((d) => {
                        d.identity.bio = e.target.value;
                      })
                    }
                  />
                </label>
                {mediaControl(
                  "Foto profil",
                  "portrait",
                  "image/jpeg,image/png,image/webp",
                  content.identity.portraitAssetId,
                )}
              </>
            )}
            {selected === "wallet" && (
              <>
                <Field
                  label="Warna dompet"
                  type="color"
                  value={content.wallet.color}
                  onChange={(v) =>
                    change((d) => {
                      d.wallet.color = v;
                    })
                  }
                />
                <label>
                  Material
                  <select
                    value={content.wallet.materialPreset}
                    onChange={(e) =>
                      change((d) => {
                        d.wallet.materialPreset = e.target.value as
                          "original" | "matte";
                      })
                    }
                  >
                    <option value="original">Original</option>
                    <option value="matte">Matte</option>
                  </select>
                </label>
                <label>
                  Animasi
                  <select
                    value={content.wallet.animationPreset}
                    onChange={(e) =>
                      change((d) => {
                        d.wallet.animationPreset = e.target.value as
                          "normal" | "minimal";
                      })
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </label>
                <button
                  onClick={() =>
                    change((d) => {
                      d.wallet = structuredClone(defaultContent.wallet);
                    })
                  }
                >
                  Reset gaya dompet
                </button>
              </>
            )}
            {selected === "background" && (
              <>
                {mediaControl(
                  "Video desktop (MP4)",
                  "desktopVideoAssetId",
                  "video/mp4",
                  content.background.desktopVideoAssetId,
                )}
                {mediaControl(
                  "Video HP (opsional)",
                  "mobileVideoAssetId",
                  "video/mp4",
                  content.background.mobileVideoAssetId,
                )}
                {mediaControl(
                  "Poster / fallback",
                  "posterAssetId",
                  "image/jpeg,image/png,image/webp",
                  content.background.posterAssetId,
                )}
                <Field
                  label="Overlay (0.25–0.85)"
                  type="number"
                  value={content.background.overlayOpacity}
                  onChange={(v) =>
                    change((d) => {
                      d.background.overlayOpacity = Number(v);
                    })
                  }
                />
                <Field
                  label="Fokus horizontal (0–100)"
                  type="number"
                  value={content.background.focalX}
                  onChange={(v) =>
                    change((d) => {
                      d.background.focalX = Number(v);
                    })
                  }
                />
                <Field
                  label="Fokus vertikal (0–100)"
                  type="number"
                  value={content.background.focalY}
                  onChange={(v) =>
                    change((d) => {
                      d.background.focalY = Number(v);
                    })
                  }
                />
                <p className="fine">
                  Video selalu tanpa suara. File diverifikasi server; tidak ada
                  transcoding otomatis.
                </p>
              </>
            )}
            {selected === "theme" && (
              <>
                <Field
                  label="Warna aksen"
                  type="color"
                  value={content.theme.accent}
                  onChange={(v) =>
                    change((d) => {
                      d.theme.accent = v;
                    })
                  }
                />
                <label>
                  Font
                  <select
                    value={content.theme.fontPreset}
                    onChange={(e) =>
                      change((d) => {
                        d.theme.fontPreset = e.target.value as
                          "original" | "system";
                      })
                    }
                  >
                    <option value="original">Original</option>
                    <option value="system">Sistem</option>
                  </select>
                </label>
              </>
            )}
            {card && (
              <>
                <label>
                  Jenis kartu
                  <select
                    value={card.type}
                    onChange={(e) => updateCard("type", e.target.value)}
                  >
                    {["profile", "experience", "skills", "contact"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Judul kartu"
                  value={card.title}
                  maxLength={48}
                  onChange={(v) => updateCard("title", v)}
                />
                <Field
                  label="Subjudul"
                  value={card.subtitle}
                  maxLength={100}
                  onChange={(v) => updateCard("subtitle", v)}
                />
                <label>
                  Cerita
                  <textarea
                    maxLength={1200}
                    value={card.description}
                    onChange={(e) => updateCard("description", e.target.value)}
                  />
                </label>
                <Field
                  label="Tautan / WhatsApp (https://wa.me/…)"
                  value={card.link}
                  maxLength={500}
                  onChange={(v) => updateCard("link", v)}
                />
                <Field
                  label="Warna kartu"
                  value={card.color}
                  type="color"
                  onChange={(v) => updateCard("color", v)}
                />
                {mediaControl(
                  "Gambar kartu",
                  `card:${card.id}`,
                  "image/jpeg,image/png,image/webp",
                  card.imageAssetId,
                )}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={card.visible}
                    disabled={
                      card.visible &&
                      content.cards.filter((c) => c.visible).length === 1
                    }
                    onChange={(e) => updateCard("visible", e.target.checked)}
                  />
                  Tampilkan kartu
                </label>
                <button
                  disabled={content.cards.length >= 24}
                  onClick={() => {
                    const c = {
                      ...card,
                      id: crypto.randomUUID(),
                      title: card.title.slice(0, 40) + " (salin)",
                    };
                    change((d) => {
                      d.cards.push(c);
                    });
                    setSelected(`card:${c.id}`);
                  }}
                >
                  Duplikat kartu
                </button>
                <button
                  disabled={
                    content.cards.length === 1 ||
                    (card.visible &&
                      content.cards.filter((c) => c.visible).length === 1)
                  }
                  onClick={() => {
                    change((d) => {
                      d.cards = d.cards.filter((c) => c.id !== card.id);
                    });
                    setSelected("identity");
                  }}
                >
                  Hapus kartu
                </button>
              </>
            )}
            <hr />
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(content, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "namina-draft.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Unduh salinan draft
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "Muat versi server? Perubahan yang belum tersimpan di tab ini akan diganti. Unduh salinan draft lebih dahulu bila perlu.",
                  )
                )
                  void action(async () =>
                    draft.reset(await loadDraft(initial.site_id)),
                  );
              }}
            >
              Muat versi server
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
