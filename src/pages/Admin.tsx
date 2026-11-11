import { useState, type FormEvent } from "react";
import { useAuth } from "../platform/auth-state";
import { api, db, rpc } from "../platform/client";
import { defaultContent, slugSchema } from "../domain/content";
import { listSites, type Site } from "../platform/sites";
import { Notice, Protected, Shell } from "./shared";
import { useLoad } from "../platform/hooks";
type Profile = {
  user_id: string;
  email: string;
  display_name: string;
  status: string;
};
type Limits = {
  image_bytes: number;
  video_bytes: number;
  quota_bytes: number;
  max_video_seconds: number;
  max_dimension: number;
};
export function Admin() {
  return (
    <Protected>
      <AdminGate />
    </Protected>
  );
}
function AdminGate() {
  const { admin } = useAuth();
  return (
    <Shell>
      <main className="page admin-page">
        {admin ? (
          <AdminContent />
        ) : (
          <>
            <h1>Akses superadmin</h1>
            <Notice>
              Memeriksa hak akses. Halaman ini hanya tersedia untuk superadmin
              yang ditetapkan di server.
            </Notice>
          </>
        )}
      </main>
    </Shell>
  );
}
function AdminContent() {
  const { data, error, reload } = useLoad(async () => {
    const [sites, profiles, assets, audit, settings, template] =
      await Promise.all([
        listSites(),
        db().from("namana_profiles").select("*").order("email"),
        db().from("namana_assets").select("bytes,site_id,verified"),
        db()
          .from("namana_audit")
          .select("id,action,created_at,site_id")
          .order("created_at", { ascending: false })
          .limit(30),
        db().from("namana_settings").select("*").single(),
        db()
          .from("namana_templates")
          .select("*")
          .eq("code", "ORIGINAL")
          .single(),
      ]);
    for (const result of [profiles, assets, audit, settings, template])
      if (result.error) throw result.error;
    return {
      sites,
      profiles: profiles.data as Profile[],
      assets: assets.data!,
      audit: audit.data!,
      settings: settings.data as Limits,
      active: template.data.active as boolean,
    };
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [slug, setSlug] = useState("");
  const [editing, setEditing] = useState<Site | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [reason, setReason] = useState("");
  const [limits, setLimits] = useState<Limits | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const action = async (work: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await work();
      reload();
    } catch (e) {
      setMessage((e as Error).message || "Operasi gagal.");
    } finally {
      setBusy(false);
    }
  };
  function invite(e: FormEvent) {
    e.preventDefault();
    void action(async () => {
      await api("invite", { email, name });
      setEmail("");
      setName("");
      setMessage("Undangan dikirim. Pilih klien untuk menyiapkan websitenya.");
    });
  }
  function provision(e: FormEvent) {
    e.preventDefault();
    void action(async () => {
      await rpc("provision", {
        p_owner: owner,
        p_slug: slugSchema.parse(slug),
        p_content: defaultContent,
      });
      setSlug("");
      setMessage("Website ORIGINAL disiapkan sebagai draft.");
    });
  }
  const tab = location.pathname.split("/")[2] || "overview";
  return (
    <>
      <p>Operasional NAMINA.PRO</p>
      <h1>Superadmin</h1>
      <nav className="admin-tabs" aria-label="Bagian admin">
        {[
          ["", "Ringkasan"],
          ["clients", "Klien"],
          ["sites", "Website"],
          ["templates", "Template & kuota"],
          ["orders", "Penjualan"],
        ].map(([path, label]) => (
          <a
            key={path}
            href={`/admin${path ? "/" + path : ""}`}
            aria-current={tab === (path || "overview") ? "page" : undefined}
          >
            {label}
          </a>
        ))}
      </nav>
      {error && (
        <>
          <Notice error>{error}</Notice>
          <button onClick={reload}>Coba lagi</button>
        </>
      )}
      {!data && !error && <Notice>Memuat data operasional…</Notice>}
      {message && <Notice>{message}</Notice>}
      {data && (
        <>
          {tab === "overview" && (
            <>
              <dl className="metrics">
                <div>
                <dt>Akun terdaftar</dt>
                  <dd>{data.profiles.length}</dd>
                </div>
                <div>
                  <dt>Website aktif</dt>
                  <dd>
                    {data.sites.filter((s) => s.status === "active").length}
                  </dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd>
                    {data.sites.filter((s) => !!s.published_version_id).length}
                  </dd>
                </div>
                <div>
                  <dt>Belum publish</dt>
                  <dd>
                    {data.sites.filter((s) => !s.published_version_id).length}
                  </dd>
                </div>
                <div>
                  <dt>Ditangguhkan</dt>
                  <dd>
                    {data.sites.filter((s) => s.status === "suspended").length}
                  </dd>
                </div>
                <div>
                  <dt>Media tersimpan</dt>
                  <dd>
                    {(
                      data.assets.reduce((n, a) => n + a.bytes, 0) / 1048576
                    ).toFixed(1)}{" "}
                    MB
                  </dd>
                </div>
              </dl>
              <h2>Aktivitas terakhir</h2>
              {data.audit.length === 0 ? (
                <Notice>Belum ada aktivitas.</Notice>
              ) : (
                <ul className="audit-list">
                  {data.audit.map((a) => (
                    <li key={a.id}>
                      <strong>{a.action}</strong>
                      <span>
                        {new Date(a.created_at).toLocaleString("id-ID")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {tab === "clients" && (
            <>
              <section className="admin-form">
                <h2>Undang klien</h2>
                <form className="form-stack" onSubmit={invite}>
                  <label>
                    Nama klien
                    <input
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Kirim undangan
                  </button>
                </form>
              </section>
              <h2>Klien</h2>
              {data.profiles.length === 0 && <Notice>Belum ada klien.</Notice>}
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Klien</th>
                      <th>Status</th>
                      <th>Website</th>
                      <th>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.profiles.map((p) => (
                      <tr key={p.user_id}>
                        <td>
                          {p.display_name || "Belum mengisi nama"}
                          <small>{p.email}</small>
                        </td>
                        <td>{p.status}</td>
                        <td>
                          {
                            data.sites.filter((s) => s.owner_id === p.user_id)
                              .length
                          }
                        </td>
                        <td>
                          <button
                            disabled={busy}
                            onClick={() =>
                              void action(async () => {
                                await rpc("admin_client", {
                                  p_user: p.user_id,
                                  p_status:
                                    p.status === "active"
                                      ? "inactive"
                                      : "active",
                                });
                                setMessage("Status klien diperbarui.");
                              })
                            }
                          >
                            {p.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              void action(async () => {
                                await api("resend", { userId: p.user_id });
                                setMessage("Tautan akses baru dikirim.");
                              })
                            }
                          >
                            Kirim ulang akses
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {tab === "sites" && (
            <>
              <section className="admin-form">
                <h2>Siapkan website ORIGINAL</h2>
                <form className="form-stack" onSubmit={provision}>
                  <label>
                    Klien
                    <select
                      required
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                    >
                      <option value="">Pilih klien</option>
                      {data.profiles
                        .filter(
                          (p) =>
                            p.status === "active" &&
                            !data.sites.some((s) => s.owner_id === p.user_id),
                        )
                        .map((p) => (
                          <option key={p.user_id} value={p.user_id}>
                            {p.display_name || p.email}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Slug publik
                    <input
                      required
                      minLength={3}
                      maxLength={48}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Buat website draft
                  </button>
                </form>
              </section>
              <label className="search">
                Cari website atau klien
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {data.sites.length === 0 && <Notice>Belum ada website.</Notice>}
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Website</th>
                      <th>Pemilik</th>
                      <th>Status</th>
                      <th>Media</th>
                      <th>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sites
                      .filter((s) =>
                        `${s.slug} ${data.profiles.find((p) => p.user_id === s.owner_id)?.email}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((s) => (
                        <tr key={s.id}>
                          <td>
                            /{s.slug}
                            <small>
                              {new Date(s.updated_at).toLocaleString("id-ID")}
                            </small>
                          </td>
                          <td>
                            {
                              data.profiles.find(
                                (p) => p.user_id === s.owner_id,
                              )?.email
                            }
                          </td>
                          <td>
                            {s.status} •{" "}
                            {s.published_version_id ? "published" : "draft"}
                          </td>
                          <td>
                            {(
                              data.assets
                                .filter((a) => a.site_id === s.id)
                                .reduce((n, a) => n + a.bytes, 0) / 1048576
                            ).toFixed(1)}{" "}
                            MB
                          </td>
                          <td>
                            <a href={`/studio/sites/${s.id}`}>Bantu edit</a>
                            {s.published_version_id && (
                              <a
                                href={`/${s.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Buka publik
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setEditing(s);
                                setEditSlug(s.slug);
                                setReason("");
                              }}
                            >
                              Atur slug / status
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {editing && (
                <section className="admin-form">
                  <h2>Pengaturan /{editing.slug}</h2>
                  <form
                    className="form-stack"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action(async () => {
                        await rpc("admin_site", {
                          p_site: editing.id,
                          p_slug: slugSchema.parse(editSlug),
                          p_status:
                            editing.status === "active"
                              ? "suspended"
                              : "active",
                          p_reason: reason,
                        });
                        setEditing(null);
                        setMessage("Website diperbarui.");
                      });
                    }}
                  >
                    <label>
                      Slug
                      <input
                        required
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                      />
                    </label>
                    <label>
                      Alasan perubahan
                      <textarea
                        required
                        minLength={3}
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </label>
                    <button disabled={busy}>
                      Simpan &{" "}
                      {editing.status === "active" ? "tangguhkan" : "aktifkan"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          await rpc("admin_site", {
                            p_site: editing.id,
                            p_slug: slugSchema.parse(editSlug),
                            p_status: editing.status,
                            p_reason: reason,
                          });
                          setEditing(null);
                          setMessage("Slug diperbarui.");
                        })
                      }
                    >
                      Simpan slug saja
                    </button>
                    <button type="button" onClick={() => setEditing(null)}>
                      Batal
                    </button>
                  </form>
                </section>
              )}
            </>
          )}
          {tab === "templates" && (
            <section className="admin-form">
              <h2>ORIGINAL</h2>
              <p>
                Batas teknis awal, belum merupakan paket penjualan. Perubahan
                batas tidak menghapus media lama.
              </p>
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    await rpc("admin_settings", {
                      p_settings: limits || data.settings,
                      p_active: active ?? data.active,
                    });
                    setMessage("Pengaturan tersimpan.");
                  });
                }}
              >
                {(
                  [
                    "image_bytes",
                    "video_bytes",
                    "quota_bytes",
                    "max_video_seconds",
                    "max_dimension",
                  ] as const
                ).map((key, i) => (
                  <label key={key}>
                    {
                      [
                        "Ukuran gambar maksimum (byte)",
                        "Ukuran video maksimum (byte)",
                        "Kuota website (byte)",
                        "Durasi video (detik)",
                        "Resolusi maksimum (px)",
                      ][i]
                    }
                    <input
                      type="number"
                      required
                      value={(limits || data.settings)[key]}
                      onChange={(e) =>
                        setLimits({
                          ...(limits || data.settings),
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={active ?? data.active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  Aktif untuk website baru
                </label>
                <button disabled={busy}>Simpan template & kuota</button>
              </form>
            </section>
          )}
          {tab === "orders" && (
            <Notice>
              Penjualan dan pembayaran belum diaktifkan. Tidak ada transaksi
              atau pendapatan yang dilaporkan.
            </Notice>
          )}
        </>
      )}
    </>
  );
}
