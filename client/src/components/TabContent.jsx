// client/src/components/TabContent.jsx
import React, { useEffect, useState } from "react";
import { Button, Modal, Form, Table } from "react-bootstrap";

export default function TabContent({ activeTab }) {
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [form, setForm] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("add");
  const [editId, setEditId] = useState(null);

  // Загружаем столбцы и данные
  useEffect(() => {
    if (!activeTab) return;

    fetch(`http://localhost:4000/api/${activeTab}/columns`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then(err => Promise.reject(err));
        }
        return res.json();
      })
      .then((cols) => {
        // фильтруем служебные поля
        const filtered = cols.filter((c) => c !== "id");
        // Преобразуем имена столбцов, заменяя подчеркивания на пробелы для отображения
        const displayColumns = filtered.map(col => col.replace(/_/g, ' '));
        setColumns(displayColumns);

        const emptyForm = {};
        filtered.forEach((c, index) => {
          const displayCol = displayColumns[index];
          emptyForm[displayCol] = "";
        });
        setForm(emptyForm);
      })
      .catch((err) => {
        console.error('Ошибка при загрузке столбцов:', err);
        alert(err.error || "Не удалось загрузить описание колонок");
      });

    fetch(`http://localhost:4000/api/${activeTab}`)
      .then((res) => res.json())
      .then(data => {
        // Преобразуем ключи в данных, заменяя подчеркивания на пробелы для соответствия отображаемым именам столбцов
        const transformedData = data.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            if (key === 'id') {
              newRow[key] = row[key];
            } else {
              const displayKey = key.replace(/_/g, ' ');
              newRow[displayKey] = row[key];
            }
          });
          return newRow;
        });
        setData(transformedData);
      })
      .catch(() => alert("Не удалось загрузить данные"));
  }, [activeTab]);

  // Обработка изменения полей формы
  const handleChange = (e) => {
    const displayColumnName = e.target.name;
    setForm({ ...form, [displayColumnName]: e.target.value });
  };

  // Добавление записи
 const handleAdd = () => {
    // Преобразуем форму, заменяя пробелы в именах столбцов на подчеркивания для отправки в базу
    const formData = {};
    Object.keys(form).forEach(key => {
      const dbColumnName = key.replace(/\s+/g, '_');
      formData[dbColumnName] = form[key];
    });

    fetch(`http://localhost:4000/api/${activeTab}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then(newRow => {
        if (newRow && newRow.id) {
          // Преобразуем ключи в новой записи, заменяя подчеркивания на пробелы для отображения
          const transformedNewRow = {};
          Object.keys(newRow).forEach(key => {
            if (key === 'id') {
              transformedNewRow[key] = newRow[key];
            } else {
              const displayKey = key.replace(/_/g, ' ');
              transformedNewRow[displayKey] = newRow[key];
            }
          });
          setData([...data, transformedNewRow]);
        }
        setShowModal(false);
      })
      .catch(() => alert("Ошибка при добавлении"));
  };

  // Редактирование
  const openEdit = (row) => {
    setEditId(row.id);
    setForm(row);
    setMode("edit");
    setShowModal(true);
  };

  const handleEdit = () => {
    // Преобразуем форму, заменяя пробелы в именах столбцов на подчеркивания для отправки в базу
    const formData = {};
    Object.keys(form).forEach(key => {
      const dbColumnName = key.replace(/\s+/g, '_');
      formData[dbColumnName] = form[key];
    });

    fetch(`http://localhost:4000/api/${activeTab}/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then(updated => {
        // Преобразуем ключи в обновленной записи, заменя подчеркивания на пробелы для отображения
        const transformedUpdated = {};
        Object.keys(updated).forEach(key => {
          if (key === 'id') {
            transformedUpdated[key] = updated[key];
          } else {
            const displayKey = key.replace(/_/g, ' ');
            transformedUpdated[displayKey] = updated[key];
          }
        });
        setData(data.map((r) => (r.id === updated.id ? transformedUpdated : r)));
        setShowModal(false);
      })
      .catch(() => alert("Ошибка при редактировании"));
  };

  // Удаление
  const handleDelete = (id) => {
    if (!window.confirm("Удалить запись?")) return;
    fetch(`http://localhost:4000/api/${activeTab}/${id}`, { method: "DELETE" })
      .then(() => setData(data.filter((r) => r.id !== id)))
      .catch(() => alert("Ошибка при удалении"));
  };

  if (columns.length === 0) {
    return <p>⚠️ В этой таблице пока нет столбцов. Добавьте их в админке.</p>;
  }

  return (
    <div>
      <Button
        className="mb-2"
        onClick={() => {
          setMode("add");
          const empty = {};
          columns.forEach((c) => (empty[c] = ""));
          setForm(empty);
          setShowModal(true);
        }}
      >
        ➕ Добавить запись
      </Button>

      <Table bordered hover>
        <thead>
          <tr>
            <th>#</th>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id}>
              <td>{idx + 1}</td>
              {columns.map((c) => (
                <td key={c}>{row[c]}</td>
              ))}
              <td>
                <Button
                  size="sm"
                  variant="warning"
                  className="me-2"
                  onClick={() => openEdit(row)}
                >
                  ✏️
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(row.id)}
                >
                  🗑️
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Модальное окно */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {mode === "add" ? "Добавить запись" : "Редактировать запись"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {columns.map((c) => (
            <Form.Group key={c} className="mb-2">
              <Form.Label>{c}</Form.Label>
              <Form.Control
                name={c}
                value={form[c] ?? ""}
                onChange={handleChange}
              />
            </Form.Group>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Отмена
          </Button>
          <Button
            variant="success"
            onClick={mode === "add" ? handleAdd : handleEdit}
          >
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
