(() => {
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  // v112: account/document settings own theme. There is no separate local
  // preference key that could override the signed-in profile.
  let preference = 'system';
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
      apply();
    }
  };
  system.addEventListener('change', apply);
  apply();
})();
