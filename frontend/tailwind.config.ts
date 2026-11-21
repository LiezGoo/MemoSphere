import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: {
          0: 'var(--color-bg-0)',
          1: 'var(--color-bg-1)',
          2: 'var(--color-bg-2)',
        },
        surface: {
          1: 'var(--color-surface-1)',
          2: 'var(--color-surface-2)',
          3: 'var(--color-surface-3)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          'on-accent': 'var(--color-text-on-accent)',
        },
        accent: {
          start: 'var(--color-accent-start)',
          end: 'var(--color-accent-end)',
          hover: 'var(--color-accent-hover)',
          active: 'var(--color-accent-active)',
        },
        link: 'var(--color-link)',
        focus: 'var(--color-focus-ring)',
        state: {
          info: {
            fg: 'var(--color-state-info-fg)',
            bg: 'var(--color-state-info-bg)',
            border: 'var(--color-state-info-border)',
          },
          success: {
            fg: 'var(--color-state-success-fg)',
            bg: 'var(--color-state-success-bg)',
            border: 'var(--color-state-success-border)',
          },
          warning: {
            fg: 'var(--color-state-warning-fg)',
            bg: 'var(--color-state-warning-bg)',
            border: 'var(--color-state-warning-border)',
          },
          danger: {
            fg: 'var(--color-state-danger-fg)',
            bg: 'var(--color-state-danger-bg)',
            border: 'var(--color-state-danger-border)',
          },
        },
        emotion: {
          joy: 'var(--timeline-joy)',
          sadness: 'var(--timeline-sadness)',
          anger: 'var(--timeline-anger)',
          fear: 'var(--timeline-fear)',
          disgust: 'var(--timeline-disgust)',
          anxiety: 'var(--timeline-anxiety)',
          unlabeled: 'var(--timeline-unlabeled)',
        },
      },
      backgroundImage: {
        accent: 'var(--gradient-accent)',
        'countdown-rainbow': 'var(--color-countdown-rainbow)',
      },
      boxShadow: {
        glass: 'var(--shadow-card)',
        glow: 'var(--shadow-glow)',
        overlay: 'var(--shadow-overlay)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        panel: 'var(--radius-panel)',
        control: 'var(--radius-control)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        'token-1': 'var(--space-1)',
        'token-2': 'var(--space-2)',
        'token-3': 'var(--space-3)',
        'token-4': 'var(--space-4)',
        'token-5': 'var(--space-5)',
        'token-6': 'var(--space-6)',
        'token-8': 'var(--space-8)',
        'token-10': 'var(--space-10)',
      },
    },
  },
  plugins: [],
};

export default config;
