import React, { useState, useEffect, useRef } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import TabContent from '../components/TabContent';

export default function Home() {
  const [tables, setTables] = useState([]);
  const [activeTable, setActiveTable] = useState('');
  const initialTableSet = useRef(false); // Для отслеживания, была ли уже установлена начальная таблица

  useEffect(() => {
    // Сначала проверяем сохраненное значение из localStorage
    const savedActiveTable = localStorage.getItem('activeTable');

    fetch('http://localhost:4000/api/tables')
      .then(res => res.json())
      .then(data => {
        setTables(data);

        if (data.length > 0) {
          const tableNames = data.map(t => t.name);

          // Если есть сохраненное значение и оно существует в списке таблиц, используем его
          if (savedActiveTable && tableNames.includes(savedActiveTable) && !initialTableSet.current) {
            setActiveTable(savedActiveTable);
            initialTableSet.current = true;
          } else if (!initialTableSet.current) {
            // Иначе устанавливаем первую таблицу, если начальная таблица еще не была установлена
            setActiveTable(data[0].name);
            initialTableSet.current = true;
          }
        } else {
          setActiveTable(''); // Если нет таблиц, сбрасываем активную вкладку
        }
      })
      .catch(console.error);
  }, []);

  // Сохраняем активную вкладку в localStorage при её изменении
 useEffect(() => {
    if (activeTable) {
      localStorage.setItem('activeTable', activeTable);
    }
  }, [activeTable]);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>📋 Главная страница</h3>
        <Button variant="secondary" onClick={() => window.location.href = '/admin'}>
          ⚙️ В админку
        </Button>
      </div>

      <ButtonGroup className="mb-3">
        {tables.map(t => (
          <Button
            key={t.name}
            variant={t.name === activeTable ? 'primary' : 'outline-primary'}
            onClick={() => setActiveTable(t.name)}
          >
            {t.name}
          </Button>
        ))}
      </ButtonGroup>

      {activeTable ? <TabContent activeTab={activeTable} /> : <p>Нет доступных таблиц.</p>}
    </div>
  );
}
