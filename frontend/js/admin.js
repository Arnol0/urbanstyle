const $=s=>document.querySelector(s), money=n=>'S/ '+Number(n).toFixed(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS=[['polo','Polos'],['poleron','Polerones'],['casaca','Casacas'],['pantalon','Pantalones'],['short','Shorts'],['gorra','Gorras']];
const SZ={polo:['S','M','L','XL'],poleron:['S','M','L','XL'],casaca:['S','M','L','XL'],pantalon:['28','30','32','34'],short:['S','M','L','XL'],gorra:['Única']};
const catName=k=>(CATS.find(c=>c[0]===k)||[0,k])[1];
const sizeList=p=>{const keys=Object.keys(p.sizes||{}),base=(SZ[p.category]||[]).filter(z=>keys.includes(z));return base.concat(keys.filter(z=>!base.includes(z)))};
let P=[], editing=null, newImage=null;

document.addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.style.visibility='hidden'},true);
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t.h);t.h=setTimeout(()=>t.style.display='none',2800)};
const openM=h=>{$('#mc').innerHTML=h;$('#modal').classList.add('open')};
const closeM=()=>$('#modal').classList.remove('open');

async function api(url,opt={}){
 const res=await fetch(url,{method:opt.method||'GET',headers:opt.body?{'Content-Type':'application/json'}:undefined,body:opt.body?JSON.stringify(opt.body):undefined});
 const d=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(d.error||'Algo salió mal. Inténtalo de nuevo');
 return d}

/* ===== Acceso: solo administradores ===== */
async function init(){
 const gate=$('#gate');
 let u=null;try{u=(await api('/api/auth/me')).user}catch(e){}
 if(!u){gate.innerHTML='<b>Inicia sesión para entrar al panel.</b><br>Ingresa desde la tienda con tu cuenta de administrador.<br><a class="btn" href="/">Ir a la tienda</a>';return}
 if(u.role!=='admin'){gate.innerHTML=`<b>Tu cuenta (${esc(u.email)}) no tiene permisos de administrador.</b><br>Pide que te asignen el rol y vuelve a entrar.<br><a class="btn" href="/">Volver a la tienda</a>`;return}
 gate.hidden=true;$('#app').hidden=false;
 loadProducts()}

function tab(t){
 ['prod','ord'].forEach(k=>{$('#p-'+k).hidden=k!==t;$('#t-'+k).classList.toggle('on',k===t)});
 if(t==='ord')loadOrders()}

/* ===== Prendas ===== */
async function loadProducts(){
 try{P=await api('/api/products')}catch(e){toast(e.message);return}
 $('#pcount').textContent=P.length?`${P.length} ${P.length===1?'prenda':'prendas'} en el catálogo`:'Todavía no hay prendas. Agrega la primera.';
 $('#prows').innerHTML=P.length?P.map(p=>`<tr>
  <td>${p.image_url?`<img class="th" src="${esc(p.image_url)}" alt="">`:'<div class="th"></div>'}</td>
  <td><b>${esc(p.name)}</b><br><small style="color:#6b6b6b">${esc(p.description||'')}</small></td>
  <td>${esc(catName(p.category))}</td><td>${money(p.price)}</td>
  <td>${sizeList(p).map(z=>`<span class="sk ${p.sizes[z]<1?'z':''}">${esc(z)} · ${p.sizes[z]}</span>`).join('')}</td>
  <td class="acts"><button class="btn g sm" onclick="openForm(${p.id})">Editar</button> <button class="btn del sm" onclick="delP(${p.id})">Eliminar</button></td></tr>`).join('')
  :'<tr><td colspan="6" style="text-align:center;color:#6b6b6b;padding:24px">Sin prendas</td></tr>'}

function readSizes(){const o={};document.querySelectorAll('#fs input').forEach(i=>{o[i.dataset.z]=Math.max(0,Math.floor(Number(i.value||0)))});return o}
function drawSizes(){
 const cat=$('#fc').value,old={...((editing&&editing.sizes)||{}),...readSizes()};
 $('#fs').innerHTML=SZ[cat].map(z=>`<label>${esc(z)}<input type="number" min="0" step="1" data-z="${esc(z)}" value="${old[z]??0}"></label>`).join('')}

function openForm(id){
 editing=id?P.find(p=>p.id===id):null;newImage=null;
 openM(`<h3>${editing?'Editar prenda':'Nueva prenda'}</h3>
 <form onsubmit="saveP(event);return false">
  <label>Nombre<input id="fn" required maxlength="120"></label>
  <label>Descripción (opcional)<textarea id="fd" rows="2" maxlength="500"></textarea></label>
  <div class="two"><label>Categoría<select id="fc" onchange="drawSizes()">${CATS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
  <label>Precio (S/)<input id="fp" type="number" step="0.01" min="0.01" required></label></div>
  <b>Stock por talla</b><div class="sizes" id="fs"></div>
  <label>Foto de la prenda<input id="ff" type="file" accept="image/jpeg,image/png,image/webp" onchange="pickFile(this)"></label>
  <img id="fprev" alt="Vista previa" hidden>
  <label>…o enlace de la imagen<input id="fu" placeholder="https://… o img/archivo.jpg"></label>
  <p class="hint">Al subir una foto se reduce y se guarda en la base de datos; el enlace se llena solo.</p>
  <p class="err" id="ferr" role="alert"></p>
  <button class="btn" id="fsave" style="width:100%">Guardar prenda</button>
 </form>`);
 $('#fn').value=editing?editing.name:'';$('#fd').value=editing?editing.description||'':'';
 $('#fc').value=editing?editing.category:'polo';$('#fp').value=editing?editing.price:'';
 $('#fu').value=editing?editing.image_url||'':'';
 if(editing&&editing.image_url){$('#fprev').src=editing.image_url;$('#fprev').hidden=false}
 drawSizes()}

function shrink(file,max=1000){return new Promise((ok,no)=>{
 const u=URL.createObjectURL(file),im=new Image();
 im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
  c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
  URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',.85))};
 im.onerror=()=>{URL.revokeObjectURL(u);no()};im.src=u})}
async function pickFile(inp){const f=inp.files[0];if(!f)return;$('#ferr').textContent='';
 try{newImage=await shrink(f);$('#fprev').src=newImage;$('#fprev').hidden=false;$('#fu').value=''}
 catch(e){newImage=null;$('#ferr').textContent='No se pudo leer esa imagen. Prueba con JPG, PNG o WebP'}}

async function saveP(e){
 const b=e.target.querySelector('#fsave');b.disabled=true;$('#ferr').textContent='';
 const body={name:$('#fn').value,description:$('#fd').value,category:$('#fc').value,price:$('#fp').value,sizes:readSizes(),image_url:$('#fu').value.trim()};
 if(newImage)body.image_data=newImage;
 try{
  await api(editing?'/api/products/'+editing.id:'/api/products',{method:editing?'PUT':'POST',body});
  closeM();toast(editing?'Prenda actualizada ✓':'Prenda agregada ✓');await loadProducts()
 }catch(er){$('#ferr').textContent=er.message;b.disabled=false}}

async function delP(id){const p=P.find(x=>x.id===id);
 if(!p||!confirm(`¿Eliminar "${p.name}"? Los pedidos anteriores se conservan.`))return;
 try{await api('/api/products/'+id,{method:'DELETE'});toast('Prenda eliminada');await loadProducts()}catch(er){toast(er.message)}}

/* ===== Pedidos ===== */
async function loadOrders(){
 let rows;try{rows=await api('/api/orders')}catch(e){toast(e.message);return}
 $('#orows').innerHTML=rows.length?rows.map(o=>`<tr>
  <td><b>${esc(o.code)}</b></td><td>${esc(new Date(o.created_at).toLocaleString('es-PE'))}</td>
  <td>${esc(o.customer_name)}<br><small>${esc(o.phone)} · ${esc(o.district)}</small></td>
  <td class="items">${o.items.map(i=>`${i.qty}× ${esc(i.name)} (${esc(i.size)})`).join('<br>')}</td>
  <td>${esc(o.payment)}</td><td><b>${money(o.total)}</b></td></tr>`).join('')
  :'<tr><td colspan="6" style="text-align:center;color:#6b6b6b;padding:24px">Aún no hay pedidos</td></tr>'}

init();
