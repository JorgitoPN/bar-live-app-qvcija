const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const Z=9;
const ROOT=path.join(process.cwd(),'map-data','viewport-z9-v1');
const SNAPSHOT=path.join(process.cwd(),'map-data','national-venues-v1.json');
const SNAPSHOT_META=path.join(process.cwd(),'map-data','national-venues-v1.meta.json');

function tileXY(lon,lat,z){
  const n=2**z;
  const x=Math.floor((lon+180)/360*n);
  const clipped=Math.max(-85.05112878,Math.min(85.05112878,lat));
  const rad=clipped*Math.PI/180;
  const y=Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*n);
  return [x,y];
}

const payload=JSON.parse(fs.readFileSync(SNAPSHOT,'utf8'));
const meta=JSON.parse(fs.readFileSync(SNAPSHOT_META,'utf8'));
const rows=Array.isArray(payload.rows)?payload.rows:[];

fs.rmSync(ROOT,{recursive:true,force:true});
fs.mkdirSync(ROOT,{recursive:true});

const groups=new Map();
for(const row of rows){
  if(!Array.isArray(row)||row.length<8) continue;
  const lat=Number(row[1]), lon=Number(row[2]);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)) continue;
  const [x,y]=tileXY(lon,lat,Z);
  const key=x+'/'+y;
  if(!groups.has(key)) groups.set(key,[]);
  groups.get(key).push(row);
}

const tileCounts={};
let totalBytes=0;
let maxRows=0;
let maxBytes=0;
let maxKey='';
for(const [key,tileRows] of groups){
  const [x,y]=key.split('/');
  const dir=path.join(ROOT,x);
  fs.mkdirSync(dir,{recursive:true});
  const out=JSON.stringify({v:1,z:Z,x:Number(x),y:Number(y),rows:tileRows});
  fs.writeFileSync(path.join(dir,y+'.json'),out);
  const bytes=Buffer.byteLength(out);
  tileCounts[key]=tileRows.length;
  totalBytes+=bytes;
  if(tileRows.length>maxRows){
    maxRows=tileRows.length; maxBytes=bytes; maxKey=key;
  }
}

const manifest={
  v:1,
  z:Z,
  sourceSnapshotSha256:meta.sha256,
  sourceCount:meta.count,
  tileCount:groups.size,
  totalRows:rows.length,
  maxTile:{key:maxKey,rows:maxRows,bytes:maxBytes},
  tiles:tileCounts
};
const manifestText=JSON.stringify(manifest);
fs.writeFileSync(path.join(ROOT,'manifest.json'),manifestText);

const dirHash=crypto.createHash('sha256')
  .update(manifestText)
  .digest('hex');

console.log('VIEWPORT_TILE_BUILD='+JSON.stringify({
  z:Z,
  tiles:groups.size,
  rows:rows.length,
  maxTile:manifest.maxTile,
  totalJsonBytes:totalBytes,
  manifestBytes:Buffer.byteLength(manifestText),
  manifestSha256:dirHash
}));
