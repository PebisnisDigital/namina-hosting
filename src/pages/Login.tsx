import { useState, type FormEvent } from "react";
import { configured, db } from "../platform/client";
import { Notice, Shell } from "./shared";
export function Login({ recovery = false }: { recovery?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = recovery
        ? await db().auth.updateUser({ password })
        : await db().auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      location.assign("/dashboard");
    } catch {
      setError(
        recovery
          ? "Password gagal disimpan. Buka tautan undangan/reset terbaru."
          : "Login gagal. Periksa email dan password, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setError("");
    setBusy(true);
    try {
      const result = await db().auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth`,
      });
      if (result.error) throw result.error;
      setMessage("Jika email terdaftar, tautan reset akan dikirim.");
    } catch {
      setError("Permintaan reset gagal. Periksa email dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <main className="page login-page">
        <p>NAMINA Studio</p>
        <h1>{recovery ? "Atur password Anda" : "Kembali ke cerita Anda."}</h1>
        {!configured && (
          <Notice error>
            Koneksi Supabase NAMINA belum dikonfigurasi. Login belum tersedia.
          </Notice>
        )}
        <form onSubmit={submit} className="form-stack">
          {!recovery && (
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              required
              minLength={recovery ? 10 : undefined}
              autoComplete={recovery ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy || !configured}>
            {busy ? "Memproses…" : recovery ? "Simpan password" : "Login"}
          </button>
          {!recovery && (
            <button
              type="button"
              disabled={busy || !configured || !email}
              onClick={() => void reset()}
            >
              Kirim tautan reset password
            </button>
          )}
        </form>
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <p className="fine">
          Akun disiapkan oleh pengelola. Tidak ada pendaftaran mandiri.
        </p>
      </main>
    </Shell>
  );
}
