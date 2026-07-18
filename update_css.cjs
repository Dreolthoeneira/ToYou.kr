const fs = require('fs');
let css = fs.readFileSync('c:/shopsite/src/styles.css', 'utf8');

// 1. Update :root variables
const newRoot = `:root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color-scheme: light;
  
  --surface: rgba(255, 255, 255, 0.72);
  --surface-strong: rgba(255, 255, 255, 0.95);
  --stroke: rgba(0, 0, 0, 0.08);
  --text-soft: #86868b;
  --text-strong: #1d1d1f;
  --accent: #0071e3;
  --accent-deep: #0077ed;
  --sky: #2997ff;
  --shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
  --bg-gradient: #f5f5f7;
    
  --glass-header: rgba(255, 255, 255, 0.72);
  --glass-badge: rgba(255, 255, 255, 0.5);
  --glass-card: rgba(255, 255, 255, 0.6);
  --glass-button: rgba(255, 255, 255, 0.8);
  --bg-input: #ffffff;
  --bg-button-ghost: transparent;
  --border-ghost: rgba(0, 0, 0, 0.08);
  --brand-mark-bg: #1d1d1f;
  --btn-primary-bg: #0071e3;
  --ambient-pink: transparent;
  --ambient-blue: transparent;
  --surface-alt: #f5f5f7;
  --surface-command: #ffffff;
  --stroke-command: none;
  --focus-ring: rgba(0, 113, 227, 0.3);
  --badge-soft-bg: rgba(0, 113, 227, 0.1);
  --badge-soft-text: #0071e3;
  --chip-bg: rgba(0, 113, 227, 0.1);
  --preview-bg: #f5f5f7;
  --origin-bg: #f5f5f7;
  --product-hover: 0 8px 24px rgba(0, 0, 0, 0.08);
  --footer-bg: #f5f5f7;
}`;
css = css.replace(/:root \{[\s\S]*?\}/, newRoot);

// 2. Update dark mode variables
const newDark = `[data-theme='dark'] {
  color-scheme: dark;
  --surface: rgba(28, 28, 30, 0.72);
  --surface-strong: rgba(28, 28, 30, 0.95);
  --stroke: rgba(255, 255, 255, 0.1);
  --text-soft: #86868b;
  --text-strong: #f5f5f7;
  --accent: #0071e3;
  --accent-deep: #0077ed;
  --sky: #2997ff;
  --shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  --bg-gradient: #000000;
    
  --glass-header: rgba(28, 28, 30, 0.72);
  --glass-badge: rgba(255, 255, 255, 0.1);
  --glass-card: rgba(28, 28, 30, 0.6);
  --glass-button: rgba(255, 255, 255, 0.1);
  --bg-input: #1c1c1e;
  --bg-button-ghost: transparent;
  --border-ghost: rgba(255, 255, 255, 0.1);
  --brand-mark-bg: #f5f5f7;
  --btn-primary-bg: #0071e3;
  --ambient-pink: transparent;
  --ambient-blue: transparent;
  --surface-alt: #1c1c1e;
  --surface-command: #1c1c1e;
  --stroke-command: none;
  --focus-ring: rgba(0, 113, 227, 0.3);
  --badge-soft-bg: rgba(0, 113, 227, 0.15);
  --badge-soft-text: #2997ff;
  --chip-bg: rgba(0, 113, 227, 0.15);
  --preview-bg: #000000;
  --origin-bg: #000000;
  --product-hover: 0 8px 24px rgba(0, 0, 0, 0.4);
  --footer-bg: #000000;
}`;
css = css.replace(/\[data-theme='dark'\] \{[\s\S]*?\}/, newDark);

// 3. Remove ambient gradients and adjust globals
css = css.replace(/body \{[\s\S]*?\}/, `body {
  margin: 0;
  min-width: 320px;
  color: var(--text-strong);
  background: var(--bg-gradient);
  line-height: 1.5;
  letter-spacing: -0.01em;
  font-size: 15px;
}`);

// Smaller paddings and radii
css = css.replace(/border-radius: 42px;/g, 'border-radius: 24px;');
css = css.replace(/border-radius: 34px;/g, 'border-radius: 20px;');
css = css.replace(/border-radius: 30px;/g, 'border-radius: 18px;');
css = css.replace(/border-radius: 26px;/g, 'border-radius: 16px;');
css = css.replace(/border-radius: 24px;/g, 'border-radius: 16px;');

css = css.replace(/padding: 52px;/g, 'padding: 32px;');
css = css.replace(/padding: 34px;/g, 'padding: 24px;');
css = css.replace(/padding: 28px;/g, 'padding: 20px;');
css = css.replace(/padding: 26px;/g, 'padding: 20px;');

// Glassmorphism blurs
css = css.replace(/backdrop-filter: blur\(24px\);/g, 'backdrop-filter: blur(16px);');
css = css.replace(/backdrop-filter: blur\(16px\);/g, 'backdrop-filter: blur(12px);');

// Typography changes (smaller base size logic already in body)
css = css.replace(/font-size: clamp\(2\.5rem, 4\.5vw, 5rem\);/g, 'font-size: clamp(2rem, 4vw, 4rem);');
css = css.replace(/font-size: clamp\(2rem, 3\.4vw, 3rem\);/g, 'font-size: clamp(1.8rem, 3vw, 2.6rem);');
css = css.replace(/font-size: clamp\(2\.3rem, 4vw, 4rem\);/g, 'font-size: clamp(2rem, 3.5vw, 3.4rem);');

fs.writeFileSync('c:/shopsite/src/styles.css', css);
