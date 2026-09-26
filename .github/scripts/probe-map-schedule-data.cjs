const API='https://embntaqwlwmgazvrglaf.supabase.co/rest/v1/locales';
const KEY='sb_publishable_ffrXoLqKentwGrBXq3ZTDg_WxsX2y_2';

(async()=>{
  const url=new URL(API);
  url.searchParams.set('select','id,horarios_completos,google_business_status,osm_opening_hours:osm_tags->>opening_hours');
  url.searchParams.set('activo','eq.true');
  url.searchParams.set('latitud','gte.40.30');
  url.searchParams.set('latitud','lte.40.55');
  url.searchParams.set('longitud','gte.-3.90');
  url.searchParams.set('longitud','lte.-3.50');
  url.searchParams.set('order','id.asc');
  url.searchParams.set('limit','1000');

  const response=await fetch(url,{headers:{Accept:'application/json',apikey:KEY}});
  const body=await response.text();
  console.log('HTTP='+response.status);
  if(!response.ok){
    console.error(body.slice(0,2000));
    process.exit(1);
  }
  const rows=JSON.parse(body);
  let barlive=0,osm=0,business=0;
  for(const row of rows){
    if(row.horarios_completos && (typeof row.horarios_completos!=='object' || Object.keys(row.horarios_completos).length)) barlive++;
    if(String(row.osm_opening_hours||'').trim()) osm++;
    if(String(row.google_business_status||'').trim()) business++;
  }
  console.log(JSON.stringify({rows:rows.length,barliveSchedules:barlive,osmOpeningHours:osm,businessStatuses:business}));
  if(!rows.length) process.exit(2);
})().catch(err=>{console.error(err);process.exit(1);});
