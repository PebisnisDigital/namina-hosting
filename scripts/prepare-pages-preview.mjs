import { cpSync, mkdirSync, writeFileSync } from "node:fs";

const output = "pages-preview-dist";
mkdirSync(output, { recursive: true });

// Pages is static-only. Publish the public review experience, never the PHP
// generator or client editing screens that require server-side access control.
for (const path of [
  "index.html",
  "favicon.svg",
  "assets",
  "animated-icons",
  "clients/vini.json",
  "icons",
  "images",
  "videos",
  "vini",
]) {
  const destination = `${output}/${path}`;
  mkdirSync(destination.slice(0, destination.lastIndexOf("/")), { recursive: true });
  cpSync(`pages-dist/${path}`, destination, { recursive: true });
}

for (const route of ["privacy", "terms"]) {
  mkdirSync(`${output}/${route}`, { recursive: true });
  cpSync("pages-dist/index.html", `${output}/${route}/index.html`);
}

writeFileSync(`${output}/.nojekyll`, "");
writeFileSync(`${output}/robots.txt`, "User-agent: *\nDisallow: /\n");
