const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const BASE = 'https://embntaqwlwmgazvrglaf.supabase.co/rest/v1/locales';
const APIKEY = 'sb_publishable_ffrXoLqKentwGrBXq3ZTDg_WxsX2y_2';
const PAGE_SIZE = 1000;
const BATCH = 8;
const MAX_ROWS = 200000;
const OUT_DIR = path.join(process.cwd(), 'map-data');
const OUT_FILE = path.join(OUT_DIR, 'national-venues-v1.json');
const META_FILE = path.join(OUT_DIR, 'national-venues-v1.meta.json');

function canonicalCategory(value) {
  const raw=String(value||'').trim().toLowerCase();
  if (raw==='cafe'||raw==='cafes') return 'cafeteria';
  if (raw==='restaurant'||raw==='restaurants') return 'restaurante';
  if (raw==='nightclub'||raw==='night_club') return 'discoteca';
  if (raw==='cocktail'||raw==='cocktail_bar'||raw==='cocktailbar') return 'cocteleria';
  if (['bar','restaurante','cafeteria','pub','discoteca','cocteleria'].includes(raw)) return raw;
  return '';
}
const categoryCode={bar:0,restaurante:1,cafeteria:2,pub:3,discoteca:4,cocteleria:5};

function categoryFromRow(row) {
  const primary=canonicalCategory(row?.barlive_type);
  if (primary) return primary;
  if (Array.isArray(row?.barlive_types)) {
    for (const value of row.barlive_types) {
      const candidate=canonicalCategory(value);
      if (candidate) return candidate;
    }
  }
  return '';
}

function buildUrl(offset) {
  const select='id,latitud,longitud,barlive_type,barlive_types,destacado,horarios_completos,google_business_status,osm_opening_hours:osm_tags->>opening_hours';
  return BASE+
    '?select='+encodeURIComponent(select)+
    '&activo=eq.true'+
    '&order=id.asc'+
    '&limit='+PAGE_SIZE+
    '&offset='+offset;
}

async function fetchPage(offset) {
  const response=await fetch(buildUrl(offset),{
    headers:{Accept:'application/json',apikey:APIKEY}
  });
  if(!response.ok) throw new Error('REST HTTP '+response.status+' offset='+offset);
  const rows=await response.json();
  if(!Array.isArray(rows)) throw new Error('REST payload not array offset='+offset);
  return rows;
}

(async()=>{
  const all=[];
  let offset=0;
  const started=Date.now();

  while(true){
    const offsets=[];
    for(let i=0;i<BATCH;i++) offsets.push(offset+i*PAGE_SIZE);
    const pages=await Promise.all(offsets.map(fetchPage));

    let reachedEnd=false;
    for(const page of pages){
      all.push(...page);
      if(page.length<PAGE_SIZE){
        reachedEnd=true;
        break;
      }
    }
    if(all.length>MAX_ROWS) throw new Error('snapshot exceeds '+MAX_ROWS);
    if(reachedEnd) break;
    offset+=PAGE_SIZE*BATCH;
  }

  const compact=[];
  let invalid=0;
  let outsideSpain=0;
  for(const row of all){
    const id=String(row?.id||'').trim();
    const lat=Number(row?.latitud);
    const lng=Number(row?.longitud);
    const category=categoryFromRow(row);
    if(!id||!Number.isFinite(lat)||!Number.isFinite(lng)||!category){
      invalid+=1;
      continue;
    }
    if(lat<27.45||lat>44.25||lng<-18.25||lng>4.60){
      outsideSpain+=1;
      continue;
    }
    compact.push([
      id,
      Number(lat.toFixed(6)),
      Number(lng.toFixed(6)),
      categoryCode[category],
      row?.destacado===true||Number(row?.destacado||0)===1 ? 1 : 0,
      row?.horarios_completos ?? null,
      row?.google_business_status ?? null,
      row?.osm_opening_hours ?? null
    ]);
  }

  fs.mkdirSync(OUT_DIR,{recursive:true});
  const payload=JSON.stringify({v:1,count:compact.length,rows:compact});
  const hash=crypto.createHash('sha256').update(payload).digest('hex');
  fs.writeFileSync(OUT_FILE,payload);

  const gzip=zlib.gzipSync(Buffer.from(payload),{level:9});
  const meta={
    v:1,
    count:compact.length,
    sourceRows:all.length,
    invalidRows:invalid,
    outsideSpainRows:outsideSpain,
    bytes:Buffer.byteLength(payload),
    gzipBytes:gzip.length,
    sha256:hash
  };
  fs.writeFileSync(META_FILE,JSON.stringify(meta));

  console.log('NATIONAL_STATIC_BUILD='+JSON.stringify({
    ...meta,
    elapsedMs:Date.now()-started
  }));
})().catch(err=>{
  console.error(err && err.stack || err);
  process.exit(1);
});
