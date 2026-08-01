/* Genera REVISION-KINESIOLOGIA.md a partir del contenido clínico que vive
   dentro de index.html. El documento es para que Catalina revise: no se
   edita a mano, se regenera con `node scripts/generar-revision.js` cada vez
   que cambian KIN_CASOS, KIN_PRUEBAS, KIN_MUSCULOS, KIN_RANGOS o KIN_DX. */
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const RUTA = path.join(RAIZ, 'index.html');
const txt = fs.readFileSync(RUTA, 'utf8');
const lineas = txt.split('\n');
const ini = lineas.findIndex(l => l.startsWith('const KIN_PRUEBAS = ['));
const fin = lineas.findIndex((l, i) => i > ini && l.startsWith('const KIN_DX = {'));
const finDx = lineas.findIndex((l, i) => i > fin && l === '};');
const bloque = lineas.slice(ini, finDx + 1).join('\n');
const D = new Function(bloque + '\nreturn { KIN_PRUEBAS, KIN_CASOS, CL_REGRESO, KIN_MUSCULOS, KIN_RANGOS, CL_ACC, KIN_DX };')();
const { KIN_PRUEBAS, KIN_CASOS, CL_REGRESO, KIN_MUSCULOS, KIN_RANGOS, CL_ACC, KIN_DX } = D;

const nom = id => (KIN_CASOS.find(c => c.id === id) || {}).nom || id;
const accNom = id => (CL_ACC.find(a => a.id === id) || {}).n || id;
const esc = s => String(s).replace(/\|/g, '\\|');
const edad = c => c.edadTxt || (c.edad + ' años');

let o = `# Contenido de kinesiología

Catalina: esto es todo lo que enseña la Clínica del Rincón. Está publicado.

Si algo está mal o lo ven distinto en la U, dímelo y lo corrijo: se cambia en un solo lugar y el juego entero queda corregido.

- Los **rangos articulares** son de AAOS.
- Las **pruebas ortopédicas** orientan, no diagnostican solas; el juego las simplifica para que la mecánica funcione.
- En los **músculos**, entre paréntesis van las raíces nerviosas.
- Lo más importante de revisar es la **sección 2**: son las pistas con las que se descartan hipótesis.

---
## 1. Casos (${KIN_CASOS.length})
`;

const ESP = { trauma:'Traumatológica', deporte:'Deportiva', respi:'Respiratoria', neuro:'Neurológica' };
for(const esp of ['trauma','deporte','respi','neuro']){
  const casos = KIN_CASOS.filter(c => c.esp === esp);
  o += `\n### Especialidad ${ESP[esp]} (${casos.length})\n`;
  for(const c of casos){
    const pr = c.prueba ? (KIN_PRUEBAS.find(p => p.id === c.prueba) || {}).nom : null;
    o += `\n#### ${c.ava} ${c.nom}  \`${c.zona}\`${c.derivar ? '  ⚠️ **lo correcto es DERIVAR**' : ''}\n`;
    if(c.derivar) o += `- **⚠️ Lo correcto es DERIVAR, no tratar.**${c.urgente ? ' Puede llegar como urgencia con reloj.' : ''}\n`;
    o += `- **Paciente:** ${c.pac}, ${edad(c)}, ${c.ocup} — ${c.motivo.charAt(0).toLowerCase() + c.motivo.slice(1)}\n`;
    o += `- **Mecanismo:** ${c.mecanismo}\n`;
    o += `- **Prueba:** ${pr ? pr : '_(no aplica)_'} → ${c.hallazgo}\n`;
    o += `- **Tratamiento correcto** (fase ${c.fase}): ${c.tto}\n`;
    o += `- **Se le enseña:** _${c.dato}_\n`;
    o += `- **Cuando vuelve:** ${CL_REGRESO[c.id]}\n`;
  }
}

o += `\n---\n## 2. Razonamiento diagnóstico\n\n**↑** hace más probable · **↓** descarta.\n`;
for(const c of KIN_CASOS){
  const dx = KIN_DX[c.id];
  if(!dx) continue;
  o += `\n### ${c.ava} ${c.nom}\nCompite contra: ${dx.dif.filter(d => d !== c.id).map(nom).join(', ')}\n\n`;
  o += `| Acción | Hallazgo | ↑ | ↓ |\n|---|---|---|---|\n`;
  for(const k of Object.keys(dx.c)){
    const pi = dx.c[k];
    o += `| ${esc(accNom(k))} | ${esc(pi.t)} | ${pi.s.map(nom).map(esc).join(', ') || '—'} | ${pi.n.map(nom).map(esc).join(', ') || '—'} |\n`;
  }
}

o += `\n---\n## 3. Pruebas ortopédicas (${KIN_PRUEBAS.length})\n\n| Prueba | Zona | Cómo se hace | Positiva sugiere |\n|---|---|---|---|\n`;
KIN_PRUEBAS.forEach(p => { o += `| **${esc(p.nom)}** | ${p.zona} | ${esc(p.como)} | ${esc(p.sug)} |\n`; });

o += `\n---\n## 4. Músculos (${KIN_MUSCULOS.length})\n\n| Músculo | Origen | Inserción | Inervación | Acción |\n|---|---|---|---|---|\n`;
KIN_MUSCULOS.forEach(m => { o += `| **${esc(m.nom)}** | ${esc(m.origen)} | ${esc(m.insercion)} | ${esc(m.nervio)} | ${esc(m.accion)} |\n`; });

o += `\n---\n## 5. Rangos articulares — AAOS\n\n| Articulación | Movimiento | Grados |\n|---|---|---|\n`;
KIN_RANGOS.forEach(r => { o += `| ${r.art} | ${r.mov} | ${r.grados}° |\n`; });

fs.writeFileSync(path.join(RAIZ, 'REVISION-KINESIOLOGIA.md'), o);
console.log('escrito · casos', KIN_CASOS.length, '· pruebas', KIN_PRUEBAS.length, '· músculos', KIN_MUSCULOS.length);
