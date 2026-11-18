import {readFileSync,existsSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import assert from "node:assert/strict";

const root=resolve(import.meta.dirname,"..");
const read=path=>readFileSync(join(root,path),"utf8");
const pages=["index.html","account.html","admin.html","privacy.html","terms.html"];
let checks=0;
function ok(value,message){assert.ok(value,message);checks++}
for(const file of pages){
 const html=read(file);
 ok(html.startsWith("<!doctype html>"),file+" should have an HTML doctype");
 ok(html.includes('<meta name="viewport"'),file+" should support responsive viewport");
 ok(!html.includes("service_role_key"),file+" should not embed privileged keys");
 const modules=[...html.matchAll(/<script\s+type="module">([\s\S]*?)<\/script>/g)];
 for(const [,source] of modules){
   const script=source.replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];\s*/gm,"");
   new Function("return (async function(){\n"+script+"\n})");
   checks++;
 }
 for(const [,url] of html.matchAll(/(?:href|src)=["'](\.\/[^"']+)["']/g)){
   const local=url.split("#")[0].split("?")[0];
   ok(existsSync(join(root,local)),file+" missing linked asset "+url);
 }
 ok(!html.includes("innerHTML ="),file+" must not inject remote text as HTML");
}
for(const file of ["sw.js","config.js"]){new Function(read(file));checks++}
new Function(read("cloud.js").replace(/^export\s+/gm,"").replace(/(^|\n)export\s+/g,"$1"));checks++;
const manifest=JSON.parse(read("manifest.webmanifest"));checks++;
ok(manifest.display==="standalone","PWA display standalone");
for(const icon of manifest.icons){
 const file=join(root,icon.src);
 ok(existsSync(file),"missing PWA icon "+icon.src);
 if(icon.type==="image/png"){
   const b=readFileSync(file);
   ok(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),"invalid PNG "+icon.src);
   const size=Number(icon.sizes.split("x")[0]);
   ok(b.readUInt32BE(16)===size&&b.readUInt32BE(20)===size,"wrong image dimensions "+icon.src);
 }
}
const sql=read("schema.sql");
for(const name of ["subscription_records","catalog_products","staff_members","subscription_inquiries"]){
 ok(sql.includes("alter table public."+name+" enable row level security"),"RLS missing for "+name);
}
ok(sql.includes('grant select on public.staff_members to authenticated'),"staff table public access check");
ok(sql.includes("Inquiries owner delete"),"account deletion of inquiries missing");
console.log("AI HUB smoke checks passed: "+checks);
