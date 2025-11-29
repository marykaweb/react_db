import React, { useState, useEffect } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import TabContent from '../components/TabContent';

export default function Home() {
  const [tables, setTables] = useState([]);
  const [activeTable, setActiveTable] = useState('');

  useEffect(() => {
    fetch('http://localhost:4000/api/tables')
      .then(res => res.json())
      .then(data => {
        setTables(data);
        if (data.length > 0) setActiveTable(data[0].name);
      })
      .catch(console.error);
  }, []);

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
