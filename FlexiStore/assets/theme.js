/* ============================================
   FlexiStore – Theme JavaScript
   ============================================ */

(function () {
  'use strict';

  /* ---- Utility Helpers ---- */

  function fetchConfig(type = 'json') {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': `application/${type}`
      }
    };
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const value = (cents / 100).toFixed(2);
    return (format || '${{amount}}').replace('{{amount}}', value)
      .replace('{{amount_no_decimals}}', Math.round(cents / 100))
      .replace('{{amount_with_comma_separator}}', value.replace('.', ','));
  }

  /* ---- Cart API ---- */

  const CartAPI = {
    get() {
      return fetch('/cart.js').then(r => r.json());
    },

    add(items) {
      return fetch('/cart/add.js', {
        ...fetchConfig(),
        body: JSON.stringify({ items })
      }).then(r => r.json());
    },

    change(line, quantity) {
      return fetch('/cart/change.js', {
        ...fetchConfig(),
        body: JSON.stringify({ line, quantity })
      }).then(r => r.json());
    },

    update(updates) {
      return fetch('/cart/update.js', {
        ...fetchConfig(),
        body: JSON.stringify({ updates })
      }).then(r => r.json());
    },

    updateNote(note) {
      return fetch('/cart/update.js', {
        ...fetchConfig(),
        body: JSON.stringify({ note })
      }).then(r => r.json());
    }
  };

  /* ---- Cart Count Badge ---- */

  function updateCartCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? '' : 'none';
    });
  }

  function refreshCart() {
    CartAPI.get().then(cart => {
      updateCartCount(cart.item_count);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
    });
  }

  /* ---- Mobile Nav ---- */

  function initMobileNav() {
    const toggle = document.querySelector('[data-mobile-nav-toggle]');
    const nav = document.querySelector('[data-mobile-nav]');
    if (!toggle || !nav) return;

    const overlay = nav.querySelector('.mobile-nav__overlay');
    const close = nav.querySelector('[data-mobile-nav-close]');

    function open() {
      nav.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeNav() {
      nav.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', open);
    if (overlay) overlay.addEventListener('click', closeNav);
    if (close) close.addEventListener('click', closeNav);

    // Submenu toggles
    nav.querySelectorAll('[data-mobile-submenu-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.nextElementSibling;
        if (target) target.classList.toggle('is-open');
        btn.classList.toggle('is-open');
      });
    });
  }

  /* ---- Cart Drawer ---- */

  function initCartDrawer() {
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;

    const overlay = drawer.querySelector('.cart-drawer__overlay');
    const close = drawer.querySelector('[data-cart-drawer-close]');

    function openDrawer() {
      drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    // Open via cart icon clicks
    document.querySelectorAll('[data-cart-drawer-toggle]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
      });
    });

    if (overlay) overlay.addEventListener('click', closeDrawer);
    if (close) close.addEventListener('click', closeDrawer);

    // Listen for cart updates to refresh drawer content
    document.addEventListener('cart:updated', () => {
      refreshCartDrawer();
    });

    // Handle quantity changes inside drawer
    drawer.addEventListener('click', (e) => {
      const minus = e.target.closest('[data-drawer-qty-minus]');
      const plus = e.target.closest('[data-drawer-qty-plus]');
      const remove = e.target.closest('[data-drawer-remove]');

      if (minus) {
        const line = parseInt(minus.dataset.drawerQtyMinus);
        const input = minus.parentElement.querySelector('input');
        const qty = Math.max(0, parseInt(input.value) - 1);
        CartAPI.change(line, qty).then(cart => {
          updateCartCount(cart.item_count);
          refreshCartDrawer();
        });
      }

      if (plus) {
        const line = parseInt(plus.dataset.drawerQtyPlus);
        const input = plus.parentElement.querySelector('input');
        const qty = parseInt(input.value) + 1;
        CartAPI.change(line, qty).then(cart => {
          updateCartCount(cart.item_count);
          refreshCartDrawer();
        });
      }

      if (remove) {
        const line = parseInt(remove.dataset.drawerRemove);
        CartAPI.change(line, 0).then(cart => {
          updateCartCount(cart.item_count);
          refreshCartDrawer();
        });
      }
    });

    // Open drawer after add to cart
    document.addEventListener('cart:item-added', () => {
      refreshCart();
      openDrawer();
    });
  }

  function refreshCartDrawer() {
    const container = document.querySelector('[data-cart-drawer-items]');
    if (!container) return;

    CartAPI.get().then(cart => {
      const subtotalEl = document.querySelector('[data-cart-drawer-subtotal]');
      if (subtotalEl) {
        subtotalEl.textContent = formatMoney(cart.total_price, window.Shopify?.money_format);
      }

      if (cart.items.length === 0) {
        container.innerHTML = '<div class="cart-drawer__empty"><p>Your cart is empty</p></div>';
        return;
      }

      container.innerHTML = cart.items.map((item, i) => `
        <div class="cart-drawer__item">
          <div class="cart-drawer__item-media">
            <a href="${item.url}">
              <img src="${getSizedImageUrl(item.image, '160x')}" alt="${escape(item.title)}" loading="lazy" width="72" height="72">
            </a>
          </div>
          <div class="cart-drawer__item-info">
            <a href="${item.url}" class="cart-drawer__item-title">${escape(item.product_title)}</a>
            ${item.variant_title ? `<span class="cart-drawer__item-variant">${escape(item.variant_title)}</span>` : ''}
            <span class="cart-drawer__item-price">${formatMoney(item.final_line_price, window.Shopify?.money_format)}</span>
            <div class="cart-drawer__item-actions">
              <div class="product__quantity">
                <button class="product__quantity-btn" data-drawer-qty-minus="${i + 1}" aria-label="Decrease quantity">-</button>
                <input type="number" class="product__quantity-input" value="${item.quantity}" min="0" readonly>
                <button class="product__quantity-btn" data-drawer-qty-plus="${i + 1}" aria-label="Increase quantity">+</button>
              </div>
              <button class="cart__item-remove" data-drawer-remove="${i + 1}">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    });
  }

  function getSizedImageUrl(url, size) {
    if (!url) return '';
    if (url.indexOf('_' + size) !== -1) return url;
    const match = url.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif|webp)(\?v=\d+)?$/i);
    if (match) {
      const prefix = url.split(match[0]);
      return prefix[0] + '_' + size + match[0];
    }
    return url;
  }

  function escape(str) {
    const el = document.createElement('div');
    el.textContent = str;
    return el.innerHTML;
  }

  /* ---- Product Page ---- */

  function initProductPage() {
    const form = document.querySelector('[data-product-form]');
    if (!form) return;

    const productJson = document.querySelector('[data-product-json]');
    if (!productJson) return;

    let product;
    try {
      product = JSON.parse(productJson.textContent);
    } catch (e) {
      return;
    }

    // Variant selection — search the whole product section, not just inside the form
    const productSection = form.closest('.product') || form.closest('.section') || document;
    const variantOptions = productSection.querySelectorAll('[data-variant-option]');
    const variantIdInput = form.querySelector('[name="id"]');

    function getSelectedOptions() {
      const options = [];
      productSection.querySelectorAll('[data-option-group]').forEach(group => {
        const selected = group.querySelector('.is-selected') || group.querySelector('[data-variant-option]');
        if (selected) options.push(selected.dataset.variantOption);
      });
      return options;
    }

    function findVariant(options) {
      return product.variants.find(v =>
        v.options.every((opt, i) => opt === options[i])
      );
    }

    function updateVariantUI(variant) {
      if (!variant) return;

      // Update hidden input
      if (variantIdInput) variantIdInput.value = variant.id;

      // Update price
      const priceEl = document.querySelector('[data-product-price]');
      const comparePriceEl = document.querySelector('[data-product-compare-price]');
      const badgeEl = document.querySelector('[data-product-price-badge]');

      if (priceEl) priceEl.textContent = formatMoney(variant.price, window.Shopify?.money_format);
      if (comparePriceEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          comparePriceEl.textContent = formatMoney(variant.compare_at_price, window.Shopify?.money_format);
          comparePriceEl.style.display = '';
          if (badgeEl) {
            const discount = Math.round((1 - variant.price / variant.compare_at_price) * 100);
            badgeEl.textContent = `-${discount}%`;
            badgeEl.style.display = '';
          }
        } else {
          comparePriceEl.style.display = 'none';
          if (badgeEl) badgeEl.style.display = 'none';
        }
      }

      // Update add-to-cart button
      const addBtn = form.querySelector('[data-add-to-cart]');
      const addBtnText = form.querySelector('[data-add-to-cart-text]');
      if (addBtn && addBtnText) {
        if (variant.available) {
          addBtn.disabled = false;
          addBtnText.textContent = 'Add to cart';
        } else {
          addBtn.disabled = true;
          addBtnText.textContent = 'Sold out';
        }
      }

      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);

      // Update gallery image
      if (variant.featured_image) {
        const mainImage = document.querySelector('[data-product-main-image]');
        if (mainImage) {
          mainImage.src = variant.featured_image.src;
          mainImage.alt = variant.featured_image.alt || product.title;
        }
      }
    }

    variantOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Toggle selected state within group
        const group = option.closest('[data-option-group]');
        group.querySelectorAll('[data-variant-option]').forEach(o => o.classList.remove('is-selected'));
        option.classList.add('is-selected');

        const selectedOptions = getSelectedOptions();
        const variant = findVariant(selectedOptions);
        if (variant) updateVariantUI(variant);
      });
    });

    // Gallery thumbnails
    document.querySelectorAll('[data-gallery-thumb]').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const mainImage = document.querySelector('[data-product-main-image]');
        if (mainImage) {
          mainImage.src = thumb.dataset.galleryThumb;
          mainImage.alt = thumb.querySelector('img')?.alt || '';
        }
        document.querySelectorAll('[data-gallery-thumb]').forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
    });

    // Quantity controls — search the product section, not just the form
    const qtyMinus = productSection.querySelector('[data-qty-minus]');
    const qtyPlus = productSection.querySelector('[data-qty-plus]');
    const qtyInput = productSection.querySelector('[data-qty-input]');

    if (qtyMinus && qtyPlus && qtyInput) {
      qtyMinus.addEventListener('click', () => {
        const val = Math.max(1, parseInt(qtyInput.value) - 1);
        qtyInput.value = val;
      });
      qtyPlus.addEventListener('click', () => {
        qtyInput.value = parseInt(qtyInput.value) + 1;
      });
    }

    // Add to cart form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const addBtn = form.querySelector('[data-add-to-cart]');
      const addBtnText = form.querySelector('[data-add-to-cart-text]');
      if (addBtn) addBtn.disabled = true;
      if (addBtnText) addBtnText.textContent = 'Adding...';

      const formData = new FormData(form);
      const qty = qtyInput ? parseInt(qtyInput.value) : 1;
      const items = [{
        id: parseInt(formData.get('id')),
        quantity: qty || 1
      }];

      CartAPI.add(items).then(() => {
        if (addBtn) addBtn.disabled = false;
        if (addBtnText) addBtnText.textContent = 'Added!';
        setTimeout(() => {
          if (addBtnText) addBtnText.textContent = 'Add to cart';
        }, 1500);
        document.dispatchEvent(new CustomEvent('cart:item-added'));
      }).catch(() => {
        if (addBtn) addBtn.disabled = false;
        if (addBtnText) addBtnText.textContent = 'Add to cart';
      });
    });
  }

  /* ---- Quick Add (Collection Cards) ---- */

  function initQuickAdd() {
    document.querySelectorAll('[data-quick-add]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const variantId = btn.dataset.quickAdd;
        if (!variantId) return;

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Adding...';

        CartAPI.add([{ id: parseInt(variantId), quantity: 1 }]).then(() => {
          btn.textContent = 'Added!';
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = originalText;
          }, 1500);
          document.dispatchEvent(new CustomEvent('cart:item-added'));
        }).catch(() => {
          btn.disabled = false;
          btn.textContent = originalText;
        });
      });
    });
  }

  /* ---- FAQ Accordion ---- */

  function initFAQ() {
    document.querySelectorAll('[data-faq-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq__item');
        const answer = item.querySelector('.faq__answer');
        const isOpen = item.classList.contains('is-open');

        // Close all
        document.querySelectorAll('.faq__item.is-open').forEach(openItem => {
          openItem.classList.remove('is-open');
          openItem.querySelector('.faq__answer').style.maxHeight = null;
        });

        // Toggle current
        if (!isOpen) {
          item.classList.add('is-open');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
  }

  /* ---- Product Slider ---- */

  function initProductSliders() {
    document.querySelectorAll('[data-product-slider]').forEach(slider => {
      const track = slider.querySelector('[data-slider-track]');
      const prevBtn = slider.querySelector('[data-slider-prev]');
      const nextBtn = slider.querySelector('[data-slider-next]');
      if (!track) return;

      const scrollAmount = track.firstElementChild
        ? track.firstElementChild.offsetWidth + parseInt(getComputedStyle(track).gap)
        : 300;

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
      }
    });
  }

  /* ---- Cart Page ---- */

  function initCartPage() {
    const cartForm = document.querySelector('[data-cart-form]');
    if (!cartForm) return;

    // Quantity changes
    cartForm.querySelectorAll('[data-cart-qty-minus], [data-cart-qty-plus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const line = parseInt(btn.dataset.cartQtyMinus || btn.dataset.cartQtyPlus);
        const input = btn.parentElement.querySelector('input');
        let qty = parseInt(input.value);

        if (btn.dataset.cartQtyMinus !== undefined) {
          qty = Math.max(0, qty - 1);
        } else {
          qty += 1;
        }

        input.value = qty;
        CartAPI.change(line, qty).then(() => {
          window.location.reload();
        });
      });
    });

    // Remove items
    cartForm.querySelectorAll('[data-cart-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const line = parseInt(btn.dataset.cartRemove);
        CartAPI.change(line, 0).then(() => {
          window.location.reload();
        });
      });
    });

    // Cart note
    const noteField = cartForm.querySelector('[data-cart-note]');
    if (noteField) {
      noteField.addEventListener('change', debounce(() => {
        CartAPI.updateNote(noteField.value);
      }, 500));
    }
  }

  /* ---- Collection Page Sorting ---- */

  function initCollectionSort() {
    const sortSelect = document.querySelector('[data-collection-sort]');
    if (!sortSelect) return;

    sortSelect.addEventListener('change', () => {
      const url = new URL(window.location);
      url.searchParams.set('sort_by', sortSelect.value);
      window.location = url.toString();
    });
  }

  /* ---- Sticky Header ---- */

  function initStickyHeader() {
    const header = document.querySelector('.header-wrapper--sticky');
    if (!header) return;

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const current = window.scrollY;
      if (current > 100) {
        header.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
      } else {
        header.style.boxShadow = '';
      }
      lastScroll = current;
    }, { passive: true });
  }

  /* ---- Init Everything ---- */

  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initCartDrawer();
    initProductPage();
    initQuickAdd();
    initFAQ();
    initProductSliders();
    initCartPage();
    initCollectionSort();
    initStickyHeader();
    refreshCart();
  });

})();
