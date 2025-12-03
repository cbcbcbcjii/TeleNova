const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();

// Конфиг
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// БД
const db = new Database('./database.db');
db.pragma('journal_mode = WAL');

// Инициализация БД
function initializeDatabase() {
  // Удаляем старые таблицы
  db.exec('DROP TABLE IF EXISTS traffic');
  db.exec('DROP TABLE IF EXISTS subscribers');
  db.exec('DROP TABLE IF EXISTS tariffs');
  db.exec('DROP TABLE IF EXISTS operators');

  // Таблица операторов
  db.exec(`CREATE TABLE operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  // Таблица тарифов
  db.exec(`CREATE TABLE tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    minutes INTEGER,
    sms INTEGER,
    data_gb INTEGER,
    price INTEGER
  )`);

  // Таблица абонентов
  db.exec(`CREATE TABLE subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    phone TEXT UNIQUE NOT NULL,
    password TEXT,
    tariff_id INTEGER,
    reg_date TEXT DEFAULT CURRENT_DATE,
    FOREIGN KEY (tariff_id) REFERENCES tariffs(id)
  )`);

  // Таблица трафика
  db.exec(`CREATE TABLE traffic (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER,
    traffic_type TEXT,
    minutes_used INTEGER,
    sms_used INTEGER,
    data_used REAL,
    date TEXT,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
  )`);

  console.log('✅ Таблицы созданы');
  initializeData();
}

// Инициализация данных
function initializeData() {
  // Операторы
  const insertOp = db.prepare('INSERT INTO operators (login, password) VALUES (?, ?)');
  insertOp.run('admin', 'admin123');
  console.log('✅ Операторы загружены');

  // Тарифы
  const insertTariff = db.prepare('INSERT INTO tariffs (name, minutes, sms, data_gb, price) VALUES (?, ?, ?, ?, ?)');
  const tariffs = [
    ['Light', 200, 100, 10, 350],
    ['Standard', 500, 300, 30, 590],
    ['Pro', 1000, 600, 60, 990],
    ['Ultra', 2000, 1000, 120, 1490],
    ['Night', 100, 50, 50, 250]
  ];
  tariffs.forEach(t => insertTariff.run(...t));
  console.log('✅ Тарифы загружены');

  // Абоненты и трафик
  const imena = ['Иван', 'Петр', 'Александр', 'Сергей', 'Дмитрий', 'Николай', 'Андрей', 'Виктор', 'Мария', 'Анна', 'Елена', 'Ольга', 'Павел', 'Михаил', 'Владимир'];
  const familii = ['Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Волков', 'Соколов', 'Лебедев', 'Морозов', 'Новиков', 'Орлов', 'Крылов', 'Киселев', 'Воробьев', 'Степанов'];

  const insertSub = db.prepare('INSERT INTO subscribers (full_name, phone, password, tariff_id, reg_date) VALUES (?, ?, ?, ?, ?)');
  const insertTraffic = db.prepare('INSERT INTO traffic (subscriber_id, traffic_type, minutes_used, sms_used, data_used, date) VALUES (?, ?, ?, ?, ?, ?)');

  for (let i = 1; i <= 100; i++) {
    const firstName = imena[Math.floor(Math.random() * imena.length)];
    const lastName = familii[Math.floor(Math.random() * familii.length)];
    const fullName = `${lastName} ${firstName}`;
    const phone = `+7999000${String(i).padStart(3, '0')}`;
    const password = `pass${i}`;
    const tariffId = ((i - 1) % 5) + 1;
    const regDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = insertSub.run(fullName, phone, password, tariffId, regDate);
    const subscriberId = result.lastInsertRowid;

    // Генерируем трафик (24 дневных + 12 ночных записей)
    for (let j = 0; j < 24; j++) {
      const randomDaysAgo = Math.floor(Math.random() * 60);
      const minutes = Math.floor(Math.random() * 40) + 1;
      const sms = Math.floor(Math.random() * 10) + 1;
      const data = Math.round((Math.random() * 300 + 100) * 10) / 10;
      const date = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      insertTraffic.run(subscriberId, 'day', minutes, sms, data, date);
    }

    for (let j = 0; j < 12; j++) {
      const randomDaysAgo = Math.floor(Math.random() * 60);
      const minutes = Math.floor(Math.random() * 40) + 1;
      const sms = Math.floor(Math.random() * 10) + 1;
      const data = Math.round((Math.random() * 300 + 100) * 10) / 10;
      const date = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      insertTraffic.run(subscriberId, 'night', minutes, sms, data, date);
    }
  }

  console.log('✅ 100 абонентов и трафик загружены');
}

// Инициализируем БД
initializeDatabase();

// API ROUTES

// Вход оператора
app.post('/api/auth/operator', (req, res) => {
  const { login, password } = req.body;
  const stmt = db.prepare('SELECT * FROM operators WHERE login = ? AND password = ?');
  const operator = stmt.get(login, password);
  
  if (!operator) {
    return res.status(401).json({ error: 'Неверные учетные данные' });
  }
  
  res.json({ user: { id: operator.id, login: operator.login, type: 'operator' } });
});

// Вход абонента
app.post('/api/auth/subscriber', (req, res) => {
  const { phone, password } = req.body;
  const stmt = db.prepare('SELECT * FROM subscribers WHERE phone = ? AND password = ?');
  const subscriber = stmt.get(phone, password);
  
  if (!subscriber) {
    return res.status(401).json({ error: 'Неверные учетные данные' });
  }
  
  res.json({ user: { id: subscriber.id, full_name: subscriber.full_name, phone: subscriber.phone, type: 'subscriber' } });
});

// Получить всех абонентов
app.get('/api/subscribers', (req, res) => {
  const stmt = db.prepare('SELECT s.*, t.name as tariff_name FROM subscribers s LEFT JOIN tariffs t ON s.tariff_id = t.id');
  const subscribers = stmt.all();
  res.json(subscribers || []);
});

// Получить одного абонента
app.get('/api/subscribers/:id', (req, res) => {
  const stmt = db.prepare('SELECT s.*, t.* FROM subscribers s LEFT JOIN tariffs t ON s.tariff_id = t.id WHERE s.id = ?');
  const subscriber = stmt.get(req.params.id);
  res.json(subscriber || {});
});

// Добавить абонента
app.post('/api/subscribers', (req, res) => {
  const { full_name, phone, tariff_id, password } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO subscribers (full_name, phone, tariff_id, password) VALUES (?, ?, ?, ?)');
    const result = stmt.run(full_name, phone, tariff_id, password);
    res.json({ id: result.lastInsertRowid, message: 'Абонент добавлен' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Изменить абонента
app.put('/api/subscribers/:id', (req, res) => {
  const { full_name, phone, tariff_id, password } = req.body;
  const stmt = db.prepare('UPDATE subscribers SET full_name = ?, phone = ?, tariff_id = ?, password = ? WHERE id = ?');
  stmt.run(full_name, phone, tariff_id, password, req.params.id);
  res.json({ message: 'Абонент обновлен' });
});

// Удалить абонента
app.delete('/api/subscribers/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM subscribers WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ message: 'Абонент удален' });
});

// Получить все тарифы
app.get('/api/tariffs', (req, res) => {
  const stmt = db.prepare('SELECT * FROM tariffs');
  const tariffs = stmt.all();
  res.json(tariffs || []);
});

// Добавить тариф
app.post('/api/tariffs', (req, res) => {
  const { name, minutes, sms, data_gb, price } = req.body;
  const stmt = db.prepare('INSERT INTO tariffs (name, minutes, sms, data_gb, price) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(name, minutes, sms, data_gb, price);
  res.json({ id: result.lastInsertRowid });
});

// Изменить тариф
app.put('/api/tariffs/:id', (req, res) => {
  const { name, minutes, sms, data_gb, price } = req.body;
  const stmt = db.prepare('UPDATE tariffs SET name = ?, minutes = ?, sms = ?, data_gb = ?, price = ? WHERE id = ?');
  stmt.run(name, minutes, sms, data_gb, price, req.params.id);
  res.json({ message: 'Тариф обновлен' });
});

// Удалить тариф
app.delete('/api/tariffs/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM tariffs WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ message: 'Тариф удален' });
});

// Получить весь трафик
app.get('/api/traffic', (req, res) => {
  const stmt = db.prepare('SELECT t.*, s.full_name FROM traffic t LEFT JOIN subscribers s ON t.subscriber_id = s.id ORDER BY t.date DESC LIMIT 1000');
  const traffic = stmt.all();
  res.json(traffic || []);
});

// Получить трафик абонента
app.get('/api/traffic/:subscriberId', (req, res) => {
  const stmt = db.prepare('SELECT * FROM traffic WHERE subscriber_id = ? ORDER BY date DESC');
  const traffic = stmt.all(req.params.subscriberId);
  res.json(traffic || []);
});

// Добавить запись трафика
app.post('/api/traffic', (req, res) => {
  const { subscriber_id, traffic_type, minutes_used, sms_used, data_used, date } = req.body;
  const stmt = db.prepare('INSERT INTO traffic (subscriber_id, traffic_type, minutes_used, sms_used, data_used, date) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(subscriber_id, traffic_type, minutes_used, sms_used, data_used, date);
  res.json({ id: result.lastInsertRowid });
});

// Получить статистику трафика
app.get('/api/traffic-stats/:subscriberId', (req, res) => {
  const stmt = db.prepare(`
    SELECT 
      SUM(data_used) as total_data_gb,
      SUM(CASE WHEN traffic_type = 'day' THEN data_used ELSE 0 END) as day_data_gb,
      SUM(CASE WHEN traffic_type = 'night' THEN data_used ELSE 0 END) as night_data_gb,
      SUM(minutes_used) as total_minutes,
      SUM(sms_used) as total_sms,
      COUNT(DISTINCT date) as days_count
      FROM traffic 
      WHERE subscriber_id = ? AND date >= date('now', '-30 days')
  `);
  const stats = stmt.get(req.params.subscriberId);
  res.json(stats || {});
});

// Получить рекомендацию по тарифу
app.get('/api/recommend/:subscriberId', (req, res) => {
  const stmt = db.prepare(`
    SELECT 
      AVG(minutes_used) as avg_min, 
      AVG(data_used) as avg_data,
      AVG(sms_used) as avg_sms 
      FROM traffic 
      WHERE subscriber_id = ?
  `);
  const stats = stmt.get(req.params.subscriberId);

  if (!stats || !stats.avg_min) {
    return res.json({ recommendedTariff: 'Light', reason: 'Недостаточно данных' });
  }

  const avgMin = Math.ceil(stats.avg_min || 0);
  const avgData = Math.ceil(stats.avg_data || 0);
  const avgSms = Math.ceil(stats.avg_sms || 0);

  // Ищем подходящий тариф
  const suitable = db.prepare('SELECT * FROM tariffs WHERE minutes >= ? AND data_gb >= ? AND sms >= ? ORDER BY price ASC LIMIT 1').get(avgMin, avgData, avgSms);

  if (suitable) {
    res.json({
      recommendedTariff: suitable.name,
      recommendedTariffId: suitable.id,
      reason: `Оптимально для ${avgMin} мин, ${avgData}ГБ, ${avgSms} SMS`
    });
  } else {
    const expensive = db.prepare('SELECT * FROM tariffs ORDER BY price DESC LIMIT 1').get();
    res.json({
      recommendedTariff: expensive?.name || 'Ultra',
      recommendedTariffId: expensive?.id || 4,
      reason: 'Рекомендуем максимальный тариф'
    });
  }
});

// Изменить тариф абонента
app.post('/api/subscribe/:subscriberId/:tariffId', (req, res) => {
  try {
    const stmt = db.prepare('UPDATE subscribers SET tariff_id = ? WHERE id = ?');
    stmt.run(req.params.tariffId, req.params.subscriberId);
    res.json({ message: 'Тариф изменен' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ЗАПУСК СЕРВЕРА
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
