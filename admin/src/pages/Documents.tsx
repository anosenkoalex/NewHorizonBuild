// admin/src/pages/Documents.tsx
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  fetchDocuments,
  createDocument,
  DocumentItem,
  FetchDocumentsParams,
  generateDocumentFromTemplate,
  signDocument as apiSignDocument,
} from '../api/documents';
import { fetchDeals, Deal } from '../api/deals';
import {
  fetchDocumentTemplates,
  createDocumentTemplate,
  DocumentTemplate,
} from '../api/documentTemplates';
import { useAuth } from '../auth/AuthContext';

const tableHeaderCell: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
};

const tableCell: React.CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
  padding: '8px 10px',
  fontSize: 13,
};

const sectionCard: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  marginBottom: 8,
  fontSize: 18,
  fontWeight: 600,
};

const helperText: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: '#6b7280',
};

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 500,
};

const DocumentsPage = () => {
  const { user } = useAuth();
  const canSign =
    !!user &&
    (user.role === 'ADMIN' ||
      user.role === 'SALES_HEAD' ||
      user.role === 'LEGAL');

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Текущие применённые фильтры (для повторной загрузки после создания и т.п.)
  const [appliedFilters, setAppliedFilters] = useState<FetchDocumentsParams>(
    {},
  );

  // Фильтры в форме
  const [filterDealId, setFilterDealId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Поля формы создания документа
  const [newDealId, setNewDealId] = useState('');
  const [newType, setNewType] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');

  // Создание документа по шаблону
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedDealForTemplate, setSelectedDealForTemplate] =
    useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  // Создание шаблона
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  // Подпись
  const [signLoadingId, setSignLoadingId] = useState<string | null>(
    null,
  );

  const loadData = async (filters?: FetchDocumentsParams) => {
    setLoading(true);
    setError(null);
    try {
      const [docsData, dealsData, templatesData] = await Promise.all([
        fetchDocuments(filters),
        fetchDeals(),
        fetchDocumentTemplates(),
      ]);
      setDocuments(docsData);
      setDeals(dealsData);
      setTemplates(templatesData);
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

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDealId || !newType || !newFileUrl) {
      alert('Заполни сделку, тип документа и ссылку на файл');
      return;
    }

    try {
      await createDocument({
        dealId: newDealId,
        type: newType,
        fileUrl: newFileUrl,
      });
      setNewType('');
      setNewFileUrl('');
      setNewDealId('');
      await loadData(appliedFilters);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при создании документа');
      }
    }
  };

  const handleFilterSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nextFilters: FetchDocumentsParams = {};
    if (filterDealId) nextFilters.dealId = filterDealId;
    if (filterType) nextFilters.type = filterType;
    if (filterClientId) nextFilters.clientId = filterClientId;
    if (filterFrom) nextFilters.from = filterFrom;
    if (filterTo) nextFilters.to = filterTo;

    setAppliedFilters(nextFilters);
    await loadData(nextFilters);
  };

  const handleResetFilters = async () => {
    setFilterDealId('');
    setFilterType('');
    setFilterClientId('');
    setFilterFrom('');
    setFilterTo('');
    setAppliedFilters({});
    await loadData();
  };

  const handleGenerateFromTemplate = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedTemplateId || !selectedDealForTemplate) {
      alert('Выбери шаблон и сделку');
      return;
    }

    try {
      setGenerateLoading(true);
      await generateDocumentFromTemplate({
        templateId: selectedTemplateId,
        dealId: selectedDealForTemplate,
      });
      setSelectedTemplateId('');
      setSelectedDealForTemplate('');
      await loadData(appliedFilters);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при генерации документа');
      }
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleCreateTemplate = async (e: FormEvent) => {
    e.preventDefault();

    if (!newTemplateName || !newTemplateType || !newTemplateContent) {
      alert('Заполни название, тип и содержимое шаблона');
      return;
    }

    try {
      await createDocumentTemplate({
        name: newTemplateName,
        type: newTemplateType,
        content: newTemplateContent,
      });
      setNewTemplateName('');
      setNewTemplateType('');
      setNewTemplateContent('');
      await loadData(appliedFilters);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при создании шаблона');
      }
    }
  };

  const handleSign = async (id: string) => {
    if (!canSign) return;
    setSignLoadingId(id);
    try {
      const updated = await apiSignDocument(id);
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === id ? updated : doc)),
      );
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при подписании документа');
      }
    } finally {
      setSignLoadingId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
  };

  // Собираем уникальных клиентов из списка сделок для фильтра
  const clientOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const deal of deals) {
      if (!deal.client) continue;
      if (!(deal.client as any).id) continue;
      const clientId = (deal.client as any).id as string;
      if (!map.has(clientId)) {
        map.set(clientId, {
          id: clientId,
          label: `${deal.client.fullName} (${deal.client.phone})`,
        });
      }
    }
    return Array.from(map.values());
  }, [deals]);

  if (loading && !documents.length && !templates.length) {
    return <div style={{ padding: 24 }}>Загрузка документов...</div>;
  }

  if (error && !documents.length && !templates.length) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            fontSize: 14,
          }}
        >
          Ошибка: {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0, marginBottom: 16 }}>Документы</h1>

      {/* Фильтры */}
      <section style={sectionCard}>
        <h2 style={sectionTitle}>Фильтры</h2>
        <form
          onSubmit={handleFilterSubmit}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 8,
          }}
        >
          <label style={{ fontSize: 14 }}>
            Сделка:
            <select
              value={filterDealId}
              onChange={(e) => setFilterDealId(e.target.value)}
              style={{ marginLeft: 8, minWidth: 220, padding: '4px 8px' }}
            >
              <option value="">Все сделки</option>
              {deals.map((deal) => {
                const unitLabel = deal.unit
                  ? `${deal.unit.number ?? '-'} (${deal.unit.type})`
                  : 'Без объекта';
                const clientLabel = deal.client
                  ? deal.client.fullName
                  : 'Без клиента';
                return (
                  <option key={deal.id} value={deal.id}>
                    {unitLabel} — {clientLabel}
                  </option>
                );
              })}
            </select>
          </label>

          <label style={{ fontSize: 14 }}>
            Клиент:
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              style={{ marginLeft: 8, minWidth: 220, padding: '4px 8px' }}
            >
              <option value="">Все клиенты</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 14 }}>
            Тип документа:
            <input
              type="text"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              placeholder="Договор, акт..."
              style={{
                marginLeft: 8,
                minWidth: 200,
                padding: '4px 8px',
              }}
            />
          </label>

          <label style={{ fontSize: 14 }}>
            C:
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={{ marginLeft: 8, padding: '4px 8px' }}
            />
          </label>

          <label style={{ fontSize: 14 }}>
            По:
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={{ marginLeft: 8, padding: '4px 8px' }}
            />
          </label>

          <div
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <button type="submit">Применить</button>
            <button type="button" onClick={handleResetFilters}>
              Сбросить
            </button>
          </div>
        </form>

        <p style={helperText}>
          Пустые поля фильтра игнорируются. Если фильтр не задан, выводятся все
          документы.
        </p>
      </section>

      {/* Создать документ по шаблону */}
      <section style={sectionCard}>
        <h2 style={sectionTitle}>Создать документ по шаблону</h2>
        <form
          onSubmit={handleGenerateFromTemplate}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}
        >
          <label style={{ fontSize: 14 }}>
            Шаблон:
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              style={{ marginLeft: 8, minWidth: 260, padding: '4px 8px' }}
            >
              <option value="">Выбери шаблон</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.type})
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 14 }}>
            Сделка:
            <select
              value={selectedDealForTemplate}
              onChange={(e) =>
                setSelectedDealForTemplate(e.target.value)
              }
              style={{ marginLeft: 8, minWidth: 260, padding: '4px 8px' }}
            >
              <option value="">Выбери сделку</option>
              {deals.map((deal) => {
                const unitLabel = deal.unit
                  ? `${deal.unit.number ?? '-'} (${deal.unit.type})`
                  : 'Без объекта';
                const clientLabel = deal.client
                  ? deal.client.fullName
                  : 'Без клиента';
                return (
                  <option key={deal.id} value={deal.id}>
                    {unitLabel} — {clientLabel}
                  </option>
                );
              })}
            </select>
          </label>

          <button type="submit" disabled={generateLoading}>
            {generateLoading ? 'Генерация...' : 'Сгенерировать'}
          </button>
        </form>
        <p style={helperText}>
          В шаблоне можно использовать плейсхолдеры, например:{' '}
          {'{{client.fullName}}'}, {'{{client.phone}}'},{' '}
          {'{{unit.number}}'}, {'{{deal.type}}'}, {'{{manager.fullName}}'} и
          т.п.
        </p>
      </section>

      {/* Шаблоны документов */}
      <section style={sectionCard}>
        <h2 style={sectionTitle}>Шаблоны документов</h2>

        <form
          onSubmit={handleCreateTemplate}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}
        >
          <label style={{ fontSize: 14 }}>
            Название:
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Договор купли-продажи"
              style={{ marginLeft: 8, minWidth: 220, padding: '4px 8px' }}
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Тип:
            <input
              type="text"
              value={newTemplateType}
              onChange={(e) => setNewTemplateType(e.target.value)}
              placeholder="CONTRACT, ACT..."
              style={{ marginLeft: 8, minWidth: 180, padding: '4px 8px' }}
            />
          </label>

          <label style={{ fontSize: 14, flex: '1 1 100%' }}>
            Содержимое шаблона:
            <textarea
              value={newTemplateContent}
              onChange={(e) => setNewTemplateContent(e.target.value)}
              placeholder="Текст с {{client.fullName}}, {{unit.number}} и т.п."
              style={{
                marginLeft: 8,
                width: '100%',
                minHeight: 120,
                marginTop: 4,
                padding: 8,
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            />
          </label>

          <button type="submit">Сохранить шаблон</button>
        </form>

        {templates.length === 0 ? (
          <p style={{ marginTop: 12 }}>Шаблонов пока нет.</p>
        ) : (
          <table
            style={{
              borderCollapse: 'collapse',
              marginTop: 12,
              minWidth: 800,
            }}
          >
            <thead>
              <tr>
                <th style={tableHeaderCell}>Дата</th>
                <th style={tableHeaderCell}>Название</th>
                <th style={tableHeaderCell}>Тип</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id}>
                  <td style={tableCell}>{formatDate(tpl.createdAt)}</td>
                  <td style={tableCell}>{tpl.name}</td>
                  <td style={tableCell}>{tpl.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Секция ручного добавления документа */}
      <section style={sectionCard}>
        <h2 style={sectionTitle}>Добавить документ</h2>
        <form
          onSubmit={handleCreateSubmit}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}
        >
          <label style={{ fontSize: 14 }}>
            Сделка:
            <select
              value={newDealId}
              onChange={(e) => setNewDealId(e.target.value)}
              style={{ marginLeft: 8, minWidth: 260, padding: '4px 8px' }}
            >
              <option value="">Выбери сделку</option>
              {deals.map((deal) => {
                const unitLabel = deal.unit
                  ? `${deal.unit.number ?? '-'} (${deal.unit.type})`
                  : 'Без объекта';
                const clientLabel = deal.client
                  ? deal.client.fullName
                  : 'Без клиента';
                return (
                  <option key={deal.id} value={deal.id}>
                    {unitLabel} — {clientLabel}
                  </option>
                );
              })}
            </select>
          </label>

          <label style={{ fontSize: 14 }}>
            Тип документа:
            <input
              type="text"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Договор, акт, доп.соглашение..."
              style={{
                marginLeft: 8,
                minWidth: 220,
                padding: '4px 8px',
              }}
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Ссылка на файл:
            <input
              type="text"
              value={newFileUrl}
              onChange={(e) => setNewFileUrl(e.target.value)}
              placeholder="https://..."
              style={{
                marginLeft: 8,
                minWidth: 260,
                padding: '4px 8px',
              }}
            />
          </label>

          <button type="submit">Сохранить</button>
        </form>
        <p style={helperText}>
          Пока что храним только ссылку. Позже можно будет подвезти реальную
          загрузку файлов (локальное хранилище или S3/облако).
        </p>
      </section>

      {/* Список документов */}
      <section style={sectionCard}>
        <h2 style={sectionTitle}>Список документов</h2>
        {documents.length === 0 ? (
          <p style={{ fontSize: 14 }}>Документов пока нет.</p>
        ) : (
          <table
            style={{
              borderCollapse: 'collapse',
              marginTop: 8,
              minWidth: 900,
            }}
          >
            <thead>
              <tr>
                <th style={tableHeaderCell}>Дата</th>
                <th style={tableHeaderCell}>Тип</th>
                <th style={tableHeaderCell}>Сделка</th>
                <th style={tableHeaderCell}>Клиент</th>
                <th style={tableHeaderCell}>Объект</th>
                <th style={tableHeaderCell}>Файл</th>
                <th style={tableHeaderCell}>Подпись</th>
                <th style={tableHeaderCell}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const deal = doc.deal;
                const unitLabel = deal.unit
                  ? `${deal.unit.number ?? '-'} (${deal.unit.type})`
                  : '-';
                const clientLabel = deal.client
                  ? `${deal.client.fullName} (${deal.client.phone})`
                  : '-';
                const signed = !!doc.signedAt;

                return (
                  <tr key={doc.id}>
                    <td style={tableCell}>{formatDate(doc.createdAt)}</td>
                    <td style={tableCell}>
                      <span
                        style={{
                          ...badge,
                          backgroundColor: '#eef2ff',
                          color: '#4338ca',
                        }}
                      >
                        {doc.type}
                      </span>
                    </td>
                    <td style={tableCell}>
                      <div style={{ fontSize: 12, color: '#111827' }}>
                        <span style={{ fontWeight: 500 }}>#{deal.id}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#6b7280',
                          marginTop: 2,
                        }}
                      >
                        {deal.type} · {deal.status}
                      </div>
                    </td>
                    <td style={tableCell}>{clientLabel}</td>
                    <td style={tableCell}>{unitLabel}</td>
                    <td style={tableCell}>
                      {doc.fileUrl ? (
                        <a
                          href={doc.fileUrl ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 13 }}
                        >
                          Открыть
                        </a>
                      ) : (
                        <span style={{ opacity: 0.6 }}>Нет файла</span>
                      )}
                    </td>
                    <td style={tableCell}>
                      {signed ? (
                        <div>
                          <div
                            style={{
                              ...badge,
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              marginBottom: 2,
                            }}
                          >
                            Подписан
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#4b5563',
                              marginTop: 2,
                            }}
                          >
                            {doc.signedBy
                              ? doc.signedBy.fullName
                              : 'Подписант не указан'}
                          </div>
                          {doc.signedAt && (
                            <div
                              style={{
                                fontSize: 11,
                                color: '#6b7280',
                                marginTop: 2,
                              }}
                            >
                              {formatDate(doc.signedAt)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.7 }}>Не подписан</span>
                      )}
                    </td>
                    <td style={tableCell}>
                      {signed || !canSign ? (
                        <span style={{ opacity: 0.5 }}>—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSign(doc.id)}
                          disabled={signLoadingId === doc.id}
                        >
                          {signLoadingId === doc.id
                            ? 'Подписываю...'
                            : 'Подписать'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default DocumentsPage;
