(() => {
  const raiz = document.documentElement;
  const mov = () => raiz.classList.contains('mov');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const SVG = 'http://www.w3.org/2000/svg';
  const alEnviar = (caja, fn) => {
    $('[data-envia]', caja).addEventListener('click', fn);
    $('input', caja).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); fn(); } });
  };
  const espera = (ms) => new Promise((r) => setTimeout(r, mov() ? ms : Math.min(ms, 350)));

  const piz = $('[data-pizarron]');
  if (piz) {
    const lienzo = $('[data-lienzo]', piz);
    const svg = $('.lineas', lienzo);
    const hilos = $('[data-hilos]', svg);
    const pista = $('[data-pista]', lienzo);
    const bitacora = $('[data-bitacora]', piz);
    const decision = $('[data-decision]', piz);
    const pregunta = $('[data-pregunta]', decision);
    const campo = $('#encargo', piz);
    const nodos = new Map($$('.n', lienzo).map((el) => [el.dataset.id, { id: el.dataset.id, el, bola: $('.agentito', el), estado: $('[data-estado]', el), nombre: el.dataset.nombre }]));
    const INICIAL = [['orq', 'lid'], ['lid', 'cod'], ['lid', 'dis'], ['lid', 'rev']];
    const REPOSO = { orq: 'en reposo', lid: 'coordina a 3', cod: 'en reposo', dis: 'en reposo', rev: 'en reposo' };
    const PISTA = pista.textContent;
    const BITACORA = [...bitacora.children].map((n) => n.cloneNode(true));
    let aristas = [];
    let elegido = null;
    let corrida = 0;
    let tocado = false;

    const centro = (id) => {
      const l = lienzo.getBoundingClientRect(), b = nodos.get(id).bola.getBoundingClientRect();
      return { x: b.left + b.width / 2 - l.left, y: b.top + b.height / 2 - l.top };
    };
    const trazo = (p, q) => {
      const dx = q.x - p.x, dy = q.y - p.y;
      if (Math.abs(dx) >= Math.abs(dy)) { const m = p.x + dx / 2; return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}C${m.toFixed(1)} ${p.y.toFixed(1)} ${m.toFixed(1)} ${q.y.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }
      const m = p.y + dy / 2;
      return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}C${p.x.toFixed(1)} ${m.toFixed(1)} ${q.x.toFixed(1)} ${m.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    };
    const pintar = () => {
      const w = lienzo.clientWidth, h = lienzo.clientHeight;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.removeAttribute('preserveAspectRatio');
      for (const a of aristas) a.path.setAttribute('d', trazo(centro(a.a), centro(a.b)));
    };
    let cuadro = 0;
    const pedirPintar = () => { if (!cuadro) cuadro = requestAnimationFrame(() => { cuadro = 0; pintar(); }); };

    const busca = (a, b) => aristas.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    const crear = (a, b, bus = false, dibujar = false) => {
      const path = document.createElementNS(SVG, 'path');
      if (bus) path.classList.add('bus');
      hilos.append(path);
      const arista = { a, b, path };
      aristas.push(arista);
      path.setAttribute('d', trazo(centro(a), centro(b)));
      if (dibujar && mov() && path.animate) {
        const largo = path.getTotalLength();
        path.classList.add('nueva');
        return path.animate([{ strokeDasharray: `${largo} ${largo}`, strokeDashoffset: largo }, { strokeDasharray: `${largo} ${largo}`, strokeDashoffset: 0 }], { duration: 420, easing: 'cubic-bezier(.65,0,.35,1)' })
          .finished.catch(() => {}).then(() => { setTimeout(() => path.classList.remove('nueva'), 900); });
      }
      return Promise.resolve();
    };

    const ruta = (a, b) => {
      const previo = new Map([[a, null]]), cola = [a];
      while (cola.length) {
        const n = cola.shift();
        if (n === b) break;
        for (const x of aristas) {
          const v = x.a === n ? x.b : x.b === n ? x.a : null;
          if (v && !previo.has(v)) { previo.set(v, n); cola.push(v); }
        }
      }
      if (!previo.has(b)) return [];
      const camino = [];
      for (let n = b; n; n = previo.get(n)) camino.unshift(n);
      return camino;
    };
    const salto = (a, b) => new Promise((listo) => {
      const arista = busca(a, b);
      if (!arista || !mov()) return listo();
      const alReves = arista.a !== a;
      const largo = arista.path.getTotalLength();
      const punto = document.createElementNS(SVG, 'circle');
      punto.setAttribute('r', '4.5');
      punto.classList.add('mensaje');
      svg.append(punto);
      const dura = Math.max(380, Math.min(900, largo * 2.6));
      const t0 = performance.now();
      const paso = (t) => {
        let k = Math.min(1, (t - t0) / dura);
        const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const pt = arista.path.getPointAtLength((alReves ? 1 - e : e) * arista.path.getTotalLength());
        punto.setAttribute('cx', pt.x.toFixed(1));
        punto.setAttribute('cy', pt.y.toFixed(1));
        if (k < 1) requestAnimationFrame(paso); else { punto.remove(); listo(); }
      };
      requestAnimationFrame(paso);
    });
    const mensaje = async (a, b) => {
      const camino = ruta(a, b);
      for (let i = 0; i + 1 < camino.length; i++) await salto(camino[i], camino[i + 1]);
    };

    const animo = (id, a, texto) => {
      const n = nodos.get(id);
      n.bola.dataset.animo = a;
      n.el.dataset.animoNodo = a;
      if (texto) n.estado.textContent = texto;
    };
    const anota = (texto) => {
      const li = document.createElement('li');
      li.className = 'dato';
      li.textContent = texto;
      bitacora.prepend(li);
      while (bitacora.children.length > 3) bitacora.lastElementChild.remove();
    };
    const elegir = (id) => {
      elegido = id;
      for (const n of nodos.values()) n.el.classList.toggle('sel', n.id === id);
      pista.textContent = id ? `${nodos.get(id).nombre}, elegida. Toca otra para trazar un canal.` : PISTA;
    };

    const encargar = async (texto) => {
      const yo = ++corrida;
      const sigo = () => yo === corrida;
      decision.dataset.pide = 'no';
      for (const id of nodos.keys()) animo(id, 'reposo', REPOSO[id]);
      anota(`tú → Orquestador · «${texto}»`);
      animo('orq', 'pensando', 'lee el encargo');
      await espera(1200); if (!sigo()) return;
      anota('Orquestador → Líder · reparte el encargo');
      await mensaje('orq', 'lid'); if (!sigo()) return;
      animo('orq', 'reposo', 'atento');
      animo('lid', 'trabajando', 'reparte el trabajo');
      await espera(500); if (!sigo()) return;
      anota('Líder → Código, Diseño y Revisión · un encargo a cada uno');
      await Promise.all([
        mensaje('lid', 'cod').then(() => sigo() && animo('cod', 'trabajando', 'escribe el checkout')),
        espera(160).then(() => mensaje('lid', 'dis')).then(() => sigo() && animo('dis', 'trabajando', 'dibuja la landing')),
        espera(320).then(() => mensaje('lid', 'rev')).then(() => sigo() && animo('rev', 'reposo', 'espera el diff')),
      ]);
      await espera(2400); if (!sigo()) return;
      anota('Código → Revisión · enviar("listo para revisar")');
      await mensaje('cod', 'rev'); if (!sigo()) return;
      animo('cod', 'terminado', 'terminó su turno');
      animo('rev', 'trabajando', 'lee el diff');
      await espera(2000); if (!sigo()) return;
      animo('dis', 'terminado', 'publicó el artefacto');
      await espera(700); if (!sigo()) return;
      pedirDecision('¿Publico la landing con el checkout nuevo?');
    };
    const pedirDecision = (texto) => {
      animo('rev', 'esperando', 'espera tu decisión');
      anota('Revisión → tú · espera tu decisión');
      pregunta.textContent = texto;
      decision.dataset.pide = 'si';
    };
    const responder = async (que) => {
      const yo = ++corrida;
      const sigo = () => yo === corrida;
      decision.dataset.pide = 'no';
      if (que === 'aprobar') {
        anota('tú → Revisión · aprobar');
        animo('rev', 'terminado', 'aprobado');
        await mensaje('rev', 'lid'); if (!sigo()) return;
        animo('lid', 'terminado', 'equipo listo');
        await mensaje('lid', 'orq'); if (!sigo()) return;
        animo('orq', 'terminado', 'entregado');
        anota('Orquestador → tú · listo: la landing quedó publicada como artefacto');
        await espera(6000); if (!sigo()) return;
        for (const id of nodos.keys()) animo(id, 'reposo', REPOSO[id]);
      } else {
        anota('tú → Revisión · pedir cambios');
        animo('rev', 'trabajando', 'anota los cambios');
        await espera(900); if (!sigo()) return;
        anota('Revisión → Código · enviar("dos cambios en el checkout")');
        await mensaje('rev', 'cod'); if (!sigo()) return;
        animo('rev', 'reposo', 'espera el diff');
        animo('cod', 'trabajando', 'aplica los cambios');
        await espera(2400); if (!sigo()) return;
        anota('Código → Revisión · enviar("cambios aplicados")');
        await mensaje('cod', 'rev'); if (!sigo()) return;
        animo('cod', 'terminado', 'terminó su turno');
        pedirDecision('Con los cambios aplicados, ¿publico la landing?');
      }
    };

    const tocar = async (id) => {
      tocado = true;
      if (!elegido) return elegir(id);
      if (elegido === id) return elegir(null);
      const a = elegido, b = id, A = nodos.get(a).nombre, B = nodos.get(b).nombre;
      elegir(null);
      if (!busca(a, b)) {
        anota(`conectar_nodos({ a: "${A}", b: "${B}" })`);
        pista.textContent = `Canal trazado: ${A} y ${B} ya pueden hablarse.`;
        await crear(a, b, true, true);
      } else pista.textContent = `${A} le escribe a ${B} por su canal.`;
      anota(`${A} → ${B} · enviar("¿me lees?")`);
      await salto(a, b);
      const bola = nodos.get(b).bola;
      bola.classList.remove('parpadea'); void bola.offsetWidth; bola.classList.add('parpadea');
    };

    const limite = (v, a, b) => Math.max(a, Math.min(b, v));
    const mover = (n, x, y) => {
      n.el.style.setProperty('--x', `${limite(x, 8, 92).toFixed(2)}%`);
      n.el.style.setProperty('--y', `${limite(y, 14, 84).toFixed(2)}%`);
      pedirPintar();
    };
    for (const n of nodos.values()) {
      let ini = null, arrastro = false;
      n.el.addEventListener('pointerdown', (e) => {
        if (e.button) return;
        const l = lienzo.getBoundingClientRect(), c = centro(n.id);
        ini = { px: e.clientX, py: e.clientY, dx: e.clientX - l.left - c.x, dy: e.clientY - l.top - c.y, id: e.pointerId };
        arrastro = false;
        n.el.setPointerCapture(e.pointerId);
      });
      n.el.addEventListener('pointermove', (e) => {
        if (!ini || e.pointerId !== ini.id) return;
        if (!arrastro && Math.hypot(e.clientX - ini.px, e.clientY - ini.py) < 6) return;
        arrastro = true; tocado = true;
        n.el.classList.add('arrastra');
        const l = lienzo.getBoundingClientRect();
        mover(n, ((e.clientX - l.left - ini.dx) / l.width) * 100, ((e.clientY - l.top - ini.dy) / l.height) * 100);
      });
      const soltar = () => { ini = null; n.el.classList.remove('arrastra'); };
      n.el.addEventListener('pointerup', soltar);
      n.el.addEventListener('pointercancel', soltar);
      n.el.addEventListener('click', (e) => { if (arrastro) { arrastro = false; e.preventDefault(); return; } tocar(n.id); });
      n.el.addEventListener('keydown', (e) => {
        const d = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
        if (!d) return;
        e.preventDefault(); tocado = true;
        const l = lienzo.getBoundingClientRect(), c = centro(n.id);
        mover(n, (c.x / l.width) * 100 + d[0], (c.y / l.height) * 100 + d[1]);
      });
    }

    const armar = () => {
      hilos.replaceChildren();
      aristas = [];
      for (const [a, b] of INICIAL) crear(a, b);
      pintar();
    };
    const reiniciar = () => {
      corrida++;
      for (const n of nodos.values()) { n.el.style.removeProperty('--x'); n.el.style.removeProperty('--y'); }
      for (const id of nodos.keys()) animo(id, 'reposo', REPOSO[id]);
      decision.dataset.pide = 'no';
      bitacora.replaceChildren(...BITACORA.map((n) => n.cloneNode(true)));
      elegir(null);
      armar();
    };

    $('[data-reiniciar]', piz).addEventListener('click', reiniciar);
    alEnviar($('[data-encargo]', piz), () => {
      const texto = campo.value.trim().replace(/\s+/g, ' ').slice(0, 120) || 'Saca la landing nueva y revisa el checkout';
      campo.value = '';
      tocado = true;
      encargar(texto);
    });
    $$('[data-responde]', decision).forEach((b) => b.addEventListener('click', () => responder(b.dataset.responde)));

    armar();
    if ('ResizeObserver' in window) new ResizeObserver(pedirPintar).observe(lienzo);
    else addEventListener('resize', pedirPintar);
    document.fonts?.ready.then(pedirPintar);

    let estrenado = false;
    piz.addEventListener('a-la-vista', (e) => {
      if (!e.detail || estrenado) return;
      estrenado = true;
      setTimeout(() => { if (!tocado) encargar('Saca la landing nueva y revisa el checkout'); }, 900);
    });
  }

  const escena = $('[data-escena]');
  if (escena) {
    const PASOS = {
      1: { orq: 'pensando', lid: 'reposo', cod: 'reposo', dis: 'reposo', rev: 'reposo' },
      2: { orq: 'reposo', lid: 'trabajando', cod: 'trabajando', dis: 'trabajando', rev: 'reposo' },
      3: { orq: 'reposo', lid: 'trabajando', cod: 'trabajando', dis: 'trabajando', rev: 'trabajando' },
      4: { orq: 'reposo', lid: 'trabajando', cod: 'terminado', dis: 'trabajando', rev: 'esperando' },
      5: { orq: 'reposo', lid: 'terminado', cod: 'terminado', dis: 'terminado', rev: 'terminado' },
    };
    const bolas = Object.fromEntries($$('[data-e]', escena).map((b) => [b.dataset.e, b]));
    const poner = (paso) => { const t = PASOS[paso]; if (t) for (const [k, a] of Object.entries(t)) if (bolas[k]) bolas[k].dataset.animo = a; };
    escena.addEventListener('paso', (e) => poner(e.detail.paso));
    if (escena.dataset.paso) poner(Number(escena.dataset.paso));
  }

  const NOTAS = {
    animo: {
      trabajando: 'El anillo blanco late y cada rol hace su gesto.',
      reposo: 'Sin anillo: está libre y atenta.',
      esperando: 'Anillo ámbar y ojos muy abiertos: espera tu decisión.',
      terminado: 'Sonríe: terminó su turno.',
      error: 'Anillo rojo y ojos en equis: algo falló.',
      dormido: 'Ojos cerrados: su sesión está detenida y se puede reanudar.',
    },
    version: {
      1: 'v1 · Diseño publicó el primer boceto.',
      2: 'v2 · Código conectó el botón de compra y la foto.',
      3: 'v3 · Revisión pidió tres columnas y Diseño las añadió.',
    },
    modo: {
      'sin-commit': 'Lo que el worker tiene sin commit, con los archivos nuevos.',
      base: 'Todo lo que su rama trae contra la base, más lo que aún no tiene commit.',
      turno: 'Lo que cambió entre sus dos últimos puntos de control.',
    },
  };
  document.addEventListener('elegido', (e) => {
    const { nombre, valor } = e.detail;
    const nota = $(`[data-nota-${nombre}]`);
    if (nota && NOTAS[nombre]?.[valor]) nota.textContent = NOTAS[nombre][valor];
  });

  const bus = $('[data-bus]');
  if (bus) {
    const HERRAMIENTAS = {
      vecinos: ['Muestra con quién estás conectado y si puedes escribirle.', 'vecinos()\n\n[\n  { "id": "lider", "estado": "activa" },\n  { "id": "revision", "estado": "activa" }\n]'],
      enviar: ['Le llega a su buzón. Si es una terminal viva, se le teclea en cuanto queda libre.', 'enviar(a: "revision", mensaje: "listo para revisar: 3 archivos")\n\n{ "ok": true, "entrega": "tecleado al quedar libre" }'],
      salida: ['Lee las últimas líneas de la pantalla de un vecino, como las vería una persona.', 'leer_salida(nodo: "revision")\n\nLeo carrito.ts y pago.ts\nDos notas en pago.ts, línea 41 y 58\nEspero la decisión de quien dirige'],
      buzon: ['Trae y vacía lo que otros nodos te mandaron.', 'leer_buzon()\n\n[\n  { "de": "lider", "hace_s": 12,\n    "texto": "Empieza por el checkout en móvil." }\n]'],
    };
    const que = $('[data-bus-que]', bus), salida = $('[data-bus-salida]', bus), botones = $$('[data-herramienta]', bus);
    botones.forEach((b) => b.addEventListener('click', () => {
      botones.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const [texto, ejemplo] = HERRAMIENTAS[b.dataset.herramienta];
      que.textContent = texto;
      salida.textContent = ejemplo;
    }));
  }

  const redactar = $('[data-redactar]');
  if (redactar) {
    const CLAVE = 'sk_ejemplo_4242';
    const campo = $('input', redactar), texto = $('[data-texto]', redactar);
    alEnviar(redactar, () => {
      const crudo = campo.value.trim().slice(0, 90);
      if (!crudo) { texto.textContent = 'Escribe algo para mandar.'; return; }
      texto.textContent = crudo.includes(CLAVE) ? crudo.split(CLAVE).join('••••[stripe-prueba]') : `${crudo} (sin la clave, pasa tal cual)`;
    });
  }

  const tareas = $('[data-tareas]');
  if (tareas) {
    const filas = $$('.ramas > li', tareas), vacio = $('[data-vacio]', tareas);
    const contar = () => {
      const n = { toca: 0, marcha: 0, todo: filas.length };
      for (const f of filas) if (n[f.dataset.espera] !== undefined) n[f.dataset.espera]++;
      for (const [k, v] of Object.entries(n)) { const c = $(`[data-cuenta="${k}"]`, tareas); if (c) c.textContent = String(v); }
      const filtro = tareas.dataset.filtro;
      vacio.hidden = filtro === 'todo' || filas.some((f) => f.dataset.espera === filtro);
    };
    const abrir = (fila) => filas.forEach((f) => $('.rama', f).setAttribute('aria-expanded', String(f === fila && $('.rama', f).getAttribute('aria-expanded') !== 'true')));
    for (const fila of filas) {
      const rama = $('.rama', fila), punto = $('.punto', rama), quien = $('.rama-q', rama), commits = $('.commits', fila), resp = $('[data-respuestas]', fila);
      rama.addEventListener('click', () => abrir(fila));
      const mover = (espera, clase, texto, commit) => {
        fila.dataset.espera = espera;
        punto.className = `punto${clase ? ' ' + clase : ''}`;
        quien.textContent = texto;
        $$('.ahora', commits).forEach((c) => c.classList.remove('ahora'));
        const li = document.createElement('li'); li.className = 'ahora'; li.textContent = commit; commits.append(li);
        resp?.remove();
        rama.setAttribute('aria-expanded', 'false');
        contar();
        rama.focus();
      };
      $('[data-cierra]', fila)?.addEventListener('click', () => mover('lista', 'hecho', 'lista', 'Hecha'));
      $('[data-devuelve]', fila)?.addEventListener('click', () => mover('marcha', '', 'la lleva Diseño', 'Pediste cambios: vuelve a Diseño'));
    }
    tareas.addEventListener('elegido', contar);
    contar();
  }
})();
