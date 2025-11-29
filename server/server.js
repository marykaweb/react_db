// server.js
console.log('🔧 Загрузка server.js...');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 4000;

app.use(cors());

// Логирование всех запросов ДО парсинга JSON
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl || req.path}`, `Path: ${req.path}, BaseUrl: ${req.baseUrl}`);
  next();
});

app.use(express.json());

// ---------------- Инициализация базы ----------------
if (!fs.existsSync('./database.db')) {
  fs.writeFileSync('./database.db', '');
}

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error(err.message);
  else console.log('✅ Подключено к SQLite');
});

// ---------------- Таблицы служебных данных ----------------
db.run(`
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS columns_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT,
    column_name TEXT
  )
`);

// =====================================================
// 🔹 Тестовый маршрут
// =====================================================
app.get('/test', (req, res) => {
  res.json({ message: 'Сервер работает!' });
});

// =====================================================
// 🔹 Получить список таблиц
// =====================================================
app.get('/api/tables', (req, res) => {
  db.all('SELECT name FROM tables', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// =====================================================
// 🔹 Добавить таблицу
// =====================================================
app.post('/api/tables', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Имя таблицы обязательно' });

 // Валидация имени таблицы для предотвращения SQL-инъекций
 if (!/^[a-zA-Zа-яА-ЯёЁ_][a-zA-Zа-яА-ЯёЁ0-9_ ]*$/.test(name)) {
   console.error('❌ Невалидное имя таблицы:', name);
   return res.status(400).json({ error: 'Невалидное имя таблицы. Имя таблицы может содержать только буквы, цифры, пробелы и подчеркивания, и должно начинаться с буквы или подчеркивания.' });
 }

  db.run('INSERT INTO tables (name) VALUES (?)', [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    // создаём саму таблицу данных
    db.run(`CREATE TABLE IF NOT EXISTS "${name}" (id INTEGER PRIMARY KEY AUTOINCREMENT)`);

    res.json({ id: this.lastID, name });
 });
});

// =====================================================
// 🔹 Удалить таблицу
// =====================================================
app.delete('/api/tables/:name', (req, res) => {
  const { name } = req.params;

  // Валидация имени таблицы для предотвращения SQL-инъекций
  if (!/^[a-zA-Zа-яА-ЯёЁ_][a-zA-Zа-яА-ЯёЁ0-9_ ]*$/.test(name)) {
    console.error('❌ Невалидное имя таблицы:', name);
    return res.status(400).json({ error: 'Невалидное имя таблицы. Имя таблицы может содержать только буквы, цифры, пробелы и подчеркивания, и должно начинаться с буквы или подчеркивания.' });
  }

  db.run('DELETE FROM tables WHERE name = ?', [name]);
  db.run('DELETE FROM columns_meta WHERE table_name = ?', [name]);
  db.run(`DROP TABLE IF EXISTS "${name}"`);
 res.json({ deleted: name });
});

// =====================================================
// 🔹 Маршруты для столбцов (более специфичные - ПЕРВЫМИ)
// =====================================================
app.get('/api/:table/columns', (req, res) => {
  const { table } = req.params;
  console.log('✅ GET /api/:table/columns вызван, table:', table);

  db.all('SELECT column_name FROM columns_meta WHERE table_name = ?', [table], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении столбцов:', err.message);
      return res.status(500).json({ error: err.message });
    }
    const columns = rows.map(r => r.column_name);
    console.log('Столбцы найдены:', columns);
    res.json(columns);
  });
});

app.post('/api/:table/columns', (req, res) => {
  const { table } = req.params;
  const { column_name } = req.body;

  console.log('✅ POST /api/:table/columns вызван', { table, column_name, body: req.body });

  if (!column_name || column_name.trim() === '') {
    console.error('❌ Имя столбца не предоставлено');
    return res.status(400).json({ error: 'Имя столбца обязательно' });
  }

  const originalColumnName = column_name.trim();

  // Валидация имени столбца (до замены пробелов на подчеркивания)
  if (!/^[a-zA-Zа-яА-ЯёЁ_][a-zA-Zа-яА-ЯёЁ0-9 ]*$/.test(originalColumnName)) {
    console.error('❌ Невалидное имя столбца:', originalColumnName);
    return res.status(400).json({
      error: 'Имя столбца может содержать только буквы, цифры и пробелы (пробелы будут заменены на подчеркивания), и должно начинаться с буквы или подчеркивания'
    });
  }

  // Заменяем пробелы на подчеркивания для использования в базе данных
  const cleanColumnName = originalColumnName.replace(/\s+/g, '_');

  // Валидация имени таблицы
  if (!/^[a-zA-Zа-яА-ЯёЁ_][a-zA-Zа-яА-ЯёЁ0-9_ ]*$/.test(table)) {
    console.error('❌ Невалидное имя таблицы:', table);
    return res.status(400).json({ error: 'Невалидное имя таблицы' });
  }

  // Проверяем, существует ли таблица
  db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (checkErr, tables) => {
    if (checkErr) {
      console.error('❌ Ошибка при проверке таблицы:', checkErr.message);
      return res.status(500).json({ error: 'Ошибка при проверке таблицы' });
    }

    if (!tables || tables.length === 0) {
      console.error('❌ Таблица не найдена:', table);
      return res.status(404).json({ error: `Таблица "${table}" не найдена` });
    }

    // Добавляем столбец
    db.run(`ALTER TABLE "${table}" ADD COLUMN ${cleanColumnName} TEXT`, [], (err) => {
      if (err) {
        console.error('❌ Ошибка ALTER TABLE:', err.message);
        if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
          return res.status(400).json({ error: `Столбец "${originalColumnName}" уже существует в таблице` });
        }
        return res.status(500).json({ error: err.message });
      }

      console.log('✅ Столбец добавлен в таблицу:', cleanColumnName);

      // Добавляем в метаданные
      db.run('INSERT INTO columns_meta (table_name, column_name) VALUES (?, ?)', [table, cleanColumnName], (metaErr) => {
        if (metaErr) {
          console.error('❌ Ошибка INSERT в columns_meta:', metaErr.message);
          if (metaErr.message.includes('UNIQUE constraint')) {
            return res.json({ success: true, column_name: originalColumnName, warning: 'Столбец уже был в метаданных' });
          }
          return res.status(500).json({ error: metaErr.message });
        }
        console.log('✅ Столбец добавлен в метаданные:', cleanColumnName);
        res.json({ success: true, column_name: originalColumnName });
      });
    });
  });
});

app.delete('/api/:table/columns/:column', (req, res) => {
  const { table, column } = req.params;

  // Валидация имени таблицы для предотвращения SQL-инъекций
  if (!/^[a-zA-Zа-яА-ЯёЁ_][a-zA-Zа-яА-ЯёЁ0-9_ ]*$/.test(table)) {
    console.error('❌ Невалидное имя таблицы:', table);
    return res.status(400).json({ error: 'Невалидное имя таблицы' });
  }

 // Валидация имени столбца для предотвращения SQL-инъекций
if (!/^[a-zA-Zа-яА-ЯёЁ_][a-zA-Zа-яА-ЯёЁ0-9_ ]*$/.test(column)) {
   console.error('❌ Невалидное имя столбца:', column);
   return res.status(400).json({ error: 'Невалидное имя столбца' });
 }

  // Заменяем пробелы на подчеркивания для использования в базе данных
  const dbColumnName = column.replace(/\s+/g, '_');

  db.run('DELETE FROM columns_meta WHERE table_name = ? AND column_name = ?', [table, dbColumnName], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, column });
  });
});

// =====================================================
// 🔹 Маршруты для данных таблиц (менее специфичные - ПОСЛЕ /columns)
// =====================================================
app.get('/api/:table', (req, res) => {
  const { table } = req.params;

  // Проверяем, что это не запрос к /tables
  if (table === 'tables') {
    return res.status(404).json({ error: 'Маршрут не найден' });
  }

  console.log('✅ GET /api/:table вызван, table:', table);

  db.all(`PRAGMA table_info("${table}")`, (err, info) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!info.length) return res.json([]);

    db.all(`SELECT * FROM "${table}"`, [], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(rows);
    });
  });
});

app.post('/api/:table', (req, res) => {
  const { table } = req.params;
  const fields = Object.keys(req.body);
  const values = Object.values(req.body);

  if (!fields.length) return res.status(400).json({ error: 'Нет данных для вставки' });

  const placeholders = fields.map(() => '?').join(',');
  db.run(
    `INSERT INTO "${table}" (${fields.join(',')}) VALUES (${placeholders})`,
    values,
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

app.delete('/api/:table/:id', (req, res) => {
  const { table, id } = req.params;
  db.run(`DELETE FROM "${table}" WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletedId: id });
 });
});

app.put('/api/:table/:id', (req, res) => {
  const { table, id } = req.params;
  const fields = Object.keys(req.body);
  const values = Object.values(req.body);

  const setClause = fields.map(f => `${f} = ?`).join(',');
  db.run(`UPDATE "${table}" SET ${setClause} WHERE id = ?`, [...values, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, ...req.body });
  });
});

// =====================================================
// 🔹 Обработчик 404
// =====================================================
app.use((req, res) => {
  console.log(`❌ Маршрут не найден: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Маршрут не найден', path: req.path, method: req.method });
});

// =====================================================
// 🔹 Запуск сервера
// =====================================================
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log('📋 Зарегистрированные маршруты:');
  console.log('  GET  /api/tables');
  console.log('  POST /api/tables');
  console.log('  DELETE /api/tables/:name');
  console.log('  GET  /api/:table/columns');
  console.log('  POST /api/:table/columns');
  console.log('  DELETE /api/:table/columns/:column');
  console.log('  GET  /api/:table');
  console.log('  POST /api/:table');
  console.log('  DELETE /api/:table/:id');
  console.log('  PUT  /api/:table/:id');
});
