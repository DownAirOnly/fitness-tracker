(() => {
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try { preference = localStorage.getItem('everyday-theme') || 'system'; } catch {}
  if (!['light', 'dark', 'system'].includes(preference)) preference = 'system';
  function apply() {
    const dark = preference === 'dark' || (preference === 'system' && system.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101914' : '#f7f8f2');
  }
  window.everydayTheme = {
    get preference() { return preference; },
    set(value) {
      if (!['light', 'dark', 'system'].includes(value)) return;
      preference = value;
      try { localStorage.setItem('everyday-theme', value); } catch {}
      apply();
    }
  };
  system.addEventListener('change', apply);
  apply();
})();
