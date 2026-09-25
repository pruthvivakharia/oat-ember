const fs=require("fs"),path=require("path"),zlib=require("zlib"),cp=require("child_process");
const root=process.cwd(), releaseDir=path.join(root,"release");
const parts=fs.readdirSync(releaseDir).filter(n=>/^payload-\d+\.b64$/.test(n)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));
if(!parts.length) throw new Error("Missing final source payload.");
const encoded=parts.map(n=>fs.readFileSync(path.join(releaseDir,n),"utf8").trim()).join("");
const tar=zlib.brotliDecompressSync(Buffer.from(encoded,"base64"));
const temp=path.join("/tmp","ember-oak-final.tar");
fs.writeFileSync(temp,tar);
try{cp.execFileSync("tar",["-xf",temp,"-C",root],{stdio:"inherit"});}finally{fs.rmSync(temp,{force:true});}
