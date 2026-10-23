class RascalsTheme {
  constructor() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.initReveal();
    this.initCursor();
    this.initTilt();
    this.initQuantity();
    this.initVariants();
    this.initPersonalisation();
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

  /**
   * Which variant is selected, and what it costs.
   *
   * The options are no longer all in one place. The print option is lifted
   * out of the picker and presented as the personalisation block, so the
   * value of each option is read from whatever carries [data-option-index]
   * anywhere inside the product — select, hidden input, it does not matter —
   * and put back in option order. Reading the picker's own selects would
   * miss the print option and resolve to the wrong variant, which is to say
   * the wrong price.
   *
   * The price is updated here too. It used to stay where it started while
   * everything else moved, which nobody noticed while variants differed only
   * by size.
   */
  initVariants() {
    document.querySelectorAll('[data-product-root]').forEach((root) => {
      const picker = root.querySelector('variant-selects');
      const variantsNode = picker?.querySelector('script[type="application/json"]');
      if (!variantsNode) return;

      let variants;
      try {
        variants = JSON.parse(variantsNode.textContent);
      } catch (error) {
        return;
      }

      const form = root.querySelector('.product-form');
      const idInput = form?.querySelector('[data-variant-id]');
      const addButton = form?.querySelector('[data-add-to-cart]');
      if (!idInput || !addButton) return;

      const priceNode = root.querySelector('[data-price] strong');
      let prices = {};
      const pricesNode = root.querySelector('[data-variant-prices]');
      if (pricesNode) {
        try {
          prices = JSON.parse(pricesNode.textContent);
        } catch (error) {
          prices = {};
        }
      }

      const resolve = () => {
        const chosen = [...root.querySelectorAll('[data-option-index]')]
          .sort((a, b) => Number(a.dataset.optionIndex) - Number(b.dataset.optionIndex))
          .map((node) => node.value);
        const variant = variants.find((candidate) => candidate.options.every((option, index) => option === chosen[index]));
        if (!variant) return;

        idInput.value = variant.id;
        addButton.disabled = !variant.available;
        const label = addButton.querySelector('span');
        if (label) label.textContent = variant.available ? 'In den Warenkorb' : 'Ausverkauft';
        if (priceNode && prices[variant.id]) priceNode.textContent = prices[variant.id];

        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url);
      };

      root.addEventListener('change', resolve);
      // The print option starts at "off" whatever the URL asked for, so the
      // figure on the page and the unticked radio below it agree on arrival.
      resolve();
    });
  }

  /**
   * Nummer, Initialen oder Position auf das Trikot.
   *
   * The radios do two separate things and only one of them is visible. They
   * show the right field, and they set the hidden print option — which is a
   * real variant option, so choosing a personalisation is what makes the
   * line four euro dearer. What gets printed travels separately as line item
   * properties, because properties never change a price and variants never
   * carry free text; it takes both.
   *
   * Everything not in use is disabled rather than hidden, so an abandoned
   * half-filled field cannot reach the order.
   */
  initPersonalisation() {
    document.querySelectorAll('[data-personalise]').forEach((block) => {
      const root = block.closest('[data-product-root]');
      const form = root?.querySelector('.product-form');
      const option = block.querySelector('[data-personalise-option]');
      const fields = block.querySelector('[data-personalise-fields]');
      const placement = block.querySelector('[data-personalise-placement]');
      const preview = block.querySelector('[data-personalise-preview]');
      const error = block.querySelector('[data-personalise-error]');
      if (!option || !fields) return;

      const props = {};
      block.querySelectorAll('[data-personalise-prop]').forEach((node) => { props[node.dataset.personaliseProp] = node; });
      const labels = { number: 'Nummer', initials: 'Initialen', position: 'Position' };

      const chosenKind = () => block.querySelector('[data-personalise-kind]:checked')?.value || 'off';
      const fieldFor = (kind) => block.querySelector(`[data-personalise-field="${kind}"]`);
      const valueFor = (kind) => fieldFor(kind)?.querySelector('[data-personalise-value]') ?? null;

      const clean = (kind, raw) => {
        const value = (raw || '').trim();
        if (kind === 'number') return value.replace(/[^0-9]/g, '').slice(0, 2);
        if (kind === 'initials') return value.toUpperCase().replace(/[^A-ZÄÖÜ.\- ]/g, '').slice(0, 4).trim();
        return value;
      };

      const apply = () => {
        const kind = chosenKind();
        const on = kind !== 'off';

        const previous = option.value;
        option.value = on ? block.dataset.valueOn : block.dataset.valueOff;
        fields.hidden = !on;
        if (placement) {
          placement.disabled = !on;
          const placementField = fieldFor('placement');
          if (placementField) placementField.hidden = !on;
        }

        ['number', 'initials', 'position'].forEach((candidate) => {
          const field = fieldFor(candidate);
          const input = valueFor(candidate);
          if (field) field.hidden = candidate !== kind;
          if (input) input.disabled = candidate !== kind;
        });

        const input = valueFor(kind);
        const value = on ? clean(kind, input?.value) : '';
        if (input && input.tagName === 'INPUT' && input.value !== value) input.value = value;

        Object.values(props).forEach((node) => { node.disabled = !on || !value; });
        if (on && value) {
          props.kind.value = labels[kind] || kind;
          props.value.value = value;
          if (props.placement) props.placement.value = placement?.value || '';
        }

        if (preview) {
          preview.textContent = on && value
            ? `Aufdruck: ${value}${placement?.value ? ` · ${placement.value}` : ''}`
            : '';
        }
        if (error && (!on || value)) error.hidden = true;

        // Tell the variant resolver, but not ourselves. Firing this on the
        // option fed the event straight back into the listener that called
        // apply — the block is above it — and the page recursed until the
        // stack gave out. The resolver listens on the product root, which is
        // above the block, so dispatching there reaches it and nothing else.
        if (option.value !== previous) root?.dispatchEvent(new Event('change', { bubbles: true }));
      };

      block.addEventListener('change', apply);
      block.addEventListener('input', apply);

      // Nothing half-filled gets past the button: an empty field with a
      // personalisation chosen is a shirt printed with nothing on it.
      form?.addEventListener('submit', (event) => {
        const kind = chosenKind();
        if (kind === 'off') return;
        const value = clean(kind, valueFor(kind)?.value);
        if (value) return;
        event.preventDefault();
        if (error) {
          error.textContent = `Bitte ${labels[kind] || 'Angabe'} eintragen oder „Ohne“ wählen.`;
          error.hidden = false;
        }
        valueFor(kind)?.focus();
      });

      apply();
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
