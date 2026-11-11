import { cpSync, mkdirSync } from "node:fs";

mkdirSync("hosting-dist/api", { recursive: true });
for (const filename of ["generator.php", "generator-lib.php", "setup-generator.php", ".htaccess"]) {
  cpSync(`api/${filename}`, `hosting-dist/api/${filename}`);
}

// The generated /client/index.html is a publish template. PHP copies it to
// /{slug}/index.html and writes /clients/{slug}.json with no runtime Node.js.
