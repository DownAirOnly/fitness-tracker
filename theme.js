(() => {
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  // v112: account/document settings own theme. There is no separate local
  // preference key that could override the signed-in profile.
  let preference = 'system';
  function apply() {
    const dark = preference === 'dark' || (preference === 'system' && system.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    // Android system UI may use the live theme-color meta tag. Match the active
    // palette in dark mode rather than resetting to forest on OS theme changes.
    const savedPageColor=document.documentElement.style.getPropertyValue('--ap-bg').trim();
    const chromeColor=dark&&/^#[0-9a-f]{6}$/i.test(savedPageColor)?savedPageColor:dark?'#101914':'#f7f8f2';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',chromeColor);
  }
  window.everydayTheme = {
    get preference() { return preference; },
    refresh: apply,
    set(value) {
      if (!['light', 'dark', 'system'].includes(value)) return;
      preference = value;
      apply();
    }
  };
  system.addEventListener('change', apply);
  apply();
})();
