const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const cp = require("child_process");

const root = process.cwd();
for (const name of ["app","components","hooks","lib","prisma","public","next-env.d.ts","next.config.ts","package.json","tsconfig.json","eslint.config.mjs"]) {
  fs.rmSync(path.join(root, name), { recursive: true, force: true });
}

const releaseDir = path.join(root, "release");
const parts = fs.readdirSync(releaseDir)
  .filter((name) => /^payload-\d+\.b64$/.test(name))
  .sort((a,b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

if (!parts.length) throw new Error("No release payload chunks found.");

const encoded = parts.map((name) => fs.readFileSync(path.join(releaseDir,name),"utf8").trim()).join("");
const archive = Buffer.from(encoded,"base64");
const tar = zlib.brotliDecompressSync(archive);
const tarPath = path.join("/tmp","ember-oak-release.tar");
fs.writeFileSync(tarPath, tar);
try {
  cp.execFileSync("tar", ["-xf", tarPath, "-C", root], { stdio: "inherit" });
} finally {
  fs.rmSync(tarPath, { force: true });
}
