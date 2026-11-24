(() => {
  const raiz = document.documentElement;
  const mov = () => raiz.classList.contains('mov');
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const hayIO = 'IntersectionObserver' in window;

  const barra = document.querySelector('.barra');
  if (barra) {
    const marcar = () => barra.classList.toggle('con-borde', window.scrollY > 8);
    marcar();
    addEventListener('scroll', marcar, { passive: true });
  }

  const menu = document.querySelector('.menu');
  if (menu) {
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
    menu.addEventListener('toggle', () => raiz.classList.toggle('menu-abierto', menu.open));
  }

  if (hayIO) {
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    $$('.rv').forEach((el) => io.observe(el));
  } else $$('.rv').forEach((el) => el.classList.add('in'));

  if (hayIO) {
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        e.target.classList.toggle('fuera', !e.isIntersecting);
        e.target.dispatchEvent(new CustomEvent('a-la-vista', { detail: e.isIntersecting }));
      }
    }, { rootMargin: '-15% 0px' });
    $$('[data-pausa]').forEach((el) => { el.classList.add('fuera'); io.observe(el); });
  }

  const medidos = $$('[data-progreso]').map((el) => {
    const [, n] = (el.dataset.progreso || '').match(/:(\d+)/) || [];
    return { el, pasos: n ? Number(n) : 0, ultimo: -1, paso: 0, visto: !hayIO };
  });
  if (medidos.length) {
    const altoBarra = () => (barra ? barra.offsetHeight : 0);
    let pendiente = false;
    const medir = () => {
      pendiente = false;
      const alto = window.innerHeight;
      for (const m of medidos) {
        if (!m.visto) continue;
        const r = m.el.getBoundingClientRect();
        const tramo = r.height - (alto - altoBarra());
        const fijada = mov() && tramo > 40 && getComputedStyle(m.el.firstElementChild).position === 'sticky';
        let p = fijada ? (altoBarra() - r.top) / tramo : 1;
        p = Math.max(0, Math.min(1, p));
        if (Math.abs(p - m.ultimo) >= 0.002) { m.ultimo = p; m.el.style.setProperty('--p', p.toFixed(4)); }
        if (m.pasos) {
          const paso = Math.min(m.pasos, 1 + Math.floor(p * m.pasos));
          if (paso !== m.paso) { m.paso = paso; m.el.dataset.paso = String(paso); m.el.dispatchEvent(new CustomEvent('paso', { detail: { paso, p } })); }
        }
      }
    };
    const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(medir); } };
    if (hayIO) {
      const io = new IntersectionObserver((es) => {
        for (const e of es) { const m = medidos.find((x) => x.el === e.target); if (m) m.visto = e.isIntersecting; }
        pedir();
      }, { rootMargin: '10% 0px' });
      medidos.forEach((m) => io.observe(m.el));
    }
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir);
    pedir();
  }

  for (const a of $$('[data-enfoca]')) {
    a.addEventListener('click', (e) => {
      const d = document.querySelector(a.dataset.enfoca);
      if (!d) return;
      e.preventDefault();
      d.scrollIntoView({ block: 'center', behavior: mov() ? 'smooth' : 'auto' });
      d.focus({ preventScroll: true });
    });
  }

  for (const grupo of $$('[data-elige]')) {
    const nombre = grupo.dataset.elige;
    const destinos = () => {
      const base = $$(grupo.dataset.en || 'body');
      return grupo.dataset.hijos ? base.flatMap((b) => $$(grupo.dataset.hijos, b)) : base;
    };
    const botones = $$('button[data-valor]', grupo);
    const elegir = (b, usuario) => {
      botones.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      destinos().forEach((d) => { d.dataset[nombre] = b.dataset.valor; });
      grupo.dispatchEvent(new CustomEvent('elegido', { bubbles: true, detail: { nombre, valor: b.dataset.valor, usuario } }));
    };
    botones.forEach((b) => b.addEventListener('click', () => elegir(b, true)));
  }
})();
