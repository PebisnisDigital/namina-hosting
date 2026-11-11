import { type ReactNode } from "react";
import { useAuth } from "../platform/auth-state";
import { configured } from "../platform/client";

export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={error ? "notice notice--error" : "notice"}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-nav">
        <a className="wordmark" href="/">
          NAMINA
        </a>
        <nav aria-label="Navigasi aplikasi">
          <a href="/vini">Demo ORIGINAL</a>
          <a href="/studio">Studio admin</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
export function Protected({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth();
  if (!configured)
    return (
      <Shell>
        <main className="page">
          <h1>Koneksi belum tersedia</h1>
          <Notice>
            Koneksi Supabase NAMINA belum dikonfigurasi. Login dan penyimpanan
            belum dapat digunakan.
          </Notice>
          <a href="/vini">Lihat demo ORIGINAL</a>
        </main>
      </Shell>
    );
  if (!ready) return <Notice>Memeriksa sesi…</Notice>;
  if (!session)
    return (
      <Shell>
        <main className="page">
          <h1>Silakan login</h1>
          <a className="primary" href="/login">
            Login ke akun Anda
          </a>
        </main>
      </Shell>
    );
  return children;
}
