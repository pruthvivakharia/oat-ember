const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const cp = require("child_process");

const releaseDir = path.join(process.cwd(), "release");
const parts = fs.readdirSync(releaseDir)
  .filter((name) => /^payload-\d+\.b64$/.test(name))
  .sort();

if (!parts.length) throw new Error("No release payload chunks found.");

const encoded = parts.map((name) => fs.readFileSync(path.join(releaseDir, name), "utf8").trim()).join("");
const archive = Buffer.from(encoded, "base64");
const tarPath = path.join(releaseDir, "final-source.tar.br");
fs.writeFileSync(tarPath, archive);

try {
  const tar = zlib.brotliDecompressSync(archive);
  const gzPath = path.join(releaseDir, "final-source.tar");
  fs.writeFileSync(gzPath, tar);
  cp.execFileSync("tar", ["-xf", gzPath, "-C", process.cwd()], { stdio: "inherit" });
  fs.unlinkSync(gzPath);
} finally {
  fs.unlinkSync(tarPath);
}
