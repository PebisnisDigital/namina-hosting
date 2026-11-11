import { useState } from "react";
import { api, db } from "../platform/client";
import { useLoad } from "../platform/hooks";
import { Notice } from "./shared";
import type { Selection } from "../domain/content";

type Asset = { id: string; mime: string; bytes: number; verified: boolean };
export function MediaLibrary({
  siteId,
  revisionKey,
  selected,
  onChoose,
}: {
  siteId: string;
  revisionKey: string;
  selected: Selection;
  onChoose: (id: string, video: boolean) => void;
}) {
  const { data, error, reload } = useLoad(async () => {
    const { data, error } = await db()
      .from("namana_assets")
      .select("id,mime,bytes,verified")
      .eq("site_id", siteId);
    if (error) throw error;
    return data as Asset[];
  }, [siteId, revisionKey]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="media-library">
      <summary>Media website</summary>
      <p className="fine">
        Pilih Identitas, Kartu, atau Latar, lalu pakai media yang sudah
        diunggah.
      </p>
      <button onClick={reload}>Muat ulang media</button>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {!data && !error && <Notice>Memuat media…</Notice>}
      {data?.length === 0 && <p>Belum ada media.</p>}
      {data && (
        <p className="fine">
          {(data.reduce((n, a) => n + a.bytes, 0) / 1048576).toFixed(2)} MiB
          terpakai termasuk upload tertunda.
        </p>
      )}
      {data?.map((asset) => (
        <div key={asset.id} className="library-asset">
          <p>
            {asset.mime} • {Math.ceil(asset.bytes / 1024)} KiB
            <br />
            <small>{asset.id.slice(0, 8)}</small>
          </p>
          {asset.verified ? (
            <button
              disabled={
                busy ||
                (!["identity", "background"].includes(selected) &&
                  !selected.startsWith("card:")) ||
                (asset.mime === "video/mp4" && selected !== "background")
              }
              onClick={() => onChoose(asset.id, asset.mime === "video/mp4")}
            >
              Pakai di elemen terpilih
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setMessage("");
                void api("cancel", { id: asset.id })
                  .then(() => {
                    reload();
                    setMessage("Upload tertunda dibatalkan.");
                  })
                  .catch(() =>
                    setMessage("Gagal membatalkan upload. Coba lagi."),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Batalkan upload tertunda
            </button>
          )}
        </div>
      ))}
    </details>
  );
}
