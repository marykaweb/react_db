// client/src/pages/Admin.jsx
import React, { useEffect, useState } from 'react';
import { Button, Table, Form, InputGroup, Modal } from 'react-bootstrap';

export default function Admin() {
  const [tabs, setTabs] = useState([]);
  const [newTab, setNewTab] = useState('');
  const [tableColumns, setTableColumns] = useState({});
  const [newColumn, setNewColumn] = useState({});
  const [expandedTable, setExpandedTable] = useState(null); // какая таблица раскрыта
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState({ type: null, oldName: '', newName: '' });
  const [showRenameColumnModal, setShowRenameColumnModal] = useState(false);
  const [renameColumnTarget, setRenameColumnTarget] = useState({ table: '', oldName: '', newName: '' });

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
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            setErrorMessage(err.error || 'Ошибка при создании таблицы');
            setShowErrorModal(true);
            return null;
          });
        }
        return res.json();
      })
      .then(t => {
        if (t && t.name) {
          setTabs([...tabs, t]);
          setNewTab('');
          fetchColumns(t.name);
        }
      })
      .catch(err => {
        console.error('Ошибка при добавлении таблицы:', err);
        setErrorMessage('Ошибка при добавлении таблицы');
        setShowErrorModal(true);
      });
  };

  // Функция для переименования таблицы
  const renameTable = (oldName) => {
    if (!renameTarget.newName.trim()) {
      setErrorMessage('Введите новое имя таблицы');
      setShowErrorModal(true);
      return;
    }

    fetch(`http://localhost:4000/api/tables/${oldName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: renameTarget.newName })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            setErrorMessage(err.error || 'Ошибка при переименовании таблицы');
            setShowErrorModal(true);
            return null;
          });
        }
        return res.json();
      })
      .then(result => {
        if (result) {
          // Обновляем состояние
          setTabs(tabs.map(t => t.name === oldName ? { ...t, name: result.newName } : t));
          // Обновляем tableColumns
          const newTableColumns = { ...tableColumns };
          if (newTableColumns[oldName]) {
            newTableColumns[result.newName] = newTableColumns[oldName];
            delete newTableColumns[oldName];
            setTableColumns(newTableColumns);
          }
          // Если была раскрыта старая таблица, обновляем expandedTable
          if (expandedTable === oldName) {
            setExpandedTable(result.newName);
          }
          setShowRenameModal(false);
          setRenameTarget({ type: null, oldName: '', newName: '' });
        }
      })
      .catch(err => {
        console.error('Ошибка при переименовании таблицы:', err);
        setErrorMessage('Ошибка при переименовании таблицы');
        setShowErrorModal(true);
      });
  };

  // Функция для переименования столбца
  const renameColumn = () => {
    if (!renameColumnTarget.newName.trim()) {
      setErrorMessage('Введите новое имя столбца');
      setShowErrorModal(true);
      return;
    }

    fetch(`http://localhost:4000/api/${renameColumnTarget.table}/columns/${renameColumnTarget.oldName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newColumn: renameColumnTarget.newName })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            setErrorMessage(err.error || 'Ошибка при переименовании столбца');
            setShowErrorModal(true);
            return null;
          });
        }
        return res.json();
      })
      .then(result => {
        if (result) {
          // Обновляем состояние столбцов
          fetchColumns(renameColumnTarget.table);
          setShowRenameColumnModal(false);
          setRenameColumnTarget({ table: '', oldName: '', newName: '' });
        }
      })
      .catch(err => {
        console.error('Ошибка при переименовании столбца:', err);
        setErrorMessage('Ошибка при переименовании столбца');
        setShowErrorModal(true);
      });
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
      setErrorMessage('Введите имя столбца');
      setShowErrorModal(true);
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
            setErrorMessage(err.error || 'Ошибка при добавлении столбца');
            setShowErrorModal(true);
            return null;
          });
        }
        return res.json();
      })
      .then((result) => {
        if (result) {
          console.log('Столбец успешно добавлен:', result);
          fetchColumns(table);
          setNewColumn(prev => ({ ...prev, [table]: '' }));
          if (result.warning) {
            setErrorMessage(result.warning);
            setShowErrorModal(true);
          }
        }
      })
      .catch(err => {
        console.error('Ошибка при добавлении столбца:', err);
        setErrorMessage(err?.error || err?.message || 'Не удалось добавить столбец');
        setShowErrorModal(true);
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
                    variant="warning"
                    size="sm"
                    className="me-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameTarget({ type: 'table', oldName: t.name, newName: t.name });
                      setShowRenameModal(true);
                    }}
                  >
                    ✏️
                  </Button>
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
                                variant="warning"
                                size="sm"
                                className="me-2"
                                onClick={() => {
                                  setRenameColumnTarget({ table: t.name, oldName: col, newName: col });
                                  setShowRenameColumnModal(true);
                                }}
                              >
                                ✏️
                              </Button>
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
      {/* Модальное окно для ошибок */}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ошибка</Modal.Title>
        </Modal.Header>
        <Modal.Body>{errorMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowErrorModal(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Модальное окно для переименования таблицы */}
      <Modal show={showRenameModal} onHide={() => setShowRenameModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Переименовать таблицу</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Старое имя</Form.Label>
              <Form.Control
                type="text"
                value={renameTarget.oldName}
                readOnly
                disabled
              />
            </Form.Group>
            <Form.Group className="mt-3">
              <Form.Label>Новое имя</Form.Label>
              <Form.Control
                type="text"
                value={renameTarget.newName}
                onChange={(e) => setRenameTarget({...renameTarget, newName: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRenameModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={() => renameTable(renameTarget.oldName)}>
            Переименовать
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Модальное окно для переименования столбца */}
      <Modal show={showRenameColumnModal} onHide={() => setShowRenameColumnModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Переименовать столбец</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Таблица</Form.Label>
              <Form.Control
                type="text"
                value={renameColumnTarget.table}
                readOnly
                disabled
              />
            </Form.Group>
            <Form.Group className="mt-3">
              <Form.Label>Старое имя</Form.Label>
              <Form.Control
                type="text"
                value={renameColumnTarget.oldName}
                readOnly
                disabled
              />
            </Form.Group>
            <Form.Group className="mt-3">
              <Form.Label>Новое имя</Form.Label>
              <Form.Control
                type="text"
                value={renameColumnTarget.newName}
                onChange={(e) => setRenameColumnTarget({...renameColumnTarget, newName: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRenameColumnModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={renameColumn}>
            Переименовать
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
