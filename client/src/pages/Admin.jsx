// client/src/pages/Admin.jsx
import React, { useEffect, useState } from 'react';
import { Button, Table, Form, InputGroup } from 'react-bootstrap';

export default function Admin() {
  const [tabs, setTabs] = useState([]);
  const [newTab, setNewTab] = useState('');
  const [tableColumns, setTableColumns] = useState({});
  const [newColumn, setNewColumn] = useState({});
  const [expandedTable, setExpandedTable] = useState(null); // какая таблица раскрыта

  // ------------------ Загрузка таблиц ------------------
  const fetchTabs = () => {
    fetch('http://localhost:4000/api/tables')
      .then(res => res.json())
      .then(tabsData => setTabs(tabsData))
      .catch(console.error);
  };

  const fetchColumns = (table) => {
    fetch(`http://localhost:4000/api/${table}/columns`)
      .then(res => res.json())
      .then(cols => {
        // Преобразуем имена столбцов, заменя подчеркивания на пробелы для отображения
        const displayCols = cols.filter(c => c !== 'id').map(col => col.replace(/_/g, ' '));
        setTableColumns(prev => ({ ...prev, [table]: displayCols }));
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchTabs();
  }, []);

  // ------------------ Таблицы ------------------
  const addTab = () => {
    if (!newTab) return;
    fetch('http://localhost:4000/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTab })
    })
      .then(res => res.json())
      .then(t => {
        if (t.name) {
          setTabs([...tabs, t]);
          setNewTab('');
          fetchColumns(t.name);
        }
      })
      .catch(console.error);
  };

  const deleteTab = (name) => {
    fetch(`http://localhost:4000/api/tables/${name}`, { method: 'DELETE' })
      .then(() => {
        setTabs(tabs.filter(t => t.name !== name));
        const newCols = { ...tableColumns };
        delete newCols[name];
        setTableColumns(newCols);
        if (expandedTable === name) setExpandedTable(null);
      })
      .catch(console.error);
  };

  // ------------------ Столбцы ------------------
  const addColumn = (table) => {
    const columnName = newColumn[table];
    if (!columnName || !columnName.trim()) {
      alert('Введите имя столбца');
      return;
    }

    // Заменяем пробелы на подчеркивания для отправки в базу данных
    const dbColumnName = columnName.trim().replace(/\s+/g, '_');

    fetch(`http://localhost:4000/api/${table}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_name: dbColumnName })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            console.error('Ошибка сервера:', err);
            return Promise.reject(err);
          });
        }
        return res.json();
      })
      .then((result) => {
        console.log('Столбец успешно добавлен:', result);
        fetchColumns(table);
        setNewColumn(prev => ({ ...prev, [table]: '' }));
        if (result.warning) {
          alert(result.warning);
        }
      })
      .catch(err => {
        console.error('Ошибка при добавлении столбца:', err);
        const errorMessage = err?.error || err?.message || 'Не удалось добавить столбец';
        alert(errorMessage);
      });
  };

  const deleteColumn = (table, column) => {
    // Преобразуем имя столбца, заменяя пробелы на подчеркивания для запроса к базе данных
    const dbColumnName = column.replace(/\s+/g, '_');
    fetch(`http://localhost:4000/api/${table}/columns/${dbColumnName}`, { method: 'DELETE' })
      .then(() => fetchColumns(table))
      .catch(console.error);
  };

  // ------------------ Раскрытие таблицы ------------------
  const toggleTable = (name) => {
    setExpandedTable(prev => {
      if (prev === name) return null; // если закрываем, просто закрываем
      // если раскрываем и столбцы ещё не загружены
      if (!tableColumns[name]) {
        fetchColumns(name);
      }
      return name;
    });
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>⚙️ Админка</h3>
        <Button variant="secondary" onClick={() => window.location.href = '/'}>
          ⬅ Назад
        </Button>
      </div>

      <h5>Список таблиц</h5>
      {/* Добавление таблицы */}
      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Название новой таблицы"
          value={newTab}
          onChange={(e) => setNewTab(e.target.value)}
        />
        <Button onClick={addTab}>Добавить таблицу</Button>
      </InputGroup>
      <Table bordered>
        <thead>
          <tr>
            <th>Название таблицы</th>
            <th>Действие</th>
          </tr>
        </thead>
        <tbody>
          {tabs.map((t) => (
            <React.Fragment key={t.name}>
              <tr
                onClick={() => toggleTable(t.name)}
                style={{ cursor: 'pointer' }}
                className="table-primary"
              >
                <td>{t.name}</td>
                <td>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); deleteTab(t.name); }}
                  >
                    Удалить
                  </Button>
                </td>
              </tr>

              {/* Раскрытые столбцы */}
              {expandedTable === t.name && (
                <tr>
                  <td colSpan={2}>
                    <strong>Столбцы:</strong>
                    <Table bordered size="sm" className="mt-2 mb-2">
                      <tbody>
                        {(tableColumns[t.name] || []).map((col, idx) => (
                          <tr key={idx}>
                            <td>{col}</td>
                            <td>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => deleteColumn(t.name, col)}
                              >
                                Удалить
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <InputGroup>
                      <Form.Control
                        placeholder={`Добавить столбец в ${t.name}`}
                        value={newColumn[t.name] || ''}
                        onChange={(e) =>
                          setNewColumn(prev => ({ ...prev, [t.name]: e.target.value }))
                        }
                      />
                      <Button onClick={() => addColumn(t.name)}>Добавить</Button>
                    </InputGroup>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
