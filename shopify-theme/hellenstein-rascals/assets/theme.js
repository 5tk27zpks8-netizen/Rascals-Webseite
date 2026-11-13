document.documentElement.classList.remove('no-js');

const menuButton = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');

if (menuButton && menu) {
  const closeMenu = () => {
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Menü öffnen');
    document.body.classList.remove('menu-open');
  };

  menuButton.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    document.body.classList.toggle('menu-open', open);
  });

  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

document.querySelectorAll('[data-hero]').forEach((hero) => {
  const slides = [...hero.querySelectorAll('[data-hero-slide]')];
  const controls = [...hero.querySelectorAll('[data-hero-control]')];
  if (slides.length < 2) return;

  let active = 0;
  let timer;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interval = Number(hero.dataset.interval) || 7000;

  const show = (index) => {
    active = index;
    slides.forEach((slide, slideIndex) => {
      const selected = slideIndex === active;
      slide.hidden = !selected;
      slide.classList.toggle('is-active', selected);
    });
    controls.forEach((control, controlIndex) => {
      control.classList.toggle('is-active', controlIndex === active);
      control.setAttribute('aria-pressed', String(controlIndex === active));
    });
  };

  const stop = () => window.clearInterval(timer);
  const start = () => {
    if (reducedMotion) return;
    stop();
    timer = window.setInterval(() => show((active + 1) % slides.length), interval);
  };

  controls.forEach((control, index) => control.addEventListener('click', () => {
    show(index);
    start();
  }));
  hero.addEventListener('mouseenter', stop);
  hero.addEventListener('mouseleave', start);
  hero.addEventListener('focusin', stop);
  hero.addEventListener('focusout', start);
  show(0);
  start();
});

/* Football als Mauszeiger. Folgt dem Zeiger ueber eine Animationsbild-Schleife
   statt direkt im pointermove: der Browser feuert das Ereignis oefter als er
   zeichnet, und jedes Setzen von style.left erzwingt sonst ein Layout. Nur bei
   echter Maus, nicht auf Touch, und nicht bei reduzierter Bewegung. */
(() => {
  const ball = document.querySelector('.football-cursor');
  if (!ball) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let x = 0, y = 0, pending = false, shown = false;

  const draw = () => {
    pending = false;
    ball.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(-20deg)`;
    if (!shown) { ball.classList.add('is-visible'); shown = true; }
  };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    x = event.clientX; y = event.clientY;
    if (!pending) { pending = true; requestAnimationFrame(draw); }
  }, { passive: true });

  document.addEventListener('mouseleave', () => { ball.classList.remove('is-visible'); shown = false; });
})();
