// Переменные
const API_URL = 'http://localhost:3000/api';
const operator = JSON.parse(localStorage.getItem('user') || '{}');

// Проверка авторизации
if (!operator.id || operator.type !== 'operator') {
  window.location.href = 'login_operator.html';
}

// При загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('admin-name').textContent = `👤 ${operator.login}`;
  loadTariffs();
});

let currentEditingTariff = null;

// Загрузить все тарифы
async function loadTariffs() {
  try {
    const response = await fetch(`${API_URL}/tariffs`);
    const tariffs = await response.json();
    
    // Вывести тарифы
    document.getElementById('tariffs-list').innerHTML = tariffs.map(tarif => `
      <div class="tariff-item">
        <div class="tariff-item-info">
          <h4>${tarif.name}</h4>
          <p>☎️ ${tarif.minutes} мин | 📊 ${tarif.data_gb} ГБ | 💬 ${tarif.sms} SMS</p>
          <p style="margin-top: 5px; color: #667eea; font-weight: 600;">Цена: ${tarif.price}₽/месяц</p>
        </div>
        <div style="text-align: right; display: flex; gap: 10px;">
          <button onclick="openEditModal(${tarif.id}, '${tarif.name}', ${tarif.minutes}, ${tarif.sms}, ${tarif.data_gb}, ${tarif.price})" 
            class="btn-table-edit">✏️ Изменить</button>
          <button onclick="deleteTariffConfirm(${tarif.id})" class="btn-table-delete">🗑️ Удалить</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Ошибка загрузки тарифов:', error);
  }
}

// Добавить новый тариф
async function addTariff() {
  const nazva = document.getElementById('tariff-name').value.trim();
  const minuty = parseInt(document.getElementById('tariff-minutes').value);
  const sms = parseInt(document.getElementById('tariff-sms').value);
  const dataGb = parseInt(document.getElementById('tariff-data').value);
  const price = parseInt(document.getElementById('tariff-price').value);
  const errorDiv = document.getElementById('add-error');

  // Проверка полей
  if (!nazva || !minuty || !sms || !dataGb || !price) {
    errorDiv.textContent = '❌ Заполните все поля';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/tariffs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: nazva, minutes: minuty, sms, data_gb: dataGb, price })
    });

    if (!response.ok) throw new Error('Ошибка добавления');

    // Очистить форму
    document.getElementById('tariff-name').value = '';
    document.getElementById('tariff-minutes').value = '100';
    document.getElementById('tariff-sms').value = '50';
    document.getElementById('tariff-data').value = '10';
    document.getElementById('tariff-price').value = '299';
    errorDiv.style.display = 'none';

    loadTariffs();
    alert('✅ Тариф добавлен');
  } catch (error) {
    errorDiv.textContent = '❌ ' + error.message;
    errorDiv.style.display = 'block';
  }
}

// Открыть окно редактирования
function openEditModal(id, nazva, minuty, sms, dataGb, price) {
  currentEditingTariff = id;
  document.getElementById('modal-tariff-id').value = id;
  document.getElementById('modal-name').value = nazva;
  document.getElementById('modal-minutes').value = minuty;
  document.getElementById('modal-sms').value = sms;
  document.getElementById('modal-data').value = dataGb;
  document.getElementById('modal-price').value = price;
  document.getElementById('tariff-modal').style.display = 'flex';
}

// Закрыть окно редактирования
function closeTariffModal() {
  document.getElementById('tariff-modal').style.display = 'none';
  currentEditingTariff = null;
}

// Обновить тариф
async function updateTariff() {
  const id = document.getElementById('modal-tariff-id').value;
  const nazva = document.getElementById('modal-name').value.trim();
  const minuty = parseInt(document.getElementById('modal-minutes').value);
  const sms = parseInt(document.getElementById('modal-sms').value);
  const dataGb = parseInt(document.getElementById('modal-data').value);
  const price = parseInt(document.getElementById('modal-price').value);

  // Проверка полей
  if (!nazva || !minuty || !sms || !dataGb || !price) {
    alert('❌ Заполните все поля');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/tariffs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: nazva, minutes: minuty, sms, data_gb: dataGb, price })
    });

    if (!response.ok) throw new Error('Ошибка обновления');

    closeTariffModal();
    loadTariffs();
    alert('✅ Тариф обновлен');
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

// Удалить тариф
async function deleteTariff() {
  if (!confirm('Вы уверены?')) return;

  const id = document.getElementById('modal-tariff-id').value;

  try {
    const response = await fetch(`${API_URL}/tariffs/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Ошибка удаления');

    closeTariffModal();
    loadTariffs();
    alert('✅ Тариф удален');
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

// Подтверждение удаления
function deleteTariffConfirm(id) {
  if (confirm('Удалить этот тариф?')) {
    deleteTariffById(id);
  }
}

// Удалить тариф по ID
async function deleteTariffById(id) {
  try {
    const response = await fetch(`${API_URL}/tariffs/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Ошибка удаления');

    loadTariffs();
    alert('✅ Тариф удален');
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

// Выход
function logout() {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Закрытие окна при клике снаружи
window.onclick = function(event) {
  const modal = document.getElementById('tariff-modal');
  if (event.target === modal) {
    closeTariffModal();
  }
};
