import { useEffect, useRef, useState } from "react";
import { assetIds, type AssetUrls, type SiteContent } from "../domain/content";
import { mediaUrls } from "./sites";

export function useLoad<T>(
  load: () => Promise<T>,
  dependencies: unknown[] = [],
) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const key = JSON.stringify(dependencies);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [run, setRun] = useState(0);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    loadRef
      .current()
      .then((value) => {
        if (alive) setData(value);
      })
      .catch((e) => {
        if (alive) setError(e.message || "Gagal memuat data.");
      });
    return () => {
      alive = false;
    };
  }, [key, run]);
  return { data, error, reload: () => setRun((x) => x + 1) };
}

export function useMediaUrls(content: SiteContent | null, token?: string) {
  const snapshot = useRef(content);
  snapshot.current = content;
  const key = content ? assetIds(content).sort().join(",") : "";
  const [urls, setUrls] = useState<AssetUrls>({});
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setUrls({});
    setError("");
    const refresh = () => {
      if (!snapshot.current || !key) return;
      void mediaUrls(snapshot.current, token)
        .then((value) => {
          if (alive) {
            setUrls(value);
            setError("");
          }
        })
        .catch(() => {
          if (alive)
            setError(
              "Sebagian media tidak tersedia. Teks dan kartu tetap dapat dibuka.",
            );
        });
    };
    refresh();
    const timer = setInterval(refresh, 240000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [key, token]);
  return { urls, error };
}
