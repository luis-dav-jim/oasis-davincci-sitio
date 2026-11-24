(function () {
  var r = document.documentElement;
  r.classList.add('js');
  var q = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  if (!q || !q.matches) r.classList.add('mov');
  if (q && q.addEventListener) q.addEventListener('change', function () { r.classList.toggle('mov', !q.matches); });
})();
