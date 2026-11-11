import { loadEnv, type Plugin } from "vite";

export function devApi(mode: string): Plugin {
  return {
    name: "namana-development-api",
    configureServer(server) {
      const values = loadEnv(mode, process.cwd(), "");
      for (const name of [
        "SUPABASE_URL",
        "VITE_SUPABASE_URL",
        "VITE_SUPABASE_PUBLISHABLE_KEY",
        "VITE_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "APP_ORIGIN",
        "NAMANA_GITHUB_REPO",
        "NAMANA_GITHUB_BRANCH",
        "NAMANA_GITHUB_TOKEN",
        "NAMANA_ADMIN_PASSWORD",
        "NAMANA_SESSION_SECRET",
      ]) {
        if (!process.env[name] && values[name])
          process.env[name] = values[name];
      }
      server.middlewares.use("/api/operations", async (req, res) => {
        try {
          let size = 0;
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            const buffer = Buffer.from(chunk);
            size += buffer.length;
            if (size > 16384) {
              res
                .writeHead(413)
                .end(JSON.stringify({ error: "Permintaan terlalu besar." }));
              return;
            }
            chunks.push(buffer);
          }
          const raw = Buffer.concat(chunks).toString("utf8");
          const body: unknown = raw ? JSON.parse(raw) : {};
          const endpoint = await server.ssrLoadModule("/api/operations.ts");
          await endpoint.default(Object.assign(req, { body }), res);
        } catch {
          if (!res.headersSent)
            res
              .writeHead(400, { "Content-Type": "application/json" })
              .end(JSON.stringify({ error: "Permintaan tidak valid." }));
        }
      });
      server.middlewares.use("/api/studio", async (req, res) => {
        try {
          let size = 0;
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            const buffer = Buffer.from(chunk);
            size += buffer.length;
            if (size > 262144) {
              res.writeHead(413).end(JSON.stringify({ error: "Data terlalu besar." }));
              return;
            }
            chunks.push(buffer);
          }
          const raw = Buffer.concat(chunks).toString("utf8");
          const body: unknown = raw ? JSON.parse(raw) : {};
          const endpoint = await server.ssrLoadModule("/api/studio.ts");
          await endpoint.default(Object.assign(req, { body }), res);
        } catch {
          if (!res.headersSent)
            res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Permintaan tidak valid." }));
        }
      });
    },
  };
}
