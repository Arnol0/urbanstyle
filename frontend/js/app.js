const $=s=>document.querySelector(s), money=n=>'S/ '+Number(n).toFixed(2), r2=n=>Math.round(n*100)/100;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ===== Dibujo de respaldo cuando una prenda no tiene foto ===== */
const TX={polo:160,poleron:205,casaca:205,pantalon:90,short:112,gorra:155};
const SHP={
 polo:(c,a)=>`<path d="M95 40 L120 28 Q150 55 180 28 L205 40 L270 95 L242 135 L218 115 L218 305 L82 305 L82 115 L58 135 L30 95 Z" fill="${c}"/><path d="M120 28 Q150 55 180 28" fill="none" stroke="${a}" stroke-width="5"/>`,
 poleron:(c,a)=>`<path d="M95 60 Q150 20 205 60 L270 110 L245 160 L220 140 L220 310 L80 310 L80 140 L55 160 L30 110 Z" fill="${c}"/><path d="M115 50 Q150 100 185 50" fill="none" stroke="${a}" stroke-width="5"/><rect x="110" y="240" width="80" height="45" rx="8" fill="none" stroke="${a}" stroke-width="3" opacity=".5"/>`,
 casaca:(c,a)=>`<path d="M95 50 Q150 20 205 50 L270 105 L245 165 L220 145 L220 310 L80 310 L80 145 L55 165 L30 105 Z" fill="${c}"/><line x1="150" y1="40" x2="150" y2="310" stroke="${a}" stroke-width="4"/><path d="M115 45 L150 85 L185 45" fill="none" stroke="${a}" stroke-width="4"/>`,
 pantalon:(c,a)=>`<path d="M95 30 L205 30 L228 312 L162 312 L150 120 L138 312 L72 312 Z" fill="${c}"/><rect x="95" y="30" width="110" height="16" fill="${a}" opacity=".35"/>`,
 short:(c,a)=>`<path d="M85 60 L215 60 L238 230 L162 230 L150 150 L138 230 L62 230 Z" fill="${c}"/><rect x="85" y="60" width="130" height="14" fill="${a}" opacity=".35"/>`,
 gorra:(c,a)=>`<path d="M70 200 Q70 85 150 85 Q230 85 230 200 Z" fill="${c}"/><path d="M55 200 L255 200 Q245 232 150 232 Q65 232 55 200 Z" fill="${a}" opacity=".55"/>`};
const garment=(t,c,a)=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340"><rect width="300" height="340" fill="#efece6"/>${SHP[t](c,a)}<text x="150" y="${TX[t]}" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="24" fill="${a}">URBAN</text><text x="150" y="${TX[t]+17}" text-anchor="middle" font-family="Arial" font-size="11" letter-spacing="4" fill="${a}">STYLE · LIMA</text></svg>`);

/* ===== Imágenes =====
   - Prendas: usan image_url de la base de datos; si falla, se dibuja la prenda.
   - Portadas y banners: se buscan en img/ con estos nombres (.jpg .png .webp .jpeg); si no existen, se ocultan. */
const EXT=['jpg','png','webp','jpeg'];
const cand=b=>b.split('|').flatMap(n=>EXT.map(e=>n+'.'+e));
const pic=(b,alt,fb)=>`<img src="img/${cand(b)[0]}" alt="${esc(alt)}" data-b="${b}" data-i="0" data-fb="${fb||''}">`;
document.addEventListener('error',e=>{const t=e.target;if(t.tagName!=='IMG')return;
 if(t.dataset.b){const c=cand(t.dataset.b),i=+t.dataset.i+1;if(i<c.length){t.dataset.i=i;t.src='img/'+c[i];return}delete t.dataset.b}
 if(t.dataset.fb&&t.getAttribute('src')!==t.dataset.fb){const f=t.dataset.fb;delete t.dataset.fb;t.src=f;return}
 t.style.display='none'},true);

/* ===== Datos ===== */
const CATS=[['all','Todo'],['polo','Polos'],['poleron','Polerones'],['casaca','Casacas'],['pantalon','Pantalones'],['short','Shorts'],['gorra','Gorras']];
const SZ={polo:['S','M','L','XL'],poleron:['S','M','L','XL'],casaca:['S','M','L','XL'],pantalon:['28','30','32','34'],short:['S','M','L','XL'],gorra:['Única']};
const catName=k=>(CATS.find(c=>c[0]===k)||[0,k])[1];
const sizeList=p=>{const keys=Object.keys(p.sizes||{}),base=(SZ[p.category]||[]).filter(z=>keys.includes(z));return base.concat(keys.filter(z=>!base.includes(z)))};
const fallback=p=>garment(SHP[p.category]?p.category:'polo','#1c1c1e','#e8e4da');
const img=p=>{const fb=fallback(p);return `<img src="${esc(p.image_url||fb)}" alt="${esc(p.name)}" data-fb="${fb}">`};
const CUP={URBAN10:{pct:.10},BIENVENIDO:{pct:.15,login:1}}; // el servidor vuelve a validarlos

let P=[], U=null, loaded=false, flt='all', sel={}, chk={};
const LS='us_cart_v2';
let C={cart:[],coupon:'',pts:false};
try{C={...C,...JSON.parse(localStorage.getItem(LS)||'{}')}}catch(e){}
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(C))}catch(e){}};
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t.h);t.h=setTimeout(()=>t.style.display='none',2800)};

async function api(url,opt={}){
 const res=await fetch(url,{method:opt.method||'GET',headers:opt.body?{'Content-Type':'application/json'}:undefined,body:opt.body?JSON.stringify(opt.body):undefined});
 const d=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(d.error||'Algo salió mal. Inténtalo de nuevo');
 return d}
async function loadProducts(){
 try{P=(await api('/api/products')).map(p=>({...p,price:Number(p.price),sizes:p.sizes||{}}))}
 catch(e){P=[];toast('No pudimos cargar los productos. Recarga la página')}
 loaded=true}
async function loadUser(){try{U=(await api('/api/auth/me')).user}catch(e){U=null}}
const lineP=c=>P.find(x=>x.id===c.id);
function fixCart(){C.cart=C.cart.filter(c=>{const p=lineP(c);if(!p||!(p.sizes[c.z]>0))return false;c.q=Math.min(c.q,p.sizes[c.z]);return true});save()}

/* ===== Catálogo ===== */
function renderFlt(){$('#flt').innerHTML=CATS.map(([k,l])=>`<button class="chip ${flt===k?'on':''}" onclick="flt='${k}';renderFlt();renderGrid()">${l}</button>`).join('')}
const soldOut=p=>sizeList(p).every(z=>p.sizes[z]<1);
const card=x=>{const st=x.sizes,s=sel[x.id],left=s?st[s]:null,out=soldOut(x);
  return `<div class="card">${img(x)}<div class="b"><span class="tag">${esc(catName(x.category).toUpperCase())} · EDICIÓN LIMITADA</span><b>${esc(x.name)}</b>${x.description?`<span class="st desc">${esc(x.description)}</span>`:''}<span class="pr">${money(x.price)}</span>
  <div class="sz">${sizeList(x).map(z=>`<button class="${s===z?'on':''}" ${st[z]<1?'disabled':''} onclick="pick(${x.id},${esc(JSON.stringify(z))})">${esc(z)}</button>`).join('')}</div>
  <div class="st ${left&&left<=3?'low':''}">${out?'Agotado':s?(left<=3?`¡Solo quedan ${left} en talla ${esc(s)}!`:`${left} disponibles en talla ${esc(s)}`):'Elige tu talla'}</div>
  <button class="btn" style="margin-top:auto" ${out?'disabled':''} onclick="add(${x.id})">${out?'Agotado':'Agregar al carrito'}</button></div></div>`};
function pick(id,z){sel[id]=z;renderGrid()}
function renderGrid(){
 if(!loaded){$('#grid').innerHTML='<p class="empty">Cargando productos… (la primera carga puede tardar unos segundos)</p>';$('#feat').innerHTML='';return}
 const list=P.filter(x=>flt==='all'||x.category===flt);
 $('#grid').innerHTML=list.length?list.map(card).join(''):'<p class="empty">Aún no hay prendas en esta categoría.</p>';
 const feat=P.filter(x=>!soldOut(x)).slice(0,4); // las más nuevas con stock
 $('#feat').innerHTML=feat.length?feat.map(card).join(''):'<p class="empty">Pronto habrá nuevas prendas.</p>'}
function renderHome(){
 $('#hg').innerHTML=loaded?[1,2,3,4].map(i=>{const p=P[i-1];return pic('portada'+i+'|'+LEG[i-1],'Modelo '+i,p?(p.image_url||fallback(p)):'')}).join(''):'';
 $('#tiles').innerHTML=CATS.slice(1).filter(([k])=>P.some(x=>x.category===k)).map(([k,l])=>{const p=P.find(x=>x.category===k);return `<a class="tile" href="#coleccion/${k}">${pic('cat-'+k,l,p.image_url||fallback(p))}<span>${l}</span></a>`}).join('');
 [['bn-col','banner-coleccion'],['bn-tal','banner-tallas'],['si1','sostenible1'],['si2','sostenible2'],['si3','sostenible3']].forEach(([id,b])=>{$('#'+id).innerHTML=pic(b,'','')})}
const LEG=['2','3','4','Gemini_Generated_Image_d9d2mtd9d2mtd9d2']; /* nombres que ya usabas en tu portada */
const VIEWS=['inicio','coleccion','tallas','sostenible'];
function route(){const h=location.hash.slice(1).split('/'),v=VIEWS.includes(h[0])?h[0]:'inicio';
 if(v==='coleccion')flt=CATS.some(c=>c[0]===h[1])?h[1]:'all';
 document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));
 document.querySelectorAll('.top nav a').forEach(a=>a.classList.toggle('act',a.hash==='#'+v));
 renderFlt();renderGrid();scrollTo(0,0)}
addEventListener('hashchange',route);
const renderAll=()=>{renderFlt();renderGrid();renderCart();renderUser()};
const refresh=()=>{renderHome();renderAll()};

/* ===== Carrito ===== */
function add(id){const z=sel[id],p=P.find(x=>x.id===id);if(!z)return toast('Elige una talla primero');if(!p)return;
 const it=C.cart.find(c=>c.id===id&&c.z===z),have=it?it.q:0;
 if(have>=p.sizes[z])return toast('No hay más unidades en esa talla');
 it?it.q++:C.cart.push({id,z,q:1});save();renderCart();toast('Agregado al carrito ✓')}
function qty(i,d){const c=C.cart[i],p=lineP(c);c.q+=d;if(p&&c.q>p.sizes[c.z])c.q--;if(c.q<1)C.cart.splice(i,1);save();renderCart()}
function totals(){
 const sub=r2(C.cart.reduce((a,c)=>{const p=lineP(c);return a+(p?p.price*c.q:0)},0)),cp=CUP[C.coupon];
 const d1=cp&&(!cp.login||U)?r2(sub*cp.pct):0;
 const pd=C.pts&&U?Math.min(Math.floor(U.points/20),Math.floor(sub-d1)):0;
 const ship=sub===0||sub>=150?0:8;
 return{sub,d1,pd,ship,total:r2(sub-d1-pd+ship)}}
function renderCart(){
 $('#cc').textContent=C.cart.reduce((a,c)=>a+c.q,0);
 const lines=C.cart.map((c,i)=>({c,i,p:lineP(c)})).filter(l=>l.p);
 $('#ci').innerHTML=lines.length?lines.map(({c,i,p})=>
  `<div class="it">${img(p)}<div><b>${esc(p.name)}</b><br>Talla ${esc(c.z)} · ${money(p.price)}<div class="q"><button onclick="qty(${i},-1)">−</button> ${c.q} <button onclick="qty(${i},1)">+</button></div></div><b>${money(p.price*c.q)}</b></div>`).join('')
  :'<p style="padding:30px 0;text-align:center;color:#6b6b6b">Tu carrito está vacío</p>';
 const t=totals();
 $('#cf').innerHTML=`<div class="cp"><input id="cin" placeholder="Código de descuento" value="${esc(C.coupon)}"><button class="btn g" onclick="coupon()">Aplicar</button></div>
 ${U?`<label><input type="checkbox" style="width:auto;margin:0 6px 0 0" ${C.pts?'checked':''} onchange="C.pts=this.checked;save();renderCart()">Canjear puntos (tienes ${U.points} = ${money(Math.floor(U.points/20))})</label>`:'<small style="color:#6b6b6b">Ingresa para ganar y canjear puntos.</small>'}
 <div class="r" style="margin-top:8px"><span>Subtotal</span><span>${money(t.sub)}</span></div>
 ${t.d1?`<div class="r ok"><span>Descuento (${esc(C.coupon)})</span><span>− ${money(t.d1)}</span></div>`:''}
 ${t.pd?`<div class="r ok"><span>Puntos canjeados</span><span>− ${money(t.pd)}</span></div>`:''}
 <div class="r"><span>Envío Lima (gratis desde S/ 150)</span><span>${money(t.ship)}</span></div>
 <div class="r" style="font-size:18px;font-weight:700;margin:6px 0 10px"><span>Total</span><span>${money(t.total)}</span></div>
 <button class="btn" style="width:100%" ${lines.length?'':'disabled'} onclick="checkout()">Ir a pagar</button>`}
function coupon(){const c=$('#cin').value.trim().toUpperCase();
 if(!c){C.coupon='';save();return renderCart()}
 if(!CUP[c])return toast('Código no válido');
 if(CUP[c].login&&!U)return toast('Ese código es solo para usuarios registrados');
 C.coupon=c;save();renderCart();toast('Cupón aplicado ✓')}
const toggleCart=o=>$('#drawer').classList.toggle('open',!!o);

/* ===== Ventana modal ===== */
const openM=h=>{$('#mc').innerHTML=h;$('#modal').classList.add('open')};
const closeM=()=>$('#modal').classList.remove('open');

/* ===== Usuario (cuenta real en el servidor) ===== */
function renderUser(){$('#bu').textContent=U?'👤 '+U.name.split(' ')[0]+' · '+U.points+' pts':'👤 Ingresar';$('#adm').hidden=!(U&&U.role==='admin')}
function authM(tab='in'){
 if(U){
  openM(`<h3>Hola, ${esc(U.name)}</h3><p>${esc(U.email)}</p><p style="margin:10px 0">Puntos: <b>${U.points}</b> (20 pts = S/ 1)<br>Pedidos realizados: <b id="oc">…</b></p>${U.role==='admin'?'<p style="margin-bottom:10px"><a class="btn g" href="admin.html">⚙️ Panel de administrador</a></p>':''}<button class="btn" onclick="logout()">Cerrar sesión</button>`);
  api('/api/orders/mine').then(d=>{const e=$('#oc');if(e)e.textContent=d.length}).catch(()=>{const e=$('#oc');if(e)e.textContent='—'});
  return}
 openM(`<div class="tabs"><button class="${tab==='in'?'on':''}" onclick="authM('in')">Ingresar</button><button class="${tab==='up'?'on':''}" onclick="authM('up')">Registrarme</button></div>
 <form onsubmit="${tab==='in'?'login':'register'}(event);return false">
 ${tab==='up'?'<label>Nombre completo<input id="an" required></label>':''}
 <label>Correo<input id="ae" type="email" autocomplete="email" required></label><label>Contraseña${tab==='up'?' (mínimo 8 caracteres)':''}<input id="ap" type="password" autocomplete="${tab==='in'?'current-password':'new-password'}" minlength="${tab==='up'?8:1}" required></label>
 <button class="btn" style="width:100%">${tab==='in'?'Ingresar':'Crear cuenta y ganar 100 puntos'}</button></form>
 <p class="or" id="gor" hidden>o</p><div id="gbtn"></div>`);
 renderGoogle()}
async function login(e){const b=e.target.querySelector('button');b.disabled=true;
 try{U=(await api('/api/auth/login',{method:'POST',body:{email:$('#ae').value,password:$('#ap').value}})).user;closeM();renderAll();toast('Bienvenido de vuelta ✓')}
 catch(er){toast(er.message);b.disabled=false}}
async function register(e){const b=e.target.querySelector('button');b.disabled=true;
 try{U=(await api('/api/auth/register',{method:'POST',body:{name:$('#an').value,email:$('#ae').value,password:$('#ap').value}})).user;C.coupon='BIENVENIDO';save();closeM();renderAll();toast('¡Cuenta creada! Cupón BIENVENIDO aplicado 🎉')}
 catch(er){toast(er.message);b.disabled=false}}
async function logout(){try{await api('/api/auth/logout',{method:'POST'})}catch(e){}
 U=null;C.pts=false;save();closeM();renderAll()}

/* Google */
let GID, gReady=false;
async function renderGoogle(n=0){
 if(GID===undefined){try{GID=(await api('/api/config')).googleClientId}catch(e){GID=null}}
 if(!GID)return;
 if(!window.google||!google.accounts){if(n<20)setTimeout(()=>renderGoogle(n+1),300);return}
 const box=$('#gbtn');if(!box)return; // la ventana ya se cerró
 if(!gReady){gReady=true;google.accounts.id.initialize({client_id:GID,callback:async({credential})=>{
  try{U=(await api('/api/auth/google',{method:'POST',body:{credential}})).user;closeM();renderAll();toast('Bienvenido ✓')}catch(er){toast(er.message)}}})}
 $('#gor').hidden=false;
 google.accounts.id.renderButton(box,{theme:'outline',size:'large',text:'continue_with',width:320})}

/* ===== Compra simulada en 3 pasos ===== */
function checkout(){toggleCart(0);chk={step:1,t0:Date.now(),pay:'Yape'};stepM()}
function stepM(){const s=chk.step,bar=`<div class="steps">${[1,2,3].map(i=>`<i class="${i<=s?'on':''}"></i>`).join('')}</div>`;
 if(s===1)openM(`${bar}<h3>1. Datos de entrega</h3><form onsubmit="go(event,2);return false">
  <label>Nombre<input id="dn" required value="${esc(chk.n||(U&&U.name)||'')}"></label><label>Celular<input id="dt" required pattern="[0-9]{9}" placeholder="9 dígitos" value="${esc(chk.tel||'')}"></label>
  <label>Dirección<input id="dd" required value="${esc(chk.dir||'')}"></label>
  <label>Distrito<select id="ds">${['Miraflores','San Isidro','Surco','San Borja','La Molina','Lima Cercado','Jesús María','Magdalena','San Miguel','Otro (Lima)'].map(d=>`<option ${chk.dis===d?'selected':''}>${d}</option>`).join('')}</select></label>
  <button class="btn" style="width:100%">Continuar</button></form>`);
 if(s===2)openM(`${bar}<h3>2. Método de pago</h3><form onsubmit="go(event,3);return false">
  ${['Yape','Plin','Tarjeta'].map(m=>`<label class="pay ${chk.pay===m?'on':''}"><input type="radio" name="pm" ${chk.pay===m?'checked':''} onclick="chk.pay='${m}';stepM()"> <b>${m}</b> <small>${m==='Tarjeta'?'Débito o crédito':'Pago con QR / celular'}</small></label>`).join('')}
  ${chk.pay==='Tarjeta'?'<input placeholder="Número de tarjeta (simulado)" maxlength="19"><div style="display:flex;gap:8px"><input placeholder="MM/AA"><input placeholder="CVV" maxlength="3"></div>':`<p style="background:#f7f5f0;padding:12px;border-radius:8px;margin-bottom:10px;font-size:14px">📲 Simulación: escanearías el QR de ${chk.pay} y pagarías <b>${money(totals().total)}</b>.</p>`}
  <button class="btn" style="width:100%">Continuar</button></form>`);
 if(s===3){const t=totals();openM(`${bar}<h3>3. Confirma tu pedido</h3>
  ${C.cart.map(c=>{const p=lineP(c);return p?`<div style="display:flex;justify-content:space-between;font-size:14px"><span>${c.q}× ${esc(p.name)} (${esc(c.z)})</span><span>${money(p.price*c.q)}</span></div>`:''}).join('')}
  <hr style="margin:10px 0;border:0;border-top:1px solid #e4e0d6"><p style="font-size:14px">📍 ${esc(chk.dir)}, ${esc(chk.dis)}<br>💳 ${chk.pay} · Entrega estimada: 24 a 48 horas<br>🌱 Empaque compostable incluido</p>
  <p style="font-size:20px;font-weight:700;margin:10px 0">Total: ${money(t.total)}</p>
  <button class="btn" id="cbtn" style="width:100%" onclick="confirmOrder()">Confirmar compra (simulada)</button>`)}}
function go(e,n){if(chk.step===1){chk.n=$('#dn').value;chk.tel=$('#dt').value;chk.dir=$('#dd').value;chk.dis=$('#ds').value}chk.step=n;stepM()}
async function confirmOrder(){const btn=$('#cbtn');btn.disabled=true;const cp=CUP[C.coupon];
 try{
  const d=await api('/api/orders',{method:'POST',body:{
   items:C.cart.map(c=>({product_id:c.id,size:c.z,qty:c.q})),
   delivery:{name:chk.n,phone:chk.tel,address:chk.dir,district:chk.dis},
   payment:chk.pay,coupon:cp&&(!cp.login||U)?C.coupon:'',usePoints:!!(C.pts&&U),seconds:Math.round((Date.now()-chk.t0)/1000)}});
  if(d.user)U=d.user;
  C.cart=[];C.coupon='';C.pts=false;sel={};save();await loadProducts();refresh();
  openM(`<h3 class="ok">✅ ¡Pedido confirmado!</h3><p style="margin:10px 0">Código: <b>${esc(d.order.code)}</b><br>Total pagado: <b>${money(d.order.total)}</b><br>Entrega en 24 a 48 horas.</p>${U?`<p>Ganaste <b>${d.order.earned} puntos</b> 🎉</p>`:'<p>Regístrate para ganar puntos en tu próxima compra.</p>'}<p style="margin:10px 0;font-size:13px;color:#6b6b6b">Completaste la compra en 3 pasos.</p><button class="btn" onclick="closeM()">Seguir comprando</button>`)
 }catch(er){toast(er.message);btn.disabled=false;await loadProducts();fixCart();refresh()}}

/* ===== Inicio ===== */
$('#cc').textContent=C.cart.reduce((a,c)=>a+c.q,0);
route();
Promise.all([loadUser(),loadProducts()]).then(()=>{fixCart();refresh()});
