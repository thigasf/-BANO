const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://ebano.vercel.app/api';
const currency = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const defaults = { 
  leadTime: 'Confirme o prazo antes de finalizar', 
  minOrder: 0, 
  deliveryFee: 0, 
  pixKey: '', 
  couponCode: '', 
  couponPercent: 0, 
  heroImage: '',
  contact1_name: 'Maria Eduarda',
  contact1_phone: '556492854186',
  contact2_name: 'Thiago',
  contact2_phone: '5564992527258'
};
let config = { ...defaults };
let lastMaxOrderId = 0;
let allOrders = [];

const savedLabel = document.querySelector('#saved');
const preview = document.querySelector('#preview');

// Auxiliares de Autenticação
function getToken() {
  return localStorage.getItem('ebano_token');
}

function handleAuthError() {
  localStorage.removeItem('ebano_token');
  localStorage.removeItem('ebano_user');
  window.location.href = 'login.html';
}

function showMessage(text, isError = false) {
  savedLabel.textContent = text;
  savedLabel.style.color = isError ? '#ff6b6b' : '#e0bd7f';
  setTimeout(() => {
    savedLabel.textContent = '';
  }, 4000);
}

// ALERTA SONORO DE NOVO PEDIDO (Web Audio API)
function playNewOrderChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error('Áudio não suportado ou bloqueado:', e);
  }
}

// ─────────────────────────────────────────────
// NAVEGAÇÃO DE ABAS
// ─────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const targetTab = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.querySelector(`#tab-${targetTab}`).classList.add('active');

    if (targetTab === 'settings') loadConfig();
    else if (targetTab === 'contacts') loadContacts();
    else if (targetTab === 'menu') {
      loadMenu();
      loadTestimonialsAdmin();
    }
    else if (targetTab === 'orders') {
      loadOrders();
      loadAnalytics();
    }
  });
});

// ─────────────────────────────────────────────
// ABA 1: CONFIGURAÇÕES DA LOJA
// ─────────────────────────────────────────────
function showPreview(url) {
  if (!url) {
    preview.style.backgroundImage = '';
    preview.textContent = 'A prévia da foto aparecerá aqui';
    return;
  }
  preview.style.backgroundImage = `linear-gradient(#0006,#0006), url("${url}")`;
  preview.textContent = 'Prévia da foto de capa';
}

const configForm = document.querySelector('#config-form');
configForm.elements.heroImage.addEventListener('input', event => showPreview(event.target.value));

document.querySelector('#hero-upload').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    showMessage('Escolha uma foto de até 1 MB.', true);
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    configForm.elements.heroImage.value = reader.result;
    showPreview(reader.result);
  };
  reader.readAsDataURL(file);
});

async function loadConfig() {
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) return handleAuthError();

    const data = await res.json();
    config = { ...defaults, ...data };
    
    const keys = ['leadTime', 'minOrder', 'deliveryFee', 'pixKey', 'couponCode', 'couponPercent', 'heroImage'];
    keys.forEach(key => {
      if (configForm.elements[key]) configForm.elements[key].value = config[key];
    });
    showPreview(config.heroImage);
  } catch (err) {
    console.error(err);
    showMessage('Erro ao carregar configurações da API.', true);
  }
}

configForm.addEventListener('submit', async event => {
  event.preventDefault();
  const token = getToken();
  if (!token) return handleAuthError();

  const payload = {
    leadTime: configForm.elements.leadTime.value || defaults.leadTime,
    minOrder: Number(configForm.elements.minOrder.value) || 0,
    deliveryFee: Number(configForm.elements.deliveryFee.value) || 0,
    pixKey: configForm.elements.pixKey.value.trim(),
    couponCode: configForm.elements.couponCode.value.trim().toUpperCase(),
    couponPercent: Math.min(100, Number(configForm.elements.couponPercent.value) || 0),
    heroImage: configForm.elements.heroImage.value.trim()
  };

  try {
    const res = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) return handleAuthError();

    if (res.ok) {
      showMessage('Configurações da loja salvas com sucesso!');
    } else {
      showMessage('Falha ao salvar configurações.', true);
    }
  } catch (err) {
    console.error(err);
    showMessage('Erro ao conectar ao servidor.', true);
  }
});

document.querySelector('#reset').onclick = async () => {
  if (!confirm('Deseja restaurar as configurações padrão?')) return;
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(defaults)
    });

    if (res.status === 401 || res.status === 403) return handleAuthError();

    if (res.ok) {
      loadConfig();
      showMessage('Configurações restauradas com sucesso!');
    }
  } catch (err) {
    console.error(err);
    showMessage('Erro de conexão.', true);
  }
};

// ─────────────────────────────────────────────
// ABA 2: ATENDENTES
// ─────────────────────────────────────────────
const contactsForm = document.querySelector('#contacts-form');

async function loadContacts() {
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) return handleAuthError();

    const data = await res.json();
    config = { ...defaults, ...data };

    contactsForm.elements.contact1_name.value = config.contact1_name;
    contactsForm.elements.contact1_phone.value = config.contact1_phone;
    contactsForm.elements.contact2_name.value = config.contact2_name;
    contactsForm.elements.contact2_phone.value = config.contact2_phone;
  } catch (err) {
    console.error(err);
    showMessage('Erro ao carregar contatos de WhatsApp.', true);
  }
}

contactsForm.addEventListener('submit', async event => {
  event.preventDefault();
  const token = getToken();
  if (!token) return handleAuthError();

  const payload = {
    contact1_name: contactsForm.elements.contact1_name.value.trim() || defaults.contact1_name,
    contact1_phone: contactsForm.elements.contact1_phone.value.trim().replace(/\D/g, '') || defaults.contact1_phone,
    contact2_name: contactsForm.elements.contact2_name.value.trim() || defaults.contact2_name,
    contact2_phone: contactsForm.elements.contact2_phone.value.trim().replace(/\D/g, '') || defaults.contact2_phone
  };

  try {
    const res = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) return handleAuthError();

    if (res.ok) {
      showMessage('Contatos de WhatsApp atualizados com sucesso!');
    }
  } catch (err) {
    console.error(err);
    showMessage('Erro ao salvar contatos.', true);
  }
});

// ─────────────────────────────────────────────
// ABA 3: CARDÁPIO (SABORES, PREÇOS E DEPOIMENTOS)
// ─────────────────────────────────────────────
const productsListDiv = document.querySelector('#products-list');
const flavorsListDiv = document.querySelector('#flavors-list');
const testimonialsListDiv = document.querySelector('#testimonials-admin-list');

async function loadMenu() {
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const [prodRes, flavRes] = await Promise.all([
      fetch(`${API_URL}/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/flavors`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    if (prodRes.status === 401 || flavRes.status === 401) return handleAuthError();

    const products = await prodRes.json();
    const flavors = await flavRes.json();

    // 1. Renderizar Produtos
    productsListDiv.innerHTML = products.map(product => `
      <div class="admin-item-card">
        <div class="admin-item-info">
          <h3>${product.name}</h3>
          <p>${product.description || 'Sem descrição'}</p>
        </div>
        <div class="admin-item-actions">
          <div class="price-input-container">
            <span>R$</span>
            <input type="number" step="0.01" value="${Number(product.base_price)}" id="price-${product.id}">
          </div>
          <button class="small-btn" onclick="saveProductPrice(${product.id}, '${product.name}', '${product.product_type}', ${product.quantity})">Salvar Preço</button>
        </div>
      </div>
    `).join('');

    // 2. Renderizar Sabores
    flavorsListDiv.innerHTML = flavors.map(flavor => `
      <div class="admin-item-card">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${flavor.image_url ? `<img src="${flavor.image_url}" alt="${flavor.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 1px solid var(--gold);">` : ''}
          <div class="admin-item-info">
            <h3>${flavor.name}</h3>
            <p>${flavor.description || 'Sem descrição'}</p>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="small-btn secondary" onclick="editFlavorDialog(${flavor.id}, '${flavor.name}', '${flavor.description || ''}', '${flavor.image_url || ''}')">Editar</button>
          <label class="switch" aria-label="Ativar ou desativar sabor ${flavor.name}">
            <input type="checkbox" ${flavor.is_active ? 'checked' : ''} onchange="toggleFlavorActive(${flavor.id}, '${flavor.name}', this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    showMessage('Erro ao carregar cardápio.', true);
  }
}

async function loadTestimonialsAdmin() {
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/testimonials/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) return handleAuthError();

    const data = await res.json();
    if (!testimonialsListDiv) return;

    if (!data.length) {
      testimonialsListDiv.innerHTML = '<p style="color: var(--muted);">Nenhum depoimento cadastrado.</p>';
      return;
    }

    testimonialsListDiv.innerHTML = data.map(item => `
      <div class="admin-item-card">
        <div class="admin-item-info">
          <h3>${item.customer_name} <span style="color: var(--gold); font-size: 14px;">${'★'.repeat(item.rating)}</span></h3>
          <p>"${item.comment}"</p>
        </div>
        <div class="admin-item-actions">
          <label class="switch" aria-label="Ativar ou desativar depoimento">
            <input type="checkbox" ${item.is_active ? 'checked' : ''} onchange="toggleTestimonialActive(${item.id}, '${item.customer_name}', '${item.comment.replace(/'/g, "\\'")}', ${item.rating}, this.checked)">
            <span class="slider"></span>
          </label>
          <button class="small-btn secondary" onclick="deleteTestimonial(${item.id})">Excluir</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    showMessage('Erro ao carregar depoimentos.', true);
  }
}

async function toggleTestimonialActive(id, customer_name, comment, rating, active) {
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/testimonials/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ customer_name, comment, rating, is_active: active })
    });
    if (res.ok) {
      showMessage(`Depoimento de "${customer_name}" ${active ? 'ativado' : 'ocultado'}.`);
      loadTestimonialsAdmin();
    }
  } catch (e) {
    showMessage('Erro ao atualizar depoimento.', true);
  }
}

async function deleteTestimonial(id) {
  if (!confirm('Deseja excluir este depoimento?')) return;
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/testimonials/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      showMessage('Depoimento removido com sucesso!');
      loadTestimonialsAdmin();
    }
  } catch (e) {
    showMessage('Erro ao excluir depoimento.', true);
  }
}

async function saveProductPrice(id, name, product_type, quantity) {
  const token = getToken();
  if (!token) return handleAuthError();

  const newPrice = Number(document.querySelector(`#price-${id}`).value);
  if (isNaN(newPrice) || newPrice < 0) {
    return showMessage('Digite um preço válido.', true);
  }

  try {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        product_type,
        base_price: newPrice,
        quantity,
        is_active: true
      })
    });

    if (res.ok) {
      showMessage(`Preço de "${name}" atualizado para R$ ${newPrice.toFixed(2)}`);
      loadMenu();
    }
  } catch (err) {
    console.error(err);
    showMessage('Erro ao atualizar preço.', true);
  }
}

async function toggleFlavorActive(id, name, active) {
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/flavors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        is_active: active
      })
    });

    if (res.ok) {
      showMessage(`Sabor "${name}" foi ${active ? 'ativado' : 'desativado'}.`);
      loadMenu();
    }
  } catch (err) {
    console.error(err);
    showMessage('Erro ao atualizar sabor.', true);
  }
}

// Dialog Sabores
const flavorDialog = document.querySelector('#flavor-dialog');
const flavorForm = document.querySelector('#flavor-form');

document.querySelector('#flavor-upload').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    showMessage('Escolha uma foto de até 1 MB.', true);
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    document.querySelector('#flavor-image-input').value = reader.result;
  };
  reader.readAsDataURL(file);
});

document.querySelector('#btn-add-flavor').onclick = () => {
  document.querySelector('#flavor-id-input').value = '';
  document.querySelector('#flavor-name-input').value = '';
  document.querySelector('#flavor-desc-input').value = '';
  document.querySelector('#flavor-image-input').value = '';
  document.querySelector('#flavor-dialog-title').textContent = 'Cadastrar Novo Sabor';
  document.querySelector('#flavor-submit-btn').textContent = 'Cadastrar';
  flavorDialog.showModal();
};

function editFlavorDialog(id, name, desc, imageUrl) {
  document.querySelector('#flavor-id-input').value = id;
  document.querySelector('#flavor-name-input').value = name;
  document.querySelector('#flavor-desc-input').value = desc;
  document.querySelector('#flavor-image-input').value = imageUrl || '';
  document.querySelector('#flavor-dialog-title').textContent = 'Editar Sabor';
  document.querySelector('#flavor-submit-btn').textContent = 'Salvar Alterações';
  flavorDialog.showModal();
}

flavorForm.onsubmit = async event => {
  event.preventDefault();
  const token = getToken();
  if (!token) return handleAuthError();

  const id = document.querySelector('#flavor-id-input').value;
  const name = document.querySelector('#flavor-name-input').value.trim();
  const description = document.querySelector('#flavor-desc-input').value.trim();
  const image_url = document.querySelector('#flavor-image-input').value.trim();

  const url = id ? `${API_URL}/flavors/${id}` : `${API_URL}/flavors`;
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, description, image_url, is_active: true })
    });

    if (res.ok) {
      showMessage(id ? `Sabor "${name}" atualizado!` : `Sabor "${name}" cadastrado com sucesso!`);
      flavorDialog.close();
      loadMenu();
    } else {
      const errData = await res.json();
      showMessage(errData.error || 'Erro ao salvar sabor.', true);
    }
  } catch (err) {
    console.error(err);
    showMessage('Erro ao salvar sabor.', true);
  }
};

// Dialog Depoimentos
const testimonialDialog = document.querySelector('#testimonial-dialog');
const testimonialForm = document.querySelector('#testimonial-form');

document.querySelector('#btn-add-testimonial').onclick = () => {
  document.querySelector('#testimonial-id-input').value = '';
  document.querySelector('#testimonial-name-input').value = '';
  document.querySelector('#testimonial-comment-input').value = '';
  document.querySelector('#testimonial-rating-input').value = '5';
  testimonialDialog.showModal();
};

testimonialForm.onsubmit = async event => {
  event.preventDefault();
  const token = getToken();
  if (!token) return handleAuthError();

  const customer_name = document.querySelector('#testimonial-name-input').value.trim();
  const comment = document.querySelector('#testimonial-comment-input').value.trim();
  const rating = Number(document.querySelector('#testimonial-rating-input').value) || 5;

  try {
    const res = await fetch(`${API_URL}/testimonials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ customer_name, comment, rating })
    });

    if (res.ok) {
      showMessage('Depoimento cadastrado com sucesso!');
      testimonialDialog.close();
      loadTestimonialsAdmin();
    }
  } catch (e) {
    showMessage('Erro ao cadastrar depoimento.', true);
  }
};

document.querySelectorAll('.dialog-close').forEach(btn => {
  btn.onclick = () => btn.closest('dialog').close();
});

// ─────────────────────────────────────────────
// ABA 4: PEDIDOS RECEBIDOS, FILTROS E MÉTRICAS
// ─────────────────────────────────────────────
const ordersTbody = document.querySelector('#orders-tbody');
const orderDetailsDialog = document.querySelector('#order-details-dialog');
const searchOrdersInput = document.querySelector('#search-orders');
const filterStatusSelect = document.querySelector('#filter-order-status');

async function loadAnalytics() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      document.querySelector('#metric-revenue').textContent = currency(data.total_revenue);
      document.querySelector('#metric-orders').textContent = data.total_orders;
      document.querySelector('#metric-pending').textContent = data.pending_orders;
    }
  } catch (err) {
    console.error('Erro ao carregar métricas:', err);
  }
}

async function loadOrders() {
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) return handleAuthError();

    allOrders = await res.json();

    if (allOrders.length) {
      const currentMaxId = Math.max(...allOrders.map(o => parseInt(o.id)));
      if (lastMaxOrderId > 0 && currentMaxId > lastMaxOrderId) {
        playNewOrderChime();
        showMessage(`🔔 Novo pedido recebido! Pedido #${currentMaxId}`);
      }
      lastMaxOrderId = currentMaxId;
    }

    renderOrdersTable();
  } catch (err) {
    console.error(err);
    showMessage('Erro ao carregar pedidos.', true);
  }
}

function renderOrdersTable() {
  const searchTerm = (searchOrdersInput?.value || '').trim().toLowerCase();
  const selectedStatus = filterStatusSelect?.value || 'all';

  const filteredOrders = allOrders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customer_name.toLowerCase().includes(searchTerm) || 
      String(order.id).includes(searchTerm);
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (!filteredOrders.length) {
    ordersTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 40px;">Nenhum pedido encontrado com estes filtros.</td></tr>`;
    return;
  }

  ordersTbody.innerHTML = filteredOrders.map(order => {
    const date = new Date(order.created_at).toLocaleDateString('pt-BR');
    const fulfillment = order.fulfillment_method === 'delivery' ? 'Entrega' : 'Retirada';
    const orderTotal = currency(Number(order.total));
    
    const statusMap = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      delivering: 'Enviado',
      completed: 'Concluído',
      cancelled: 'Cancelado'
    };

    const selectHtml = `
      <select class="small-select" onchange="updateOrderStatus(${order.id}, this.value)" style="padding: 5px; font-size: 11px; width: 120px;">
        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendente</option>
        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmado</option>
        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparando</option>
        <option value="delivering" ${order.status === 'delivering' ? 'selected' : ''}>Enviado</option>
        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Concluído</option>
        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
      </select>
    `;

    return `
      <tr>
        <td><strong>#${order.id}</strong></td>
        <td>${order.customer_name}</td>
        <td>${date}</td>
        <td>${fulfillment}</td>
        <td><strong style="color: var(--gold-light);">${orderTotal}</strong></td>
        <td><span class="status-badge ${order.status}">${statusMap[order.status]}</span></td>
        <td style="display: flex; gap: 8px; align-items: center;">
          <button class="small-btn secondary" onclick="viewOrderDetails(${order.id})">Detalhes</button>
          ${selectHtml}
        </td>
      </tr>
    `;
  }).join('');
}

if (searchOrdersInput) searchOrdersInput.addEventListener('input', renderOrdersTable);
if (filterStatusSelect) filterStatusSelect.addEventListener('change', renderOrdersTable);

async function updateOrderStatus(id, newStatus) {
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showMessage(`Status do pedido #${id} atualizado com sucesso.`);
      loadOrders();
      loadAnalytics();
    }
  } catch (err) {
    console.error(err);
    showMessage('Erro ao atualizar status do pedido.', true);
  }
}

async function viewOrderDetails(id) {
  const token = getToken();
  if (!token) return handleAuthError();

  try {
    const res = await fetch(`${API_URL}/orders/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) return handleAuthError();

    const order = await res.json();

    document.querySelector('#details-order-id').textContent = `Pedido #${order.id}`;

    const date = new Date(order.created_at).toLocaleString('pt-BR');
    const fulfillment = order.fulfillment_method === 'delivery' ? `Entrega em: ${order.delivery_address || 'Endereço não fornecido'}` : 'Retirada em Rio Verde';
    const subtotalVal = currency(Number(order.subtotal));
    const discountVal = currency(Number(order.discount_amount));
    const deliveryFeeVal = currency(Number(order.delivery_fee));
    const totalVal = currency(Number(order.total));

    let itemsHtml = order.items.map(item => `
      <div class="order-detail-item-row">
        <div>
          <h4>${item.quantity}x ${item.product_name}</h4>
          <p>${item.flavor_summary || 'Nenhum detalhe'}</p>
        </div>
        <strong>${currency(Number(item.line_total))}</strong>
      </div>
    `).join('');

    const contentHtml = `
      <div class="order-details-info">
        <div>
          <strong>Cliente:</strong> ${order.customer_name}<br>
          <strong>Telefone (Contato):</strong> ${order.customer_phone || 'Não informado'}<br>
          <strong>Data de Entrega/Retirada:</strong> ${new Date(order.requested_date).toLocaleDateString('pt-BR')} às ${order.requested_time || 'A combinar'}
        </div>
        <div>
          <strong>Método de Entrega:</strong> ${fulfillment}<br>
          <strong>Forma de Pagamento:</strong> ${order.payment_method}<br>
          <strong>Registrado em:</strong> ${date}
        </div>
      </div>
      
      ${order.gift_message ? `<div style="background: rgba(189, 145, 79, 0.1); padding: 12px; border-left: 2px solid var(--gold); margin-bottom: 15px;"><strong>Mensagem de Presente:</strong> "${order.gift_message}"</div>` : ''}
      ${order.notes ? `<div style="background: #2a1b0e; padding: 12px; margin-bottom: 15px;"><strong>Observações:</strong> ${order.notes}</div>` : ''}

      <div class="order-details-items">
        <h3 style="border-bottom: 1px solid #8f662d55; padding-bottom: 10px; margin-bottom: 10px;">Itens do Pedido</h3>
        ${itemsHtml}
      </div>

      <div style="margin-top: 25px; text-align: right; font-size: 14px; border-top: 1px solid #8f662d44; padding-top: 15px;">
        <span style="color: var(--muted);">Subtotal: ${subtotalVal}</span><br>
        ${order.coupon_code ? `<span style="color: var(--warning);">Cupom (${order.coupon_code}): -${discountVal}</span><br>` : ''}
        <span style="color: var(--muted);">Taxa de entrega: ${deliveryFeeVal}</span><br>
        <span style="font-size: 22px; font-weight: 600; color: var(--gold-light); display: inline-block; margin-top: 10px;">Total: ${totalVal}</span>
      </div>
    `;

    document.querySelector('#order-details-content').innerHTML = contentHtml;
    orderDetailsDialog.showModal();
  } catch (err) {
    console.error(err);
    showMessage('Erro ao obter detalhes do pedido.', true);
  }
}

document.querySelector('#btn-print-order').onclick = () => {
  window.print();
};

document.querySelector('#logout-btn').addEventListener('click', () => {
  handleAuthError();
});

setInterval(() => {
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab && activeTab.dataset.tab === 'orders') {
    loadOrders();
    loadAnalytics();
  }
}, 15000);

// Inicialização
loadConfig();
