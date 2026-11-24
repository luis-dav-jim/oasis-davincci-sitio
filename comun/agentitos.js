(function () {
  'use strict';
  const OJOS = '<span class="ag-ojo"><i class="ag-parpado"></i></span>';
  const NOMBRE_ROL = {
    general: 'general', lider: 'líder', planificador: 'planificador', codigo: 'código', revision: 'revisión', verificador: 'verificador',
    investigacion: 'investigación', render: 'render', infra: 'infraestructura', diseno: 'diseño', datos: 'datos', redactor: 'redactor', vigia: 'vigía',
  };
  const NOMBRE_ANIMO = {
    reposo: 'en reposo', pensando: 'pensando', trabajando: 'trabajando', esperando: 'esperando una decisión', error: 'con un error',
    terminado: 'terminó', dormido: 'detenido',
  };

  function marcado({ rol = 'general', animo = 'reposo', tam = 68, equipo = 4, mira = '', decorativo = false } = {}) {
    const orbita = rol === 'lider' ? `<span class="ag-orbita ag-n${equipo}">${'<i></i>'.repeat(equipo)}</span>` : '';
    const voz = decorativo ? 'aria-hidden="true"' : `role="img" aria-label="Agentito de ${NOMBRE_ROL[rol] ?? rol}, ${NOMBRE_ANIMO[animo] ?? animo}"`;
    return `<span class="agentito ag-t${tam}" data-rol="${rol}" data-animo="${animo}"${tam <= 28 ? ' data-chico' : ''}${mira ? ` data-mira="${mira}"` : ''} ${voz}>` +
      `${orbita}<span class="ag-orbe"></span><span class="ag-anillo"></span><span class="ag-cara"><span class="ag-mirada">${OJOS}${OJOS}</span></span></span>`;
  }

  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const CADA = { reposo: [4000, 9000], pensando: [3000, 6000], esperando: [2800, 3600], trabajando: [5000, 9000] };
  const visibles = new Map(); // agentito → cuándo le toca parpadear
  let reloj, vigia, cuadro = 0, puntero = null, ultimoY = 0, vuelta;

  function latir() {
    if (document.hidden) return;
    const ahora = performance.now();
    for (const [el, toca] of visibles) {
      const r = CADA[el.dataset.animo];
      if (!r || ahora < toca) continue;
      el.classList.remove('parpadea');
      void el.offsetWidth; // reinicia la animación
      el.classList.add('parpadea');
      visibles.set(el, ahora + r[0] + Math.random() * (r[1] - r[0]));
    }
  }
  function mirar() {
    cuadro = 0;
    if (!puntero) return;
    for (const el of visibles.keys()) {
      if (el.dataset.mira !== 'puntero') continue;
      const c = el.getBoundingClientRect();
      const dx = puntero.x - (c.left + c.width / 2), dy = puntero.y - (c.top + c.height / 2);
      const d = Math.hypot(dx, dy) || 1, fuerza = Math.min(1, d / 160);
      el.style.setProperty('--mx', ((dx / d) * fuerza).toFixed(3));
      el.style.setProperty('--my', ((dy / d) * fuerza).toFixed(3));
    }
  }
  function alMover(e) { puntero = { x: e.clientX, y: e.clientY }; cuadro ||= requestAnimationFrame(mirar); }
  function alBajar() {
    const y = scrollY, dir = Math.sign(y - ultimoY);
    ultimoY = y;
    if (!dir) return;
    for (const el of visibles.keys()) if (el.dataset.mira === 'scroll') el.style.setProperty('--my', dir * 0.9);
    clearTimeout(vuelta);
    vuelta = setTimeout(() => { for (const el of visibles.keys()) if (el.dataset.mira === 'scroll') el.style.setProperty('--my', 0); }, 380);
  }

  function iniciar(raiz = document) {
    if (quieto.matches || !('IntersectionObserver' in window)) return;
    vigia ??= new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        e.target.classList.toggle('fuera', !e.isIntersecting);
        if (e.isIntersecting) visibles.set(e.target, performance.now() + 1200 + Math.random() * 4000); else visibles.delete(e.target);
      }
      if (visibles.size && !reloj) reloj = setInterval(latir, 250);
      if (!visibles.size && reloj) { clearInterval(reloj); reloj = undefined; }
    });
    for (const el of raiz.querySelectorAll('.agentito')) vigia.observe(el);
    if (!iniciar.listo) {
      iniciar.listo = true;
      addEventListener('pointermove', alMover, { passive: true });
      addEventListener('scroll', alBajar, { passive: true });
      document.addEventListener('animationend', (e) => { if (e.animationName === 'ag-parpadear') e.target.closest('.agentito')?.classList.remove('parpadea'); });
    }
  }

  window.Agentitos = { marcado, iniciar, NOMBRE_ROL, NOMBRE_ANIMO };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => iniciar()); else iniciar();
})();
