#!/usr/bin/env python3
"""Refresh reviewed public engines. Explicit import only; never run automatically on deploy.
Usage: python3 scripts/import-experiencias.py /path/to/ONTOS
Inspect the diff and run public interaction checks before committing.
"""
from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])/"app/lib"
records={}
outputs={}
def once(text,old,new):
    assert text.count(old)==1, "Unexpected source marker: "+old
    return text.replace(old,new)
def marker(text,value):
    assert text.count(value)==1, "Unexpected source marker: "+value
    return text.index(value)
translations=json.loads((root/"i18n/en/experiencias-runtime.json").read_text())
for src,dst in [("ontos-vivo.js","juego-2d.js"),("ontos-tierra.js","mundo-3d.js")]:
    raw=(source/src).read_bytes(); s=raw.decode()
    if src=="ontos-tierra.js":
        start=marker(s,"const segoviaWorld="); end=marker(s,"const figure=")
        s=s[:start]+s[end:]
        s=once(s,"let figureAspect=0,alcazarAsset=null;","let figureAspect=0;")
        s=once(s,"const RADIUS=9.2,ALCAZAR_SCALE=1.85;","const RADIUS=9.2;")
        s,count=re.subn(r"^\$\('ot-segovia'\)\.onclick=.*\n", "",s,flags=re.M)
        assert count==1, "Missing world control marker"
        start=marker(s,"// Architectural coordinates"); end=marker(s,"function makeWorld()")
        s=s[:start]+"function landmarkBlocked(){return false;}\n"+s[end:]
        s=once(s,"if(segoviaWorld){makeSegovia(m);makeAlcazar(m);}","")
        start=marker(s,"landmarks.some(l=>"); end=marker(s,"||surfaceDistance(up,[0,1,0])")
        s=s[:start]+"false"+s[end:]
        start=marker(s,"(async()=>{if(!figurine&&!walk)"); end=marker(s,"try{initGL();")
        s=s[:start]+"(()=>{"+s[end:]
    s=s.replace("La figura está en reposo.","No se ha podido mostrar la figura.").replace("El jardín está en reposo.","No se ha podido mostrar el jardín.")
    # Source comment only describes local public snapshot; no private repo pointers.
    s=re.sub(r"^/\*.*?\*/", "/* ONTOS public procedural experience. See provenance.json. */",s,count=1,flags=re.S)
    assert not re.search(r"fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|ontos-alcazar|loadAlcazar|makeSegovia|segoviaWorld|docs/|data/",s), "Unexpected dependency; review import before publishing"
    s=s.replace("'use strict';", "'use strict';\nconst T=window.ONTOS_DEMO_TRANSLATE|| (text=>text);",1)
    for phrase in sorted(translations,key=len,reverse=True):
        literal="'"+phrase.replace("'","\\'")+"'"
        s=s.replace(literal,"T("+literal+")")
    s=s.replace("`Destellos ${", "`${T('Destellos')} ${")
    outputs[dst]=s
    records[dst]={"source":"ONTOS/app/lib/"+src,"source_sha256":hashlib.sha256(raw).hexdigest(),"public_sha256":hashlib.sha256(s.encode()).hexdigest()}
for dst,s in outputs.items():
    (root/"experiencias"/dst).write_text(s)
(root/"experiencias/provenance.json").write_text(json.dumps({"_doc":"Reviewed snapshots. Regenerate only with scripts/import-experiencias.py; Segovia geometry and asset loading excluded.","engines":records},ensure_ascii=False,indent=2)+"\n")
