import { useState, type FormEvent } from "react";
import { useAuth } from "../platform/auth-state";
import { db, rpc } from "../platform/client";
import { listSites, loadDraft } from "../platform/sites";
import { Notice, Protected, Shell } from "./shared";
import { useLoad } from "../platform/hooks";
export function Dashboard() {
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}
function DashboardContent() {
  const { session } = useAuth();
  const { data, error, reload } = useLoad(async () => {
    const sites = (await listSites()).filter(
      (s) => s.owner_id === session!.user.id,
    );
    return Promise.all(
      sites.map(async (site) => ({ ...site, draft: await loadDraft(site.id) })),
    );
  });
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  async function account(e: FormEvent) {
    e.preventDefault();
    try {
      await rpc("account", { p_name: name });
      if (password) {
        const result = await db().auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword("");
      }
      setMessage("Profil akun tersimpan.");
    } catch {
      setMessage("Gagal menyimpan profil akun.");
    }
  }
  return (
    <Shell>
      <main className="page">
        <p>Ruang klien</p>
        <h1>Website saya</h1>
        {error && (
          <>
            <Notice error>{error}</Notice>
            <button onClick={reload}>Coba lagi</button>
          </>
        )}
        {!data && !error && <Notice>Memuat website…</Notice>}
        {data?.length === 0 && (
          <Notice>
            Website Anda belum disiapkan. Hubungi pengelola yang mengundang
            Anda.
          </Notice>
        )}
        {data?.map((site) => (
          <section className="site-summary" key={site.id}>
            <div>
              <p className="section-label">ORIGINAL</p>
              <h2>{site.draft.content.identity.displayName}</h2>
              <p>/{site.slug}</p>
              <p>
                {site.status === "suspended"
                  ? "Ditangguhkan"
                  : site.published_revision
                    ? site.published_revision === site.draft.revision
                      ? "Published"
                      : "Perubahan draft belum terbit"
                    : "Belum dipublikasikan"}
              </p>
              <p className="fine">
                Diperbarui {new Date(site.updated_at).toLocaleString("id-ID")}
              </p>
            </div>
            <div className="actions">
              <a className="primary" href={`/studio/sites/${site.id}`}>
                Edit web
              </a>
              <a href={`/studio/sites/${site.id}?mode=preview`}>
                Preview privat
              </a>
              {site.published_version_id && site.status === "active" && (
                <a
                  href={`/${site.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lihat web
                </a>
              )}
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(`${location.origin}/${site.slug}`)
                    .then(() => setMessage("URL disalin."))
                    .catch(() =>
                      setMessage(
                        `URL website: ${location.origin}/${site.slug}`,
                      ),
                    )
                }
              >
                Salin URL
              </button>
            </div>
          </section>
        ))}
        <section className="account-section">
          <h2>Profil akun</h2>
          <p>{session?.user.email}</p>
          <form className="form-stack" onSubmit={account}>
            <label>
              Nama akun
              <input
                maxLength={100}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Password baru (opsional)
              <input
                type="password"
                minLength={10}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button>Simpan profil akun</button>
          </form>
        </section>
        {message && <Notice>{message}</Notice>}
      </main>
    </Shell>
  );
}
