import { useEffect, useState } from 'react';
import { fetchUnits, Unit } from '../api/units';

const Units = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const data = await fetchUnits();
        setUnits(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Неизвестная ошибка');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, []);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  return (
    <div>
      <h1>Список объектов (Units)</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Номер</th>
            <th>Тип</th>
            <th>Статус</th>
            <th>Площадь</th>
            <th>Цена</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id}>
              <td>{unit.id}</td>
              <td>{unit.number ?? '-'}</td>
              <td>{unit.type}</td>
              <td>{unit.status}</td>
              <td>{unit.area ?? '-'}</td>
              <td>{unit.price ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Units;
