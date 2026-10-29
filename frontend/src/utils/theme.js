export const applyTheme = (theme) => {
  const root = document.documentElement;
  let isDark = false;

  if (theme === 'dark') {
    isDark = true;
  } else if (theme === 'system') {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDark = false;
  }

  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }

  try {
    localStorage.setItem('worksphere_theme', theme);
  } catch (e) {
    console.error('Failed to save theme in localStorage', e);
  }
};

export const getSavedTheme = () => {
  try {
    return localStorage.getItem('worksphere_theme') || 'light';
  } catch {
    return 'light';
  }
};
