const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./admin.db', err => {
  if (err) console.error(err.message);
  else console.log('✅ SQLite connected for admin');
});

// ---------------- Таблицы ----------------

// Получить список таблиц
app.get('/api/tables', (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Создать новую таблицу
app.post('/api/tables', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Название таблицы обязательно' });

  const sql = `CREATE TABLE IF NOT EXISTS ${name} (id INTEGER PRIMARY KEY AUTOINCREMENT)`;
  db.run(sql, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ name });
  });
});

// Удалить таблицу
app.delete('/api/tables/:name', (req, res) => {
  const { name } = req.params;
  db.run(`DROP TABLE IF EXISTS ${name}`, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: name });
  });
});

// ---------------- Столбцы ----------------

// Получить список столбцов таблицы
app.get('/api/meta/:table/columns', (req, res) => {
  const table = req.params.table;
  db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // вернем только имена колонок
    res.json(rows.map(r => r.name));
  });
});

// Добавить новый столбец
app.post('/api/meta/:table/columns', (req, res) => {
  const table = req.params.table;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Название столбца обязательно' });

  const sql = `ALTER TABLE ${table} ADD COLUMN ${name} TEXT`;
  db.run(sql, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ table, column: name });
  });
});

// Удалить столбец (через пересоздание таблицы)
app.delete('/api/meta/:table/columns/:column', (req, res) => {
  const table = req.params.table;
  const column = req.params.column;

  // Получаем текущие колонки
  db.all(`PRAGMA table_info(${table})`, [], (err, cols) => {
    if (err) return res.status(500).json({ error: err.message });

    const colNames = cols.map(c => c.name).filter(c => c !== column);
    const colList = colNames.join(', ');

    const tempTable = table + '_backup';

    db.serialize(() => {
      // создаем временную таблицу без удаляемой колонки
      db.run(`CREATE TABLE ${tempTable} AS SELECT ${colList} FROM ${table}`, err => {
        if (err) return res.status(500).json({ error: err.message });

        // удаляем старую таблицу
        db.run(`DROP TABLE ${table}`, err => {
          if (err) return res.status(500).json({ error: err.message });

          // переименовываем временную таблицу обратно
          db.run(`ALTER TABLE ${tempTable} RENAME TO ${table}`, err => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ table, deletedColumn: column });
          });
        });
      });
    });
  });
});

app.listen(PORT, () => console.log(`🚀 Admin server running at http://localhost:${PORT}`));
