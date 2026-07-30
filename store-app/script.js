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
    addUnitsBtn.onclick = () => {
      updateUnits();
      unitDialog.showModal();
    };
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

  unitPicker.oninput = event => {
    const input = event.target.closest('.qty-input');
    if (!input) return;
    quantities[input.dataset.flavor] = Math.max(0, Math.floor(Number(input.value) || 0));
    updateUnits();
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

  // Botões de compras diretas da loja
  const btnCaixa4 = document.querySelector('#btn-buy-caixa-4');
  if (btnCaixa4) {
    btnCaixa4.onclick = () => {
      updateUnits();
      unitDialog.showModal();
    };
  }

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

  // Configuração de Entrega estilo iFood & Busca de CEP ViaCEP
  const deliverySelect = document.querySelector('#delivery-select');
  const addressFields = document.querySelector('#address-fields');
  const cepInput = document.querySelector('#cep-input');
  const btnSearchCep = document.querySelector('#btn-search-cep');
  const streetInput = document.querySelector('#street-input');
  const numberInput = document.querySelector('#number-input');
  const neighborhoodInput = document.querySelector('#neighborhood-input');
  const addressError = document.querySelector('#address-error');

  let isAddressValid = true;

  if (deliverySelect && addressFields) {
    deliverySelect.onchange = () => {
      const isDelivery = deliverySelect.value === 'delivery';
      addressFields.style.display = isDelivery ? 'block' : 'none';
      if (!isDelivery && addressError) {
        addressError.style.display = 'none';
        isAddressValid = true;
      }
    };
  }

  async function handleCepSearch() {
    if (!cepInput) return;
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    if (addressError) {
      addressError.style.display = 'none';
      addressError.textContent = '';
    }
    isAddressValid = true;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();

      if (data.erro) {
        if (addressError) {
          addressError.textContent = '❌ CEP não encontrado. Verifique o número digitado.';
          addressError.style.display = 'block';
        }
        isAddressValid = false;
        return;
      }

      // Validação Estrita de Cidade: Apenas Rio Verde - GO!
      const city = data.localidade || '';
      if (city.toLowerCase().trim() !== 'rio verde') {
        if (addressError) {
          addressError.textContent = `📍 Entregas indisponíveis para ${city} - ${data.uf}. No momento, a Ébano realiza entregas APENAS na cidade de Rio Verde - GO. Para outras cidades, por favor selecione "Retirada em Rio Verde"!`;
          addressError.style.display = 'block';
        }
        isAddressValid = false;
        if (streetInput) streetInput.value = '';
        if (neighborhoodInput) neighborhoodInput.value = '';
        return;
      }

      if (streetInput) streetInput.value = data.logradouro || '';
      if (neighborhoodInput) neighborhoodInput.value = data.bairro || '';
      if (numberInput) numberInput.focus();
    } catch (e) {
      console.error('Erro ao consultar CEP:', e);
    }
  }

  if (cepInput) {
    cepInput.oninput = () => {
      const formatted = cepInput.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2');
      cepInput.value = formatted;
      if (cepInput.value.replace(/\D/g, '').length === 8) {
        handleCepSearch();
      }
    };
  }

  if (btnSearchCep) {
    btnSearchCep.onclick = handleCepSearch;
  }

  // Configuração Dinâmica de Troco para Pagamento em Dinheiro & Validação de Cupom
  const paymentSelect = document.querySelector('#payment-select');
  const cashChangeContainer = document.querySelector('#cash-change-container');
  const needChangeSelect = document.querySelector('#need-change-select');
  const changeValueBox = document.querySelector('#change-value-box');
  const changeAmountInput = document.querySelector('#change-amount-input');
  const changeCalcNotice = document.querySelector('#change-calc-notice');
  const couponInput = document.querySelector('#coupon-input');
  const couponNotice = document.querySelector('#coupon-calc-notice');

  function updateCouponAndChangeNotice() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const couponCode = (couponInput?.value || '').trim().toUpperCase();
    const couponValid = config.couponCode && couponCode === config.couponCode.toUpperCase();
    const discountPercent = couponValid ? Number(config.couponPercent || 0) : 0;
    const discount = couponValid ? subtotal * (discountPercent / 100) : 0;
    const fee = deliverySelect?.value === 'delivery' ? Number(config.deliveryFee || 0) : 0;
    const estimatedTotal = subtotal - discount + fee;

    // Atualizar Aviso do Cupom
    if (couponNotice) {
      if (couponCode) {
        if (couponValid) {
          couponNotice.style.color = 'var(--gold-light)';
          couponNotice.textContent = `🎉 Cupom "${config.couponCode}" aplicado! Desconto de ${discountPercent}% (-${currency(discount)}). Total final: ${currency(estimatedTotal)}${fee > 0 ? ' (incluindo entrega)' : ''}`;
        } else {
          couponNotice.style.color = '#ff6b6b';
          couponNotice.textContent = `❌ Cupom "${couponCode}" inválido ou não ativo.`;
        }
      } else {
        couponNotice.textContent = '';
      }
    }

    // Atualizar Troco com Total Descontado
    if (changeAmountInput && changeCalcNotice) {
      const cashValue = Number(changeAmountInput.value) || 0;
      if (cashValue > 0) {
        if (cashValue < estimatedTotal) {
          changeCalcNotice.style.color = '#ff6b6b';
          changeCalcNotice.textContent = `⚠️ O valor informado (${currency(cashValue)}) é menor que o total do pedido (${currency(estimatedTotal)}).`;
        } else {
          const changeDue = cashValue - estimatedTotal;
          changeCalcNotice.style.color = 'var(--gold-light)';
          changeCalcNotice.textContent = `💡 Troco a ser devolvido: ${currency(changeDue)}${discount > 0 ? ` (Total c/ desconto: ${currency(estimatedTotal)})` : ''}`;
        }
      } else {
        changeCalcNotice.textContent = '';
      }
    }
  }

  function updateChangeCalcNotice() {
    updateCouponAndChangeNotice();
  }

  if (couponInput) {
    couponInput.oninput = updateCouponAndChangeNotice;
  }

  if (paymentSelect && cashChangeContainer) {
    paymentSelect.onchange = () => {
      const isCash = paymentSelect.value === 'Dinheiro';
      cashChangeContainer.style.display = isCash ? 'block' : 'none';
      if (!isCash) {
        needChangeSelect.value = 'no';
        changeValueBox.style.display = 'none';
        changeAmountInput.value = '';
        changeCalcNotice.textContent = '';
      }
      updateCouponAndChangeNotice();
    };
  }

  if (needChangeSelect && changeValueBox) {
    needChangeSelect.onchange = () => {
      const needsChange = needChangeSelect.value === 'yes';
      changeValueBox.style.display = needsChange ? 'block' : 'none';
      if (needsChange) {
        changeAmountInput.focus();
        updateCouponAndChangeNotice();
      } else {
        changeAmountInput.value = '';
        changeCalcNotice.textContent = '';
      }
    };
  }

  if (changeAmountInput) {
    changeAmountInput.oninput = updateCouponAndChangeNotice;
  }

  document.querySelectorAll('.chip-change').forEach(chip => {
    chip.onclick = () => {
      if (changeAmountInput) {
        changeAmountInput.value = chip.dataset.amount;
        updateCouponAndChangeNotice();
      }
    };
  });

  const phoneInput = document.querySelector('#customer-phone-input');
  if (phoneInput) {
    phoneInput.oninput = () => {
      let v = phoneInput.value.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);
      if (v.length > 6) {
        v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
      } else if (v.length > 2) {
        v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      } else if (v.length > 0) {
        v = `(${v}`;
      }
      phoneInput.value = v;
    };
  }

  // Sacola Checkout
  document.querySelector('#checkout').onclick = () => {
    updateCouponAndChangeNotice();
    checkoutDialog.showModal();
  };
  document.querySelector('#order-cta').onclick = () => {
    if (cart.length) {
      updateCouponAndChangeNotice();
      checkoutDialog.showModal();
    } else document.querySelector('#opcoes').scrollIntoView();
  };

  // Enviar Formulário de Pedido (Salva no BD e depois envia no WhatsApp)
  const checkoutForm = document.querySelector('#checkout-form');
  if (checkoutForm) {
    checkoutForm.onsubmit = async event => {
      event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const data = new FormData(event.target);
      const deliveryMethod = data.get('delivery');
      const paymentMethod = data.get('payment');
      const needChange = data.get('need_change');
      const changeAmount = Number(data.get('change_amount')) || 0;

      // Validar Endereço se for Entrega
      if (deliveryMethod === 'delivery') {
        const cep = (data.get('cep') || '').replace(/\D/g, '');
        const street = (data.get('street') || '').trim();
        const number = (data.get('number') || '').trim();
        const neighborhood = (data.get('neighborhood') || '').trim();

        if (!street || !number || !neighborhood) {
          alert('Por favor, preencha todos os campos do endereço (Rua, Número e Bairro) para a entrega!');
          submitBtn.disabled = false;
          return;
        }

        if (!isAddressValid) {
          alert('📍 Entregas são realizadas apenas na cidade de Rio Verde - GO. Altere o endereço ou escolha Retirada!');
          submitBtn.disabled = false;
          return;
        }
      }

      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const couponInputVal = (data.get('coupon') || '').trim().toUpperCase();
      const couponValid = Boolean(config.couponCode && couponInputVal === config.couponCode.toUpperCase());
      const discountPercent = couponValid ? Number(config.couponPercent || 0) : 0;
      const discount = couponValid ? subtotal * (discountPercent / 100) : 0;
      const fee = deliveryMethod === 'delivery' ? Number(config.deliveryFee || 0) : 0;
      const total = subtotal - discount + fee;

      // Validar Troco se for Pagamento em Dinheiro com troco solicitado
      if (paymentMethod === 'Dinheiro' && needChange === 'yes') {
        if (!changeAmount || changeAmount < total) {
          alert(`Por favor, informe um valor de troco igual ou superior ao total do pedido (${currency(total)})!`);
          submitBtn.disabled = false;
          return;
        }
      }

      // Formatando Informação de Pagamento & Troco
      let formattedPayment = paymentMethod;
      if (paymentMethod === 'Dinheiro') {
        if (needChange === 'yes' && changeAmount > 0) {
          const changeDue = changeAmount - total;
          formattedPayment = `Dinheiro (Troco para ${currency(changeAmount)} — Devolver ${currency(changeDue)})`;
        } else {
          formattedPayment = 'Dinheiro (Sem troco - valor exato)';
        }
      }

      // Formatando Endereço de Entrega
      const formattedAddress = deliveryMethod === 'delivery' 
        ? `${data.get('street')}, Nº ${data.get('number')} - ${data.get('neighborhood')}${data.get('complement') ? ` (${data.get('complement')})` : ''} - Rio Verde/GO (CEP: ${data.get('cep')})`
        : 'Retirada em Rio Verde';

      // Montar payload para salvar no banco de dados
      const orderPayload = {
        customer_name: data.get('name'),
        customer_phone: data.get('phone') || '',
        requested_date: data.get('date'),
        requested_time: data.get('time') || null,
        fulfillment_method: deliveryMethod,
        delivery_address: formattedAddress,
        payment_method: formattedPayment,
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
      let saveOrderData = {};
      try {
        const saveOrderRes = await fetch(`${API_URL}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });
        if (saveOrderRes.ok) {
          saveOrderData = await saveOrderRes.json();
          console.log('Pedido persistido com ID:', saveOrderData.order_id);
        }
      } catch (err) {
        console.error('Falha ao conectar com banco:', err);
      }

      // Gerar mensagem formatada para WhatsApp
      const itemsText = cart.map(item => `• ${item.quantity}× ${item.name} — ${currency(item.price * item.quantity)}${item.detail ? `\n  ${item.detail}` : ''}`).join('\n');
      const pix = data.get('payment') === 'Pix' && config.pixKey ? `\n*Chave Pix:* ${config.pixKey}` : '';
      const couponLine = couponValid ? `\n*Cupom Aplicado:* ${config.couponCode} (-${currency(discount)})` : couponInputVal ? '\n*Cupom:* Inválido' : '';
      const orderIdLine = saveOrderData.order_id ? `\n*Pedido N°:* #${saveOrderData.order_id}` : '';
      
      const addressSection = deliveryMethod === 'delivery' 
        ? `\n📍 *Endereço de Entrega:*\n• Rua: ${data.get('street')}, N° ${data.get('number')}\n• Bairro: ${data.get('neighborhood')}${data.get('complement') ? `\n• Complemento: ${data.get('complement')}` : ''}\n• Cidade: Rio Verde - GO (CEP: ${data.get('cep')})`
        : '\n📍 *Forma de Retirada:* Retirada em Rio Verde';

      const message = `Olá! Quero fazer uma encomenda na Ébano.${orderIdLine}\n\n*Pedido:*\n${itemsText}\n\n*Subtotal:* ${currency(subtotal)}${couponLine}\n*Entrega:* ${fee ? currency(fee) : deliveryMethod === 'delivery' ? 'a confirmar' : 'Retirada'}\n*Total:* ${currency(total)}\n*Nome do Cliente:* ${data.get('name')}\n*Telefone / WhatsApp:* ${data.get('phone')}\n*Data e horário:* ${data.get('date')} ${data.get('time') || ''}${addressSection}\n*Pagamento:* ${formattedPayment}\n*Mensagem para presente:* ${data.get('gift') || 'Nenhuma'}\n*Observações:* ${data.get('notes') || 'Nenhuma'}${pix}`;
      
      const targetContact = data.get('contact') || config.contact1_phone || '556492854186';
      const cleanContact = targetContact.replace(/\D/g, '') || '556492854186';
      const waUrl = `https://wa.me/${cleanContact}?text=${encodeURIComponent(message)}`;

      // Garantir abertura mesmo se houver bloqueio de pop-up
      const win = window.open(waUrl, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = waUrl;
      }
      
      // Limpar sacola e fechar modal
      cart.length = 0;
      renderCart();
      checkoutDialog.close();
    } catch (err) {
      console.error('Erro ao processar pedido:', err);
      alert('Ocorreu um erro ao processar o seu pedido. Tentando direcionar para o WhatsApp...');
    } finally {
      submitBtn.disabled = false;
    }
  };
}
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
  
  // Regra de negócio: A opção de negociar aparece SOMENTE a partir de 1 cento de brigadeiros (100+ unidades)
  discount.textContent = total >= 100 
    ? 'Você atingiu 1 cento de brigadeiros! Clique no botão abaixo para negociar um valor especial diretamente conosco.' 
    : tastingBox 
      ? `Caixa degustação aplicada: 10 sabores por R$ ${tastingPrice.toFixed(2).replace('.', ',')}.` 
      : groups 
        ? `${groups} ${groups === 1 ? 'grupo de 4 aplicado' : 'grupos de 4 aplicados'} por R$ ${getBox4Price().toFixed(2).replace('.', ',')}${total % 4 ? ` + ${total % 4} ${total % 4 === 1 ? 'unidade avulsa' : 'unidades avulsas'} a R$ ${getUnitPrice().toFixed(2).replace('.', ',')}.` : '.'}` 
        : `Faltam ${4 - total} ${4 - total === 1 ? 'unidade' : 'unidades'} para formar um grupo de R$ ${getBox4Price().toFixed(2).replace('.', ',')}.`;
        
  discount.classList.toggle('active', tastingBox || groups > 0 || total >= 100);
  
  const negotiateBtn = document.querySelector('#negotiate-large-order');
  if (negotiateBtn) {
    negotiateBtn.hidden = total < 100;
    negotiateBtn.style.display = total >= 100 ? 'block' : 'none';
  }

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
