const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Конфиг
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// БД
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error(err.message);
  else console.log('БД подключена');
});

db.configure('busyTimeout', 5000);

// Инициализация БД
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  // Удаляем старые таблицы
  db.run(`DROP TABLE IF EXISTS traffic`);
  db.run(`DROP TABLE IF EXISTS subscribers`);
  db.run(`DROP TABLE IF EXISTS tariffs`);
  db.run(`DROP TABLE IF EXISTS operators`);

  // Таблица операторов
  db.run(`CREATE TABLE operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  // Таблица тарифов
  db.run(`CREATE TABLE tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    minutes INTEGER,
    sms INTEGER,
    data_gb INTEGER,
    price INTEGER
  )`);

  // Таблица абонентов
  db.run(`CREATE TABLE subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    phone TEXT UNIQUE NOT NULL,
    password TEXT,
    tariff_id INTEGER,
    reg_date TEXT DEFAULT CURRENT_DATE,
    FOREIGN KEY (tariff_id) REFERENCES tariffs(id)
  )`);

  // Таблица трафика
  db.run(`CREATE TABLE traffic (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER,
    traffic_type TEXT,
    minutes_used INTEGER,
    sms_used INTEGER,
    data_used REAL,
    date TEXT,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
  )`, () => {
    // Таблицы созданы, можем инициализировать данные
    initializeData();
  });
});

// Инициализация данных
function initializeData() {
  db.run(`INSERT INTO operators (login, password) VALUES ('admin', 'admin123')`);

  db.run(`INSERT INTO tariffs (name, minutes, sms, data_gb, price) VALUES
    ('Light', 200, 100, 10, 350),
    ('Standard', 500, 300, 30, 590),
    ('Pro', 1000, 600, 60, 990),
    ('Ultra', 2000, 1000, 120, 1490),
    ('Night', 100, 50, 50, 250)
  `, () => {
    console.log('Тарифы загружены');
    insertSubscribers();
  });
}

// Добавляем абонентов
function insertSubscribers() {
  let abonentCount = 0;
  
  const imena = ['Иван', 'Петр', 'Александр', 'Сергей', 'Дмитрий', 'Николай', 'Андрей', 'Виктор', 'Мария', 'Анна', 'Елена', 'Ольга', 'Павел', 'Михаил', 'Владимир'];
  const familii = ['Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Волков', 'Соколов', 'Лебедев', 'Морозов', 'Новиков', 'Орлов', 'Крылов', 'Киселев', 'Воробьев', 'Степанов'];
  
  for (let i = 1; i <= 100; i++) {
    const firstName = imena[Math.floor(Math.random() * imena.length)];
    const lastName = familii[Math.floor(Math.random() * familii.length)];
    const polnoeImya = `${lastName} ${firstName}`;
    const nomerTelefona = `+7999000${String(i).padStart(3, '0')}`;
    const parol = `pass${i}`;
    const tariffId = ((i - 1) % 5) + 1;
    const datRegistracii = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.run(
      `INSERT INTO subscribers (full_name, phone, password, tariff_id, reg_date) VALUES (?, ?, ?, ?, ?)`,
      [polnoeImya, nomerTelefona, parol, tariffId, datRegistracii],
      function(err) {
        if (!err) {
          abonentCount++;
          const abonentId = this.lastID;
          generateTrafficForSubscriber(abonentId);
          
          if (abonentCount === 100) {
            console.log('100 абонентов загружены');
            console.log('Генерируется трафик...');
          }
        }
      }
    );
  }
}

// Генерируем трафик для абонента
function generateTrafficForSubscriber(abonentId) {
  // Дневной трафик (24 записи)
  for (let den = 0; den < 24; den++) {
    const randomDaysAgo = Math.floor(Math.random() * 60);
    const minutyIspol = Math.floor(Math.random() * 40) + 1;
    const smsIspol = Math.floor(Math.random() * 10) + 1;
    const trafik = Math.round((Math.random() * 300 + 100) * 10) / 10;

    db.run(
      `INSERT INTO traffic (subscriber_id, traffic_type, minutes_used, sms_used, data_used, date) 
       VALUES (?, ?, ?, ?, ?, date('now', ?))`,
      [abonentId, 'day', minutyIspol, smsIspol, trafik, `-${randomDaysAgo} days`]
    );
  }

  // Ночной трафик (12 записей)
  for (let noch = 0; noch < 12; noch++) {
    const randomDaysAgo = Math.floor(Math.random() * 60);
    const minutyIspol = Math.floor(Math.random() * 40) + 1;
    const smsIspol = Math.floor(Math.random() * 10) + 1;
    const trafik = Math.round((Math.random() * 300 + 100) * 10) / 10;

    db.run(
      `INSERT INTO traffic (subscriber_id, traffic_type, minutes_used, sms_used, data_used, date) 
       VALUES (?, ?, ?, ?, ?, date('now', ?))`,
      [abonentId, 'night', minutyIspol, smsIspol, trafik, `-${randomDaysAgo} days`]
    );
  }
}

// API ROUTES

// Вход оператора
app.post('/api/auth/operator', (req, res) => {
  const { login, password } = req.body;
  db.get('SELECT * FROM operators WHERE login = ? AND password = ?', [login, password], (err, operator) => {
    if (err || !operator) return res.status(401).json({ error: 'Неверные учетные данные' });
    res.json({ user: { id: operator.id, login: operator.login, type: 'operator' } });
  });
});

// Вход абонента
app.post('/api/auth/subscriber', (req, res) => {
  const { phone, password } = req.body;
  db.get('SELECT * FROM subscribers WHERE phone = ? AND password = ?', [phone, password], (err, abonent) => {
    if (err || !abonent) return res.status(401).json({ error: 'Неверные учетные данные' });
    res.json({ user: { id: abonent.id, full_name: abonent.full_name, phone: abonent.phone, type: 'subscriber' } });
  });
});

// АБОНЕНТЫ

// Получить всех абонентов
app.get('/api/subscribers', (req, res) => {
  db.all(`SELECT s.*, t.name as tariff_name FROM subscribers s 
    LEFT JOIN tariffs t ON s.tariff_id = t.id`, (err, subs) => {
    res.json(subs || []);
  });
});

// Получить одного абонента
app.get('/api/subscribers/:id', (req, res) => {
  db.get(`SELECT s.*, t.* FROM subscribers s 
    LEFT JOIN tariffs t ON s.tariff_id = t.id WHERE s.id = ?`, [req.params.id], (err, sub) => {
    res.json(sub || {});
  });
});

// Добавить абонента
app.post('/api/subscribers', (req, res) => {
  const { full_name, phone, tariff_id, password } = req.body;
  db.run('INSERT INTO subscribers (full_name, phone, tariff_id, password) VALUES (?, ?, ?, ?)',
    [full_name, phone, tariff_id, password], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Абонент добавлен' });
  });
});

// Изменить абонента
app.put('/api/subscribers/:id', (req, res) => {
  const { full_name, phone, tariff_id, password } = req.body;
  db.run('UPDATE subscribers SET full_name = ?, phone = ?, tariff_id = ?, password = ? WHERE id = ?',
    [full_name, phone, tariff_id, password, req.params.id], (err) => {
    res.json({ message: 'Абонент обновлен' });
  });
});

// Удалить абонента
app.delete('/api/subscribers/:id', (req, res) => {
  db.run('DELETE FROM subscribers WHERE id = ?', [req.params.id], (err) => {
    res.json({ message: 'Абонент удален' });
  });
});

// ТАРИФЫ

// Получить все тарифы
app.get('/api/tariffs', (req, res) => {
  db.all('SELECT * FROM tariffs', (err, tariffs) => {
    res.json(tariffs || []);
  });
});

// Добавить тариф
app.post('/api/tariffs', (req, res) => {
  const { name, minutes, sms, data_gb, price } = req.body;
  db.run('INSERT INTO tariffs (name, minutes, sms, data_gb, price) VALUES (?, ?, ?, ?, ?)',
    [name, minutes, sms, data_gb, price], function(err) {
    res.json({ id: this.lastID });
  });
});

// Изменить тариф
app.put('/api/tariffs/:id', (req, res) => {
  const { name, minutes, sms, data_gb, price } = req.body;
  db.run('UPDATE tariffs SET name = ?, minutes = ?, sms = ?, data_gb = ?, price = ? WHERE id = ?',
    [name, minutes, sms, data_gb, price, req.params.id], (err) => {
    res.json({ message: 'Тариф обновлен' });
  });
});

// Удалить тариф
app.delete('/api/tariffs/:id', (req, res) => {
  db.run('DELETE FROM tariffs WHERE id = ?', [req.params.id], (err) => {
    res.json({ message: 'Тариф удален' });
  });
});

// ТРАФИК

// Получить весь трафик
app.get('/api/traffic', (req, res) => {
  db.all(`SELECT t.*, s.full_name FROM traffic t 
    LEFT JOIN subscribers s ON t.subscriber_id = s.id 
    ORDER BY t.date DESC LIMIT 1000`, (err, data) => {
    res.json(data || []);
  });
});

// Получить трафик абонента
app.get('/api/traffic/:subscriberId', (req, res) => {
  db.all(`SELECT * FROM traffic WHERE subscriber_id = ? ORDER BY date DESC`, [req.params.subscriberId], (err, data) => {
    res.json(data || []);
  });
});

// Добавить запись трафика
app.post('/api/traffic', (req, res) => {
  const { subscriber_id, traffic_type, minutes_used, sms_used, data_used, date } = req.body;
  db.run('INSERT INTO traffic (subscriber_id, traffic_type, minutes_used, sms_used, data_used, date) VALUES (?, ?, ?, ?, ?, ?)',
    [subscriber_id, traffic_type, minutes_used, sms_used, data_used, date], function(err) {
    res.json({ id: this.lastID });
  });
});

// СТАТИСТИКА

// Получить статистику трафика
app.get('/api/traffic-stats/:subscriberId', (req, res) => {
  db.all(`SELECT 
    SUM(data_used) as total_data_gb,
    SUM(CASE WHEN traffic_type = 'day' THEN data_used ELSE 0 END) as day_data_gb,
    SUM(CASE WHEN traffic_type = 'night' THEN data_used ELSE 0 END) as night_data_gb,
    SUM(minutes_used) as total_minutes,
    SUM(sms_used) as total_sms,
    COUNT(DISTINCT date) as days_count
    FROM traffic 
    WHERE subscriber_id = ? AND date >= date('now', '-30 days')`,
    [req.params.subscriberId], (err, stats) => {
    res.json(stats[0] || {});
  });
});

// Получить рекомендацию по тарифу
app.get('/api/recommend/:subscriberId', (req, res) => {
  db.all(`SELECT 
    AVG(minutes_used) as avg_min, 
    AVG(data_used) as avg_data,
    AVG(sms_used) as avg_sms 
    FROM traffic 
    WHERE subscriber_id = ?`,
    [req.params.subscriberId], (err, stats) => {
    
    if (!stats || !stats[0]) {
      return res.json({ recommendedTariff: 'Light', reason: 'Недостаточно данных' });
    }

    const stat = stats[0];
    const avgMin = Math.ceil(stat.avg_min || 0);
    const avgData = Math.ceil(stat.avg_data || 0);
    const avgSms = Math.ceil(stat.avg_sms || 0);

    // Ищем подходящий тариф
    db.all(`SELECT * FROM tariffs WHERE minutes >= ? AND data_gb >= ? AND sms >= ? ORDER BY price ASC LIMIT 1`,
      [avgMin, avgData, avgSms], (err, suitable) => {
      
      if (suitable && suitable.length > 0) {
        res.json({ 
          recommendedTariff: suitable[0].name,
          recommendedTariffId: suitable[0].id,
          reason: `Оптимально для ${avgMin} мин, ${avgData}ГБ, ${avgSms} SMS` 
        });
      } else {
        // Если ничего не подошло, берем самый дорогой
        db.get('SELECT * FROM tariffs ORDER BY price DESC LIMIT 1', (err, expensive) => {
          res.json({ 
            recommendedTariff: expensive?.name || 'Ultra',
            recommendedTariffId: expensive?.id || 4,
            reason: 'Рекомендуем максимальный тариф' 
          });
        });
      }
    });
  });
});

// Изменить тариф абонента
app.post('/api/subscribe/:subscriberId/:tariffId', (req, res) => {
  db.run('UPDATE subscribers SET tariff_id = ? WHERE id = ?',
    [req.params.tariffId, req.params.subscriberId], (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Тариф изменен' });
  });
});

// ЗАПУСК СЕРВЕРА
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));