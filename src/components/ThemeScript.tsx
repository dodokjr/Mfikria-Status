// Skrip inline di <head>. Berjalan sebelum halaman digambar dan TIDAK bergantung pada React:
//  1. menetapkan tema awal (pilihan tersimpan, atau mengikuti pengaturan sistem), tanpa kilatan
//  2. memasang satu handler klik global untuk tombol tema [data-theme-toggle]
//     dan tombol tampilkan/sembunyikan password [data-password-toggle="idInput1,idInput2"]
// Dengan begini kedua tombol tetap berfungsi walaupun hydrasi React gagal atau terlambat.
const SCRIPT = `(function(){
  var d=document,r=d.documentElement,t;
  try{t=localStorage.getItem('theme')}catch(e){}
  if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}
  r.setAttribute('data-theme',t);
  if(window.__uiInit)return;window.__uiInit=1;
  d.addEventListener('click',function(e){
  var n=e.target,el=n&&n.closest?n.closest('[data-theme-toggle],[data-password-toggle]'):null;
  if(!el)return;
  if(el.hasAttribute('data-theme-toggle')){
  var next=r.getAttribute('data-theme')==='light'?'dark':'light';
  r.setAttribute('data-theme',next);
  try{localStorage.setItem('theme',next)}catch(e){}
  return}
  var show=el.getAttribute('aria-pressed')!=='true';
  (el.getAttribute('data-password-toggle')||'').split(',').forEach(function(id){var i=d.getElementById(id.trim());if(i)i.type=show?'text':'password'});
  el.setAttribute('aria-pressed',show?'true':'false');
  });
  })();`;
  
  export function ThemeScript() {
    return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
  }