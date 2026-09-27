#!/usr/bin/env node
'use strict';
// Conservación del encargo: contenido/rutas ES, recursos EN, y activos desde el canon.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const WEB=path.resolve(__dirname,'..');
const ONTOS=process.env.ONTOS_BRAND_ROOT||path.resolve(WEB,'../ONTOS');
const BASE='a7bc996e35f64e7ef74e5d811c74755af6895312';
const git=(...args)=>execFileSync('git',args,{cwd:WEB,encoding:'utf8',maxBuffer:20*1024*1024});
const pages=fs.readdirSync(WEB).filter(f=>f.endsWith('.html')).concat(['editor-pdf/index.html']);
const changed=git('diff',BASE,'--name-only').trim().split('\n');
const protectedFile=f=>f.startsWith('en/')||f.startsWith('i18n/en/')||f.startsWith('experiencias/')||f==='sitemap.xml'||f==='brand/tokens.css'||f==='brand/barra.js'||f==='brand/favicon.svg'||f==='brand/logo.svg';
assert.deepEqual(changed.filter(protectedFile),[],'EN y sus recursos conservan su versión');
for(const file of pages){const html=fs.readFileSync(path.join(WEB,file),'utf8');assert(html.includes('data-ontos-web'),file+' activa marca');assert(html.includes('/canon/tokens.css'),file+' carga tokens');assert(html.includes('/marca-es.css'),file+' carga CSS común');assert(!/<circle[^>]+r="16\.5"/.test(html),file+' no conserva símbolo anterior');}
require('./import-marca.cjs').run(ONTOS,{check:true});
function signature({html,baseline=false}){
 const d=new DOMParser().parseFromString(html,'text/html');
 const clean=s=>s.replace(/\s+/g,' ').trim();
 // Cambio explícito de Fernando (27-sep): Consultoría es inicio y sale del menú.
 // Solo se descuenta ese enlace de la base; se conserva todo el contenido restante.
 const homeLinks=[...d.querySelectorAll('header.barra nav a.item')].filter(e=>clean(e.textContent)==='Consultoría');
 if(baseline){for(const e of homeLinks){if(e.getAttribute('href')!=='/')throw Error('Destino de Consultoría inesperado');e.remove();}}
 else if(homeLinks.length)throw Error('Consultoría sigue en la cabecera');
 for(const e of d.querySelectorAll('script,style,svg,template,noscript'))e.remove();
 for(const e of d.querySelectorAll('a.marca'))e.textContent='ONTOS';
 return {title:d.title,description:d.querySelector('meta[name=description]')?.content||'',canonical:d.querySelector('link[rel=canonical]')?.getAttribute('href')||'',
 text:clean(d.body.textContent),headings:[...d.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e=>[e.tagName,clean(e.textContent)]),
 links:[...d.querySelectorAll('a[href]')].map(e=>[e.getAttribute('href'),clean(e.textContent)]),
 structure:[...d.body.querySelectorAll('*')].map(e=>[e.tagName,e.id,e.getAttribute('role')||'']),
 forms:[...d.querySelectorAll('form,input,textarea,select,button')].map(e=>[e.tagName,e.getAttribute('action'),e.getAttribute('method'),e.getAttribute('name'),e.getAttribute('type'),e.hasAttribute('required')]),
 media:[...d.querySelectorAll('video,source,iframe,img:not(.marca-light):not(.marca-dark)')].map(e=>[e.tagName,e.getAttribute('src'),e.getAttribute('poster'),e.getAttribute('alt')])};
}
(async()=>{
 const {webkit}=require(process.env.PLAYWRIGHT_MODULE||path.join(ONTOS,'scripts/verify/node_modules/playwright'));
 const browser=await webkit.launch();
 try{
  const page=await browser.newPage();
  for(const file of pages){const before=await page.evaluate(signature,{html:git('show',BASE+':'+file),baseline:true});const after=await page.evaluate(signature,{html:fs.readFileSync(path.join(WEB,file),'utf8')});assert.deepEqual(after,before,file+': contenido conservado salvo retirada autorizada de Consultoría del menú');}
  console.log(`PASS marca ES: ${pages.length} páginas conservan contenido salvo Consultoría en el menú; EN y recursos compartidos intactos; canon reproducible.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
