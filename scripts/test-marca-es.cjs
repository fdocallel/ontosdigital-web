#!/usr/bin/env node
'use strict';
// Conservación del encargo: contenido/rutas ES, recursos EN, y activos desde el canon.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const WEB=path.resolve(__dirname,'..');
const ONTOS=process.env.ONTOS_BRAND_ROOT||path.resolve(WEB,'../ONTOS');
const subtitle=JSON.parse(fs.readFileSync(path.join(ONTOS,'data/mensaje.json'),'utf8')).superficies.find(s=>s.id==='web.subtitulo')?.es;
assert(subtitle,'Subtítulo de portada declarado en su fuente');
const bilingual=process.argv.includes('--bilingue');
const BASE='a7bc996e35f64e7ef74e5d811c74755af6895312';
const revision=require('./fixtures/revision-prepublicacion.json');
const git=(...args)=>execFileSync('git',args,{cwd:WEB,encoding:'utf8',maxBuffer:20*1024*1024});
const pages=fs.readdirSync(WEB).filter(f=>f.endsWith('.html')).concat(['editor-pdf/index.html']);
const changed=git('diff',BASE,'--name-only').trim().split('\n');
const protectedFile=f=>(!bilingual&&(f.startsWith('en/')||f.startsWith('i18n/en/')))||f.startsWith('experiencias/')||f==='brand/tokens.css'||f==='brand/barra.js'||f==='brand/favicon.svg'||f==='brand/logo.svg';
// Recursos compartidos: desde la publicación de la v5 (28-sep-2026, main 477ca94) la base es lo
// publicado, no la rama previa. Fernando autoriza el 28-sep-2026 tocar barra.js y tokens.css para
// el dock móvil y la auditoría móvil; cambios posteriores se comparan con lo publicado.
const PUBLICADA='477ca9424fddeaae71de45dcc508175e22bacca5';
const permitidos=new Set(['brand/barra.js','brand/tokens.css']);
const cambiadosDesdePublicada=new Set(git('diff',PUBLICADA,'--name-only').trim().split('\n'));
assert.deepEqual(changed.filter(protectedFile).filter(f=>!(permitidos.has(f)&&cambiadosDesdePublicada.has(f)&&!git('diff',BASE,PUBLICADA,'--name-only').split('\n').includes(f))),[],'EN y sus recursos conservan su versión');
const sitemap=fs.readFileSync(path.join(WEB,'sitemap.xml'),'utf8'),oldSitemap=git('show',BASE+':sitemap.xml');
const englishBlocks=xml=>(xml.match(/  <url>[\s\S]*?<\/url>\n/g)||[]).filter(block=>block.includes('<loc>https://ontosdigital.es/en/'));
if(!bilingual)assert.deepEqual(englishBlocks(sitemap),englishBlocks(oldSitemap),'Sitemap: las entradas inglesas no cambian');
const urls=xml=>[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]).sort();
if(!bilingual)assert.deepEqual(urls(sitemap),urls(oldSitemap),'Sitemap: las mismas rutas, solo se actualizan fechas ES');
else {
 const spanish=urls(sitemap).filter(url=>!url.includes('/en/'));
 // Producto oculto (Fernando, 28-sep-2026): noindex, sin enlaces y fuera del sitemap.
 const ocultas=['https://ontosdigital.es/producto.html'];
 assert.deepEqual(spanish,urls(oldSitemap).filter(url=>!url.includes('/en/')&&!ocultas.includes(url)),'Sitemap: conservar todas las rutas ES');
 assert.deepEqual(urls(sitemap).filter(url=>url.includes('/en/')),spanish.filter(url=>!url.endsWith('/editor-pdf/')).map(url=>url.replace('https://ontosdigital.es/','https://ontosdigital.es/en/')).sort(),'Sitemap: espejo EN de todas las páginas indexables salvo editor bilingüe');
 for(const file of pages.filter(file=>file!=='editor-pdf/index.html')){
  const english=fs.readFileSync(path.join(WEB,'en',file),'utf8');
  assert(/<html[^>]*lang="en"/.test(english),file+': idioma inglés');
  assert(english.includes('data-ontos-web'),file+': marca inglesa');
  assert(english.includes('/canon/tokens.css')&&english.includes('/marca-es.css'),file+': recursos compartidos de marca');
 }
 const englishHome=fs.readFileSync(path.join(WEB,'en/index.html'),'utf8');
 const englishSubtitle=JSON.parse(fs.readFileSync(path.join(ONTOS,'data/mensaje.json'),'utf8')).superficies.find(s=>s.id==='web.subtitulo')?.en;
 assert(englishSubtitle&&englishHome.includes(englishSubtitle),'Subtítulo inglés canónico');
}
for(const file of pages){const html=fs.readFileSync(path.join(WEB,file),'utf8');assert(html.includes('data-ontos-web'),file+' activa marca');assert(html.includes('/canon/tokens.css'),file+' carga tokens');assert(html.includes('/marca-es.css'),file+' carga CSS común');assert(!/<circle[^>]+r="16\.5"/.test(html),file+' no conserva símbolo anterior');}
require('./import-marca.cjs').run(ONTOS,{check:true});
// Mozilla GHSA-wgrm-67xf-hhpq: toda apertura de PDF desactiva la evaluación.
function checkPdfSecurity(html){
 const calls=[...html.matchAll(/pdfjsLib\.getDocument\s*\(\s*(\{[^}]*\})\s*\)/g)];
 assert(calls.length>0,'El editor debe tener aperturas de PDF verificables');
 assert.equal(calls.length,(html.match(/pdfjsLib\.getDocument\s*\(/g)||[]).length,'Revisar nueva forma de abrir PDF');
 for(const call of calls)assert(/\bisEvalSupported\s*:\s*false\b/.test(call[1]),'PDF.js: isEvalSupported debe ser false');
}
const editorHtml=fs.readFileSync(path.join(WEB,'editor-pdf/index.html'),'utf8');
checkPdfSecurity(editorHtml);
assert.throws(()=>checkPdfSecurity(editorHtml.replace(/isEvalSupported\s*:\s*false/g,'isEvalSupported: true')),/isEvalSupported/,'Caso rojo: la configuración vulnerable debe bloquear el guard');
function signature({html,baseline=false,file,subtitle,revision}){
 const d=new DOMParser().parseFromString(html,'text/html');
 const clean=s=>s.replace(/\s+/g,' ').trim();
 if(!baseline&&d.querySelector('header.barra')){
  if(d.querySelectorAll('main').length!==1||!d.querySelector('main#contenido[tabindex="-1"]')||d.querySelector('.skip-link')?.getAttribute('href')!=='#contenido')throw Error(file+': falta main y salto de teclado operativo');
 }
 // Cambio explícito de Fernando (27-sep): Consultoría es inicio y sale del menú.
 // Solo se descuenta ese enlace de la base; se conserva todo el contenido restante.
 const homeLinks=[...d.querySelectorAll('header.barra nav a.item')].filter(e=>clean(e.textContent)==='Consultoría');
 if(baseline){for(const e of homeLinks){if(e.getAttribute('href')!=='/')throw Error('Destino de Consultoría inesperado');e.remove();}}
 else if(homeLinks.length)throw Error('Consultoría sigue en la cabecera');
 // Segunda petición explícita: lema antes del panel y resto de la apertura dentro.
 // Transformar solo la base permite seguir detectando pérdidas en el resto de la home.
 if(baseline&&file==='index.html'){
  const hero=d.querySelector('body > .hero'),lema=hero?.querySelector('.lema');
  if(!hero||!lema)throw Error('Falta la apertura de referencia');
  const intro=d.createElement('div'),inner=d.createElement('div');
  intro.append(lema);hero.before(intro);
  const aside=d.createElement('p');aside.textContent=subtitle;intro.append('\n',aside);
  inner.append(...hero.childNodes);hero.append(inner);
 }
 // Tercera petición explícita (Fernando, 28-sep-2026): la home sin «Quién» y con los trabajos
 // más cortos (sin su párrafo). Solo esos fragmentos salen de la base.
 if(baseline&&file==='index.html'){
  d.querySelector('section#quien')?.remove();
  for(const p of d.querySelectorAll('#trabajos .trabajo .texto > p'))p.remove();
 }
 // Cuarta petición (Fernando, 28-sep-2026): «El sistema completo» y «Leer el caso» son de ONTOS
 // personal, no de empresarial. Se mueven en la base; lo demás sigue congelado.
 if(baseline&&file==='aplicaciones.html'){
  const emp=d.querySelector('#ontos-empresarial ul.videos'),per=d.querySelector('#ontos-personal ul.videos');
  if(!emp||!per)throw Error('Próximamente: faltan las listas de referencia');
  per.append(...emp.childNodes);emp.remove();
 }
 // Quinta petición (Fernando, 28-sep-2026): producto oculto. Se quitan en la base solo sus enlaces
 // de entrada (Aplicaciones y Sobre mí); producto.html añade noindex y conserva su contenido.
 if(baseline&&file==='aplicaciones.html')d.querySelector('.proximo-pie')?.remove();
 if(baseline&&file==='fernando-calle.html')for(const a of d.querySelectorAll('a[href="producto.html"]'))a.replaceWith(...a.childNodes);
 // La auditoría autoriza cambios editoriales concretos; se congelan por fragmento.
 if(baseline){
  if(file==='servicios.html'){const canonical=d.createElement('link');canonical.rel='canonical';canonical.href='https://ontosdigital.es/aplicaciones.html';d.head.append(canonical);}
  if(file==='404.html')for(const a of d.querySelectorAll('a[href]'))if(['bim.html','contacto.html','aviso-legal.html','privacidad.html'].includes(a.getAttribute('href')))a.setAttribute('href','/'+a.getAttribute('href'));
  if(d.querySelector('#stage'))d.querySelector('#stage').setAttribute('role','main');
  for(const op of revision.pages[file]||[]){
   let node=d.querySelectorAll(op.selector)[op.index||0];
   if(op.previous)node=node?.previousElementSibling;
   if(!node)throw Error(file+': no existe el fragmento de revisión '+op.selector);
   if(op.remove)node.remove();else node.outerHTML=op.html;
  }
  if(revision.descriptions[file]){const m=d.createElement('meta');m.name='description';m.content=revision.descriptions[file];d.head.append(m);}
 }
 // Los landmarks y el salto de teclado no alteran el contenido del encargo.
 for(const e of d.querySelectorAll('.skip-link'))e.remove();
 for(const e of d.querySelectorAll('main.web-main, nav[aria-label="Volver al inicio"]'))e.replaceWith(...e.childNodes);
 for(const e of d.querySelectorAll('main#contenido'))e.removeAttribute('id');
 for(const e of d.querySelectorAll('#toolbar, #status'))e.removeAttribute('role');
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
  for(const file of pages){const before=await page.evaluate(signature,{html:git('show',BASE+':'+file),baseline:true,file,subtitle,revision});const after=await page.evaluate(signature,{html:fs.readFileSync(path.join(WEB,file),'utf8'),file});assert.deepEqual(after,before,file+': contenido conservado con correcciones explícitas de la auditoría');}
  console.log(`PASS marca ES: ${pages.length} páginas conservan contenido con menú y apertura autorizados; ${bilingual?'espejo EN completo':'EN intacto'}; recursos compartidos protegidos y canon reproducible.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
