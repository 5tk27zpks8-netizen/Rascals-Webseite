class RascalsTheme {
  constructor() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.initReveal();
    this.initCursor();
    this.initTilt();
    this.initQuantity();
    this.initVariants();
    this.initQuickAdd();
    this.initRecommendations();
  }

  initReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (this.reducedMotion || document.body.classList.contains('motion-disabled')) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
      observer.observe(element);
    });
  }

  initCursor() {
    if (this.reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const cursor = document.querySelector('.football-cursor');
    if (!cursor) return;
    window.addEventListener('pointermove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    }, { passive: true });
  }

  initTilt() {
    if (this.reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('[data-tilt-card]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        const rotateX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -4;
        const rotateY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 4;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  initQuantity() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quantity-minus], [data-quantity-plus]');
      if (!button) return;
      const input = button.parentElement.querySelector('input[type="number"]');
      if (!input) return;
      const change = button.hasAttribute('data-quantity-plus') ? 1 : -1;
      input.value = Math.max(Number(input.min || 1), Number(input.value || 1) + change);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  initVariants() {
    document.querySelectorAll('variant-selects').forEach((picker) => {
      const variantsNode = picker.querySelector('script[type="application/json"]');
      if (!variantsNode) return;
      const variants = JSON.parse(variantsNode.textContent);
      const root = picker.closest('[data-product-root]');
      const formId = root?.querySelector('.product-form')?.id;
      const idInput = formId ? document.querySelector(`#${CSS.escape(formId)} [data-variant-id]`) : null;
      const addButton = formId ? document.querySelector(`#${CSS.escape(formId)} [data-add-to-cart]`) : null;

      picker.addEventListener('change', () => {
        const selectedOptions = [...picker.querySelectorAll('select')].map((select) => select.value);
        const variant = variants.find((candidate) => candidate.options.every((option, index) => option === selectedOptions[index]));
        if (!variant || !idInput || !addButton) return;
        idInput.value = variant.id;
        addButton.disabled = !variant.available;
        addButton.querySelector('span').textContent = variant.available ? 'In den Warenkorb' : 'Ausverkauft';
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url);
      });
    });
  }

  initQuickAdd() {
    document.querySelectorAll('form.quick-add').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = form.querySelector('button');
        if (!button || button.disabled) return;
        button.disabled = true;
        const original = button.textContent;
        button.textContent = '…';
        try {
          const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: new FormData(form)
          });
          if (!response.ok) throw new Error('Cart request failed');
          const cartResponse = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`);
          const cart = await cartResponse.json();
          document.querySelectorAll('[data-cart-count]').forEach((count) => { count.textContent = cart.item_count; });
          button.textContent = '✓';
          setTimeout(() => { button.textContent = original; button.disabled = false; }, 1200);
        } catch (error) {
          button.textContent = '!';
          setTimeout(() => { button.textContent = original; button.disabled = false; }, 1600);
        }
      });
    });
  }

  initRecommendations() {
    document.querySelectorAll('product-recommendations').forEach(async (element) => {
      if (!element.dataset.url || element.innerHTML.trim()) return;
      try {
        const response = await fetch(element.dataset.url);
        const html = document.createElement('div');
        html.innerHTML = await response.text();
        const recommendations = html.querySelector('product-recommendations');
        if (recommendations?.innerHTML.trim()) element.innerHTML = recommendations.innerHTML;
      } catch (error) {
        element.remove();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => new RascalsTheme());
