const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://ebano-seven.vercel.app/api';

const currency = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cart = [];
const defaultConfig = { leadTime: 'Confirme o prazo antes de finalizar', minOrder: 0, deliveryFee: 0, pixKey: '', couponCode: '', couponPercent: 0, heroImage: '', contact1_name: 'Maria Eduarda', contact1_phone: '556492854186', contact2_name: 'Thiago', contact2_phone: '5564992527258' };
let config = { ...defaultConfig };
let flavors = [];
let products = [];
let quantities = {};

const flavorGrid = document.querySelector('#flavor-grid');
const unitPicker = document.querySelector('#unit-picker');
const cartPanel = document.querySelector('#cart-panel');
const overlay = document.querySelector('#overlay');
const unitDialog = document.querySelector('#unit-dialog');
const checkoutDialog = document.querySelector('#checkout-dialog');

// Inicialização Principal
async function initStore() {
  try {
    // 1. Carregar Configurações do Backend
    const configRes = await fetch(`${API_URL}/settings`);
    const configData = await configRes.json();
    config = { ...defaultConfig, ...configData };
    document.querySelector('#notice-lead-time').textContent = config.leadTime;

    if (config.heroImage) {
      const hero = document.querySelector('.hero-visual');
      hero.style.backgroundImage = `linear-gradient(#0b090799,#0b090799), url("${config.heroImage}")`;
      hero.style.backgroundSize = 'cover';
      hero.style.backgroundPosition = 'center';
    }

    // Preencher atendentes dinamicamente
    const contactSelect = document.querySelector('#contact-select');
    const contacts = [];
    if (config.contact1_name && config.contact1_phone) {
      contacts.push(`<option value="${config.contact1_phone}">${config.contact1_name}</option>`);
    }
    if (config.contact2_name && config.contact2_phone) {
      contacts.push(`<option value="${config.contact2_phone}">${config.contact2_name}</option>`);
    }
    contactSelect.innerHTML = contacts.join('') || '<option value="556492854186">Maria Eduarda</option>';

    // 2. Carregar Sabores do Backend
    const flavorsRes = await fetch(`${API_URL}/flavors?active=true`);
    const flavorsData = await flavorsRes.json();
    flavors = flavorsData.map(f => f.name);
    quantities = Object.fromEntries(flavors.map(flavor => [flavor, 0]));

    // Renderizar Sabores (com foto se houver)
    flavorGrid.innerHTML = flavorsData.map((flavorObj, index) => {
      const bgStyle = flavorObj.image_url ? `style="background-image: linear-gradient(#0b0907aa,#0b0907aa), url('${flavorObj.image_url}'); background-size: cover; background-position: center;"` : '';
      return `<article class="flavor" ${bgStyle}><span class="flavor-number">${String(index + 1).padStart(2, '0')}</span><h3>${flavorObj.name.replace('Brigadeiro ', 'Brigadeiro<br>')}</h3></article>`;
    }).join('');

    // Renderizar Seletor de Unidades (com miniaturas se houver)
    unitPicker.innerHTML = flavorsData.map(flavorObj => {
      const imgHtml = flavorObj.image_url ? `<img src="${flavorObj.image_url}" alt="${flavorObj.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--gold);">` : '';
      return `<div class="unit-row"><div style="display: flex; align-items: center; gap: 10px;">${imgHtml}<span>${flavorObj.name}</span></div><div class="stepper"><button data-flavor="${flavorObj.name}" data-change="-1" type="button" aria-label="Remover ${flavorObj.name}">−</button><input class="qty-input" id="qty-${flavors.indexOf(flavorObj.name)}" data-flavor="${flavorObj.name}" type="number" min="0" value="0" inputmode="numeric" aria-label="Quantidade de ${flavorObj.name}"><button data-flavor="${flavorObj.name}" data-change="1" type="button" aria-label="Adicionar ${flavorObj.name}">+</button></div></div>`;
    }).join('');

    // 3. Carregar Produtos do Backend
    const productsRes = await fetch(`${API_URL}/products?active=true`);
    const productsData = await productsRes.json();
    products = productsData;

    // Atualizar texto do diálogo de unidades conforme preços do banco
    const unitDialogText = document.querySelector('#unit-dialog p');
    if (unitDialogText) {
      unitDialogText.textContent = `Unidades avulsas custam R$ ${getUnitPrice().toFixed(2).replace('.', ',')}. A cada grupo completo de 4 brigadeiros, o valor é R$ ${getBox4Price().toFixed(2).replace('.', ',')}. Escolha um de cada sabor para formar a caixa degustação por R$ ${getTastingPrice().toFixed(2).replace('.', ',')}.`;
    }

    // Renderizar Cards de Produto
    const productGrid = document.querySelector('#product-grid');
    productGrid.innerHTML = products.map(product => {
      const isFeatured = product.product_type === 'unit';
      const label = product.product_type === 'unit' ? 'MONTE DO SEU JEITO' : 
                    product.product_type === 'box' ? (product.quantity === 4 ? 'PRESENTE' : 'DEGUSTAÇÃO') : 'FESTAS E EVENTOS';
      const icon = product.product_type === 'unit' ? '✦' : 
                   product.product_type === 'box' ? (product.quantity === 4 ? '□' : '◇') : '♢';
                   
      const priceVal = Number(product.base_price);
      const priceDisplay = isFeatured ? 
        `R$ ${priceVal.toFixed(2).replace('.', ',')} <small>cada grupo de 4 sai por R$ ${getBox4Price().toFixed(2).replace('.', ',')}</small>` : 
        (product.product_type === 'event' ? 
          `A partir de R$ ${priceVal.toFixed(2).replace('.', ',')}` :
          `R$ ${priceVal.toFixed(2).replace('.', ',')}`
        );
        
      const buttonHtml = isFeatured ? 
        `<button class="button add-units" type="button">Escolher unidades</button>` : 
        (product.product_type === 'event' ? 
          `<button class="outline-button quote-button" type="button">Pedir orçamento</button>` :
          `<button class="outline-button add-pack" data-product="${product.name}" data-price="${product.base_price}" type="button">Adicionar à sacola</button>`
        );

      return `
        <article class="product-card ${isFeatured ? 'featured' : ''}">
          <span class="product-icon">${icon}</span>
          <p class="card-label">${label}</p>
          <h3>${product.name}</h3>
          <p>${product.description || ''}</p>
          <strong>${priceDisplay}</strong>
          ${buttonHtml}
        </article>
      `;
    }).join('');

    setupEventListeners();
    renderCart();

  } catch (err) {
    console.error('Erro na inicialização da loja:', err);
  }
}

// Configuração de Event Listeners
function setupEventListeners() {
  // Sacola Abre/Fecha
  document.querySelector('#open-cart').onclick = () => toggleCart(true);
  document.querySelector('#close-cart').onclick = () => toggleCart(false);
  overlay.onclick = () => toggleCart(false);

  // Adicionar packs
  document.querySelectorAll('.add-pack').forEach(button => {
    button.onclick = () => addItem(button.dataset.product, Number(button.dataset.price));
  });

  // Abrir modal de unidades avulsas
  const addUnitsBtn = document.querySelector('.add-units');
  if (addUnitsBtn) {
    addUnitsBtn.onclick = () => unitDialog.showModal();
  }

  // Fechar dialogs
  document.querySelectorAll('.dialog-close').forEach(button => {
    button.onclick = () => button.closest('dialog').close();
  });

  // Botões de stepper (+/-) no seletor de unidades
  unitPicker.onclick = event => {
    const button = event.target.closest('button[data-flavor]');
    if (!button || button.dataset.pointerHandled === 'true') {
      if (button) delete button.dataset.pointerHandled;
      return;
    }
    changeQuantity(button);
  };

  unitPicker.onchange = event => {
    const input = event.target.closest('.qty-input');
    if (!input) return;
    quantities[input.dataset.flavor] = Math.max(0, Math.floor(Number(input.value) || 0));
    input.value = quantities[input.dataset.flavor];
    updateUnits();
  };

  document.querySelectorAll('.stepper button').forEach(button => {
    let repeatDelay, repeatInterval;
    const stopRepeating = () => { clearTimeout(repeatDelay); clearInterval(repeatInterval); };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.dataset.pointerHandled = 'true';
      changeQuantity(button);
      repeatDelay = setTimeout(() => {
        repeatInterval = setInterval(() => changeQuantity(button), 90);
      }, 350);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => button.addEventListener(type, stopRepeating));
  });

  // Botões de orçamento e negociação direta
  const quoteBtn = document.querySelector('.quote-button');
  if (quoteBtn) {
    quoteBtn.onclick = () => window.open(`https://wa.me/556492854186?text=${encodeURIComponent('Olá, gostaria de um orçamento para cento de brigadeiros.')}`, '_blank');
  }

  document.querySelector('#negotiate-large-order').onclick = () => {
    const total = Object.values(quantities).reduce((a, b) => a + b, 0);
    const selected = Object.entries(quantities).filter(([, q]) => q).map(([f, q]) => `${q}x ${f}`).join(', ');
    const message = `Olá, Maria! Gostaria de negociar um pedido de ${total} brigadeiros. Sabores: ${selected}.`;
    window.open(`https://wa.me/556492854186?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Confirmar unidades avulsas
  document.querySelector('#add-units-cart').onclick = () => {
    const selected = Object.entries(quantities).filter(([, q]) => q).map(([f, q]) => `${q}× ${f}`).join(', ');
    const count = Object.values(quantities).reduce((a, b) => a + b, 0);
    const tastingBox = isTastingBox();
    const tastingPrice = getTastingPrice();
    const totalPrice = tastingBox ? tastingPrice : unitSelectionPrice(count);

    addItem(
      tastingBox ? 'Caixa degustação montada (10 sabores)' : 'Brigadeiros avulsos',
      tastingBox ? tastingPrice : totalPrice / count,
      tastingBox ? 1 : count,
      `${selected}${tastingBox ? ' · Caixa degustação' : count >= 4 ? ' · Grupos de 4 com valor especial' : ''}`
    );

    // Reset seletor
    Object.keys(quantities).forEach(key => quantities[key] = 0);
    document.querySelectorAll('.qty-input').forEach(el => el.value = '0');
    updateUnits();
    unitDialog.close();
  };

  // Botões de compras diretas da loja
  const btnCaixa4 = document.querySelector('#btn-buy-caixa-4');
  if (btnCaixa4) {
    btnCaixa4.onclick = () => {
      unitDialog.showModal();
    };
  }

  const btnCaixaDeg = document.querySelector('#btn-buy-caixa-degustacao');
  if (btnCaixaDeg) {
    btnCaixaDeg.onclick = () => {
      addItem('Caixa Degustação (10 Sabores)', 25, 1, 'Coleção com 1 de cada sabor exclusivo da Ébano');
      cartPanel.classList.add('open');
      overlay.classList.add('open');
    };
  }

  // Sacola Checkout
  document.querySelector('#checkout').onclick = () => checkoutDialog.showModal();
  document.querySelector('#order-cta').onclick = () => {
    if (cart.length) checkoutDialog.showModal();
    else document.querySelector('#opcoes').scrollIntoView();
  };

  // Enviar Formulário de Pedido (Salva no BD e depois envia no WhatsApp)
  document.querySelector('#checkout-form').onsubmit = async event => {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const data = new FormData(event.target);
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const couponValid = config.couponCode && data.get('coupon').trim().toUpperCase() === config.couponCode;
      const discount = couponValid ? subtotal * (Number(config.couponPercent || 0) / 100) : 0;
      const fee = data.get('delivery') === 'delivery' ? Number(config.deliveryFee || 0) : 0;
      const total = subtotal - discount + fee;

      // Montar payload para salvar no banco de dados
      const orderPayload = {
        customer_name: data.get('name'),
        customer_phone: data.get('contact') === config.contact1_phone ? config.contact1_name : config.contact2_name,
        requested_date: data.get('date'),
        requested_time: data.get('time') || null,
        fulfillment_method: data.get('delivery'),
        delivery_address: data.get('delivery') === 'delivery' ? data.get('notes') : null,
        payment_method: data.get('payment'),
        gift_message: data.get('gift') || null,
        notes: data.get('notes') || null,
        coupon_code: couponValid ? config.couponCode : null,
        subtotal: subtotal,
        discount_amount: discount,
        delivery_fee: fee,
        total: total,
        items: cart.map(item => ({
          product_name: item.name,
          flavor_summary: item.detail || null,
          unit_price: item.price,
          quantity: item.quantity,
          line_total: item.price * item.quantity
        }))
      };

      // Gravar pedido via API do Backend
      const saveOrderRes = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const saveOrderData = await saveOrderRes.json();
      console.log('Pedido persistido com ID:', saveOrderData.order_id);

      // Gerar mensagem formatada e abrir o WhatsApp
      const itemsText = cart.map(item => `• ${item.quantity}× ${item.name} — ${currency(item.price * item.quantity)}${item.detail ? `\n  ${item.detail}` : ''}`).join('\n');
      const pix = data.get('payment') === 'Pix' && config.pixKey ? `\n*Chave Pix:* ${config.pixKey}` : '';
      const couponLine = couponValid ? `\n*Cupom:* ${config.couponCode} (-${currency(discount)})` : data.get('coupon') ? '\n*Cupom:* inválido ou não configurado' : '';
      const orderIdLine = saveOrderData.order_id ? `\n*Pedido N°:* #${saveOrderData.order_id}` : '';

      const message = `Olá! Quero fazer uma encomenda na Ébano.${orderIdLine}\n\n*Pedido:*\n${itemsText}\n\n*Subtotal:* ${currency(subtotal)}${couponLine}\n*Entrega:* ${fee ? currency(fee) : data.get('delivery') === 'delivery' ? 'a confirmar' : 'Retirada'}\n*Total:* ${currency(total)}\n*Nome:* ${data.get('name')}\n*Data e horário:* ${data.get('date')} ${data.get('time') || ''}\n*Pagamento:* ${data.get('payment')}\n*Mensagem para presente:* ${data.get('gift') || 'Nenhuma'}\n*Observações:* ${data.get('notes') || 'Nenhuma'}${pix}`;
      
      window.open(`https://wa.me/${data.get('contact')}?text=${encodeURIComponent(message)}`, '_blank');
      
      // Limpar sacola e fechar modal
      cart.length = 0;
      renderCart();
      checkoutDialog.close();
    } catch (err) {
      console.error('Erro ao processar pedido:', err);
      alert('Ocorreu um erro ao processar o seu pedido localmente. Tentando prosseguir pelo WhatsApp...');
    } finally {
      submitBtn.disabled = false;
    }
  };
}

// Helpers
function toggleCart(open) {
  cartPanel.classList.toggle('open', open);
  overlay.classList.toggle('open', open);
  cartPanel.setAttribute('aria-hidden', String(!open));
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#cart-total').textContent = currency(total);
  const minimum = Number(config.minOrder || 0);
  document.querySelector('#checkout').disabled = !cart.length || total < minimum;
  document.querySelector('#shipping-note').textContent = total < minimum ? `Pedido mínimo: ${currency(minimum)}.` : config.deliveryFee ? `Entrega fixa: ${currency(Number(config.deliveryFee))}.` : 'Taxa de entrega consultada no fechamento.';
  document.querySelector('#cart-items').innerHTML = cart.length ? cart.map((item, index) => `<div class="cart-item"><div><h3>${item.name}</h3><p>${item.detail || ''}</p><button class="remove" data-index="${index}">Remover</button></div><div><strong>${currency(item.price * item.quantity)}</strong><p>${item.quantity} ${item.quantity === 1 ? 'item' : 'itens'}</p></div></div>`).join('') : '<p class="empty">Sua sacola está vazia.<br>Que tal começar escolhendo seus sabores?</p>';
  
  document.querySelectorAll('.remove').forEach(button => {
    button.onclick = () => { cart.splice(Number(button.dataset.index), 1); renderCart(); };
  });
}

function addItem(name, price, quantity = 1, detail = '') {
  cart.push({ name, price, quantity, detail });
  renderCart();
  toggleCart(true);
}

function changeQuantity(button) {
  const flavor = button.dataset.flavor;
  quantities[flavor] = Math.max(0, quantities[flavor] + Number(button.dataset.change));
  document.querySelector(`#qty-${flavors.indexOf(flavor)}`).value = quantities[flavor];
  updateUnits();
}

function getUnitPrice() {
  const p = products.find(p => p.product_type === 'unit');
  return p ? Number(p.base_price) : 4;
}

function getBox4Price() {
  const p = products.find(p => p.product_type === 'box' && p.quantity === 4);
  return p ? Number(p.base_price) : 12;
}

function getTastingPrice() {
  const p = products.find(p => p.product_type === 'box' && p.quantity === 10);
  return p ? Number(p.base_price) : 25;
}

function isTastingBox() {
  return flavors.length === 10 && flavors.every(flavor => quantities[flavor] === 1);
}

function unitSelectionPrice(total) {
  const groups = Math.floor(total / 4);
  return groups * getBox4Price() + (total % 4) * getUnitPrice();
}

function updateUnits() {
  const total = Object.values(quantities).reduce((a, b) => a + b, 0);
  const tastingBox = isTastingBox();
  const groups = Math.floor(total / 4);
  const tastingPrice = getTastingPrice();
  const price = tastingBox ? tastingPrice : unitSelectionPrice(total);
  const discount = document.querySelector('#discount-message');

  document.querySelector('#units-total').textContent = `${total} ${total === 1 ? 'unidade' : 'unidades'}`;
  document.querySelector('#units-price').textContent = currency(price);
  
  discount.textContent = total >= 100 ? 'Pedido a partir de 100 brigadeiros: fale com a Maria para negociar um valor especial.' : tastingBox ? `Caixa degustação aplicada: 10 sabores por R$ ${tastingPrice.toFixed(2).replace('.', ',')}.` : groups ? `${groups} ${groups === 1 ? 'grupo de 4 aplicado' : 'grupos de 4 aplicados'} por R$ ${getBox4Price().toFixed(2).replace('.', ',')}${total % 4 ? ` + ${total % 4} ${total % 4 === 1 ? 'unidade avulsa' : 'unidades avulsas'} a R$ ${getUnitPrice().toFixed(2).replace('.', ',')}.` : '.'}` : `Faltam ${4 - total} ${4 - total === 1 ? 'unidade' : 'unidades'} para formar um grupo de R$ ${getBox4Price().toFixed(2).replace('.', ',')}.`;
  discount.classList.toggle('active', tastingBox || groups > 0);
  
  document.querySelector('#negotiate-large-order').hidden = total < 100;
  document.querySelector('#add-units-cart').disabled = !total;
}

function getCentoPrice() {
  const p = products.find(p => p.product_type === 'event');
  return p ? Number(p.base_price) : 120;
}

function setupEventCalculator() {
  const guestsInput = document.querySelector('#guests-count');
  const eventTypeSelect = document.querySelector('#event-type');
  const calcBtn = document.querySelector('#calc-whatsapp-btn');
  if (!guestsInput || !eventTypeSelect) return;

  function calculateEvent() {
    const guests = Math.max(10, Math.min(1000, Number(guestsInput.value) || 50));
    const type = eventTypeSelect.value;
    
    let factor = 5;
    if (type === 'wedding') factor = 7;
    else if (type === 'kids' || type === 'corporate') factor = 4;

    const totalUnits = guests * factor;
    const centos = (totalUnits / 100).toFixed(1);
    const centoPrice = getCentoPrice();
    const totalPrice = (totalUnits / 100) * centoPrice;

    document.querySelector('#calc-guests-label').textContent = guests;
    document.querySelector('#calc-qty-recommendation').textContent = `${totalUnits} brigadeiros (~${centos} ${centos === '1.0' ? 'cento' : 'centos'})`;
    document.querySelector('#calc-price-estimate').textContent = `Estimativa: ${currency(totalPrice)}`;

    calcBtn.onclick = () => {
      const phone = config.contact1_phone || '556492854186';
      const msg = `Olá! Fiz uma simulação na calculadora da Ébano para um evento de ${guests} pessoas. Gostaria de um orçamento para cerca de ${totalUnits} brigadeiros (${centos} centos).`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };
  }

  guestsInput.addEventListener('input', calculateEvent);
  eventTypeSelect.addEventListener('change', calculateEvent);
  calculateEvent();
}

async function loadTestimonials() {
  const container = document.querySelector('#testimonials-grid');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/testimonials`);
    const data = await res.json();
    if (!data.length) return;

    container.innerHTML = data.map(item => `
      <div class="testimonial-card" style="background: #110c09; border: 1px solid #8f662d33; padding: 24px; position: relative;">
        <div style="color: var(--gold-light); font-size: 16px; margin-bottom: 10px;">${'★'.repeat(item.rating || 5)}</div>
        <p style="font-style: italic; color: var(--cream); font-size: 14px; line-height: 1.6; margin: 0 0 15px;">"${item.comment}"</p>
        <strong style="color: var(--gold); font-family: 'Cormorant Garamond'; font-size: 18px; display: block; text-align: right;">— ${item.customer_name}</strong>
      </div>
    `).join('');
  } catch (e) {
    console.error('Erro ao carregar depoimentos:', e);
  }
}

// Iniciar a aplicação
async function startApp() {
  await initStore();
  setupEventCalculator();
  loadTestimonials();
}

startApp();
