import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  darkMode: boolean;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  initTheme: () => void;
}

function applyTheme(dark: boolean): void {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  darkMode: false,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      applyTheme(next);
      localStorage.setItem('mcpspec-theme', next ? 'dark' : 'light');
      return { darkMode: next };
    }),

  initTheme: () => {
    const stored = localStorage.getItem('mcpspec-theme');
    let dark: boolean;
    if (stored) {
      dark = stored === 'dark';
    } else {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme(dark);
    set({ darkMode: dark });
  },
}));
