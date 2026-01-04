import { FormEvent, useEffect, useState } from 'react';
import { fetchUnits, Unit, UnitsFilter } from '../api/units';

const Units = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UnitsFilter>({});
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');

  useEffect(() => {
    const loadUnits = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUnits(filters);
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
  }, [filters]);

  const handleApplyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({
      status: status || undefined,
      type: type || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minArea: minArea ? Number(minArea) : undefined,
      maxArea: maxArea ? Number(maxArea) : undefined,
    });
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  return (
    <div>
      <h1>Список объектов (Units)</h1>
      <form onSubmit={handleApplyFilters} style={{ marginBottom: '16px' }}>
        <div>
          <label>
            Статус:
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Все</option>
              <option value="FREE">FREE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="SOLD">SOLD</option>
              <option value="INSTALLMENT">INSTALLMENT</option>
              <option value="EQUITY">EQUITY</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Тип:
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Все</option>
              <option value="APARTMENT">APARTMENT</option>
              <option value="COMMERCIAL">COMMERCIAL</option>
              <option value="PARKING">PARKING</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Мин. цена:
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Макс. цена:
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Мин. площадь:
            <input
              type="number"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Макс. площадь:
            <input
              type="number"
              value={maxArea}
              onChange={(e) => setMaxArea(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Применить</button>
      </form>
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
