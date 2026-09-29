#!/usr/bin/env node
'use strict';
// Catálogo de elementos (ONTOS data/web-elementos.json, manual de marca 4.3): cada id
// nombra una pieza real. Falla si un selector deja de existir en su página (ES y su
// espejo EN) o si el script que la crea (`js`) ya no nombra su clase.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const WEB=path.resolve(__dirname,'..');
const ONTOS=process.env.ONTOS_BRAND_ROOT||path.resolve(WEB,'../ONTOS');
const catalogo=JSON.parse(fs.readFileSync(path.join(ONTOS,'data/web-elementos.json'),'utf8'));
const {webkit}=require(process.env.PLAYWRIGHT_MODULE||path.join(ONTOS,'scripts/verify/node_modules/playwright'));
const TODAS=['index.html','aplicaciones.html','fernando-calle.html','contacto.html'];

function paginas(el){
  const base=el.pagina==='todas'?TODAS:el.pagina.split(' · ');
  return base.flatMap(f=>fs.existsSync(path.join(WEB,'en',f))?[f,'en/'+f]:[f]);
}

async function comprobar(page,elementos){
  const fallos=[],ids=new Set();
  for(const el of elementos){
    if(ids.has(el.id))fallos.push(`${el.id}: id repetido`);
    ids.add(el.id);
    if(!el.selector){fallos.push(`${el.id}: sin selector`);continue;}
    if(el.js){
      const clase=el.selector.replace(/^\./,'');
      const src=fs.readFileSync(path.join(WEB,el.js),'utf8');
      if(!src.includes(clase))fallos.push(`${el.id}: ${el.js} ya no crea «${clase}»`);
      continue;
    }
    for(const f of paginas(el)){
      const html=fs.readFileSync(path.join(WEB,f),'utf8');
      const hay=await page.evaluate(({html,sel})=>!!new DOMParser().parseFromString(html,'text/html').querySelector(sel),{html,sel:el.selector});
      if(!hay)fallos.push(`${el.id}: «${el.selector}» no existe en ${f}`);
    }
  }
  return fallos;
}

(async()=>{
  const browser=await webkit.launch();
  try{
    const page=await browser.newPage();
    const fallos=await comprobar(page,catalogo.elementos);
    assert.deepEqual(fallos,[],'Catálogo de elementos web desalineado con la web');
    // Caso rojo sembrado: un selector inexistente y un id repetido deben fallar.
    const rojo=await comprobar(page,[
      {id:'rojo.a',pagina:'index.html',selector:'.no-existe-jamas'},
      {id:'rojo.a',pagina:'index.html',selector:'header.barra'}
    ]);
    assert(rojo.some(f=>f.includes('.no-existe-jamas'))&&rojo.some(f=>f.includes('id repetido')),'Caso rojo: el guardián debe detectar selector roto e id repetido');
    console.log(`PASS elementos web: ${catalogo.elementos.length} ids con selector vivo en su página (ES/EN); caso rojo detectado.`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exit(1);});
