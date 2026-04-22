import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  updateDocumentTemplate,
  deleteDocumentTemplate,
  DocumentTemplate,
} from '../api/documentTemplates';
import { useAuth } from '../auth/AuthContext';

type DocumentTemplateRef = {
  id: string;
  name: string;
  type: string;
};

type ExtendedDocumentItem = DocumentItem & {
  content?: string | null;
  template?: DocumentTemplateRef | null;
};

const containerStyle: React.CSSProperties = {
  padding: '0 24px 32px',
  maxWidth: 1280,
  margin: '0 auto',
  color: 'var(--nh-text-main)',
};

const sectionCard: React.CSSProperties = {
  marginBottom: 18,
  padding: 18,
  borderRadius: 16,
  border: '1px solid var(--nh-border-subtle)',
  background:
    'radial-gradient(circle at top left, var(--nh-accent-soft), transparent 55%), var(--nh-bg-elevated)',
  color: 'var(--nh-text-main)',
  boxShadow: '0 14px 32px rgba(15,23,42,0.35)',
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  marginBottom: 6,
  fontSize: 18,
  fontWeight: 600,
};

const helperText: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: 'var(--nh-text-muted)',
};

const tableHeaderCell: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: 'var(--nh-bg-main)',
  borderBottom: '1px solid var(--nh-border-subtle)',
  color: 'var(--nh-text-muted)',
};

const tableCell: React.CSSProperties = {
  borderBottom: '1px solid rgba(148,163,184,0.2)',
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--nh-text-main)',
  verticalAlign: 'top',
};

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 500,
};

const inputPill: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 999,
  border: '1px solid var(--nh-border-subtle)',
  backgroundColor: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  outline: 'none',
};

const textAreaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 120,
  marginTop: 4,
  padding: 10,
  borderRadius: 12,
  border: '1px solid var(--nh-border-subtle)',
  backgroundColor: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
  fontFamily: 'inherit',
  fontSize: 13,
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 999,
  border: 'none',
  background: 'var(--nh-accent)',
  color: '#f9fafb',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid var(--nh-border-subtle)',
  background: 'transparent',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  cursor: 'pointer',
};

const tabBtnBase: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid transparent',
  fontSize: 13,
  cursor: 'pointer',
  background: 'transparent',
};

const metricCard: React.CSSProperties = {
  borderRadius: 14,
  padding: '14px 16px',
  border: '1px solid rgba(148,163,184,0.22)',
  background: 'rgba(255,255,255,0.03)',
};

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();

  const canSign =
    !!user &&
    (user.role === 'ADMIN' ||
      user.role === 'SALES_HEAD' ||
      user.role === 'LEGAL');

  const canManageTemplates =
    !!user && (user.role === 'ADMIN' || user.role === 'LEGAL');

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [appliedFilters, setAppliedFilters] =
    useState<FetchDocumentsParams>({});

  const [filterDealId, setFilterDealId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [newDealId, setNewDealId] = useState('');
  const [newType, setNewType] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newContent, setNewContent] = useState('');

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedDealForTemplate, setSelectedDealForTemplate] =
    useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateType, setEditTemplateType] = useState('');
  const [editTemplateContent, setEditTemplateContent] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateDeletingId, setTemplateDeletingId] = useState<string | null>(
    null,
  );

  const [signLoadingId, setSignLoadingId] =
    useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'generate' | 'templates' | 'manual' | 'print'
  >('overview');

  const [printDealId, setPrintDealId] = useState('');

  const getDocumentContent = (doc: DocumentItem): string | null => {
    return (doc as ExtendedDocumentItem).content ?? null;
  };

  const getDocumentTemplate = (
    doc: DocumentItem,
  ): DocumentTemplateRef | null => {
    return (doc as ExtendedDocumentItem).template ?? null;
  };

  const getDealLabel = (deal: Deal) => {
    const unitLabel = deal.unit
      ? `${deal.unit.number ?? '-'} (${deal.unit.type})`
      : 'Без объекта';
    const clientLabel = deal.client ? deal.client.fullName : 'Без клиента';

    return `${unitLabel} — ${clientLabel}`;
  };

  const loadData = useCallback(
    async (filters?: FetchDocumentsParams) => {
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
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const reloadCurrentData = useCallback(async () => {
    await loadData(appliedFilters);
  }, [appliedFilters, loadData]);

  const resetEditTemplateForm = () => {
    setEditingTemplateId(null);
    setEditTemplateName('');
    setEditTemplateType('');
    setEditTemplateContent('');
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!newDealId || !newType) {
      alert('Заполни сделку и тип документа');
      return;
    }

    if (!newFileUrl.trim() && !newContent.trim()) {
      alert('Укажи ссылку на файл или текст документа');
      return;
    }

    try {
      await createDocument({
        dealId: newDealId,
        type: newType,
        fileUrl: newFileUrl.trim() || null,
        content: newContent.trim() || null,
      });

      setNewType('');
      setNewFileUrl('');
      setNewContent('');
      setNewDealId('');

      await reloadCurrentData();
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

      await reloadCurrentData();
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

      await reloadCurrentData();
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при создании шаблона');
      }
    }
  };

  const startEditingTemplate = (tpl: DocumentTemplate) => {
    setEditingTemplateId(tpl.id);
    setEditTemplateName(tpl.name);
    setEditTemplateType(tpl.type);
    setEditTemplateContent(tpl.content);
  };

  const handleUpdateTemplate = async (e: FormEvent) => {
    e.preventDefault();

    if (!editingTemplateId) return;

    if (!editTemplateName || !editTemplateType || !editTemplateContent) {
      alert('Заполни название, тип и содержимое шаблона');
      return;
    }

    try {
      setTemplateSaving(true);

      const updated = await updateDocumentTemplate(editingTemplateId, {
        name: editTemplateName,
        type: editTemplateType,
        content: editTemplateContent,
      });

      setTemplates((prev) =>
        prev.map((tpl) => (tpl.id === updated.id ? updated : tpl)),
      );

      resetEditTemplateForm();
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при обновлении шаблона');
      }
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const ok = window.confirm(
      'Удалить этот шаблон? Если он уже используется в документах, удаление может быть запрещено.',
    );

    if (!ok) return;

    try {
      setTemplateDeletingId(id);

      await deleteDocumentTemplate(id);

      setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));

      if (editingTemplateId === id) {
        resetEditTemplateForm();
      }

      if (selectedTemplateId === id) {
        setSelectedTemplateId('');
      }
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при удалении шаблона');
      }
    } finally {
      setTemplateDeletingId(null);
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

  const formatDate = (iso?: string | null) => {
    if (!iso) return '-';

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';

    return d.toLocaleDateString('ru-RU');
  };

  const clientOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();

    for (const deal of deals) {
      if (!deal.client?.id) continue;

      const clientId = deal.client.id;
      if (!map.has(clientId)) {
        map.set(clientId, {
          id: clientId,
          label: `${deal.client.fullName} (${deal.client.phone})`,
        });
      }
    }

    return Array.from(map.values());
  }, [deals]);

  const printDeal = useMemo(
    () => deals.find((d) => d.id === printDealId) ?? null,
    [deals, printDealId],
  );

  const printDealDocs = useMemo(
    () =>
      printDealId
        ? documents.filter((doc) => doc.deal.id === printDealId)
        : [],
    [documents, printDealId],
  );

  const printDealDocsByType = useMemo(() => {
    const map = new Map<string, DocumentItem[]>();

    for (const doc of printDealDocs) {
      const key = doc.type || 'UNKNOWN';

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(doc);
    }

    return Array.from(map.entries());
  }, [printDealDocs]);

  const stats = useMemo(() => {
    const signed = documents.filter((d) => !!d.signedAt).length;
    const withTemplate = documents.filter((d) => !!getDocumentTemplate(d)).length;
    const withContent = documents.filter((d) => !!getDocumentContent(d)).length;

    return {
      total: documents.length,
      signed,
      unsigned: documents.length - signed,
      templates: templates.length,
      withTemplate,
      withContent,
    };
  }, [documents, templates]);

  const handleOpenAllPrintFiles = () => {
    if (!printDealDocs.length) return;

    printDealDocs.forEach((doc) => {
      if (doc.fileUrl) {
        try {
          window.open(doc.fileUrl, '_blank');
        } catch {
          // ignore
        }
      }
    });
  };

  if (loading && !documents.length && !templates.length) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-text-main)' }}>
        Загрузка документов...
      </div>
    );
  }

  if (error && !documents.length && !templates.length) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background:
              'linear-gradient(to right, rgba(248,113,113,0.1), rgba(248,113,113,0.02))',
            border: '1px solid rgba(248,113,113,0.4)',
            fontSize: 14,
            color: 'var(--nh-danger)',
          }}
        >
          Ошибка: {error}
        </div>
      </div>
    );
  }

  const docsCount = documents.length;

  return (
    <div style={containerStyle}>
      <header style={{ margin: '4px 0 12px' }}>
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            opacity: 0.6,
            color: 'var(--nh-text-muted)',
          }}
        >
          Юридический контур
        </div>
        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Документы
        </h1>
        <div
          style={{
            fontSize: 13,
            opacity: 0.75,
            color: 'var(--nh-text-muted)',
          }}
        >
          Реестр документов, шаблоны, генерация, подпись и подготовка набора на печать.
          Сейчас в системе: <b>{docsCount}</b> документов.
        </div>
      </header>

      <section style={sectionCard}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Всего документов
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total}</div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Подписано
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.signed}</div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Без подписи
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.unsigned}</div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Шаблонов
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.templates}</div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Текстовых документов
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.withContent}</div>
          </div>
        </div>
      </section>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          { key: 'overview', label: 'Обзор / реестр' },
          { key: 'generate', label: 'Генерация по шаблонам' },
          { key: 'templates', label: 'Шаблоны документов' },
          { key: 'manual', label: 'Ручное добавление' },
          { key: 'print', label: 'Набор на печать' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                ...tabBtnBase,
                borderColor: isActive ? 'var(--nh-accent)' : 'transparent',
                background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: isActive ? 'var(--nh-accent)' : 'var(--nh-text-muted)',
              }}
            >
              {tab.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => void reloadCurrentData()}
          style={{
            ...secondaryBtn,
            marginLeft: 'auto',
          }}
        >
          Обновить
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
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
              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                Сделка:
                <select
                  value={filterDealId}
                  onChange={(e) => setFilterDealId(e.target.value)}
                  style={{ ...inputPill, marginLeft: 6, minWidth: 220 }}
                >
                  <option value="">Все сделки</option>
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {getDealLabel(deal)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                Клиент:
                <select
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                  style={{ ...inputPill, marginLeft: 6, minWidth: 220 }}
                >
                  <option value="">Все клиенты</option>
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                Тип документа:
                <input
                  type="text"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  placeholder="Договор, акт..."
                  style={{ ...inputPill, marginLeft: 6, minWidth: 200 }}
                />
              </label>

              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                C:
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  style={{ ...inputPill, marginLeft: 6 }}
                />
              </label>

              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                По:
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  style={{ ...inputPill, marginLeft: 6 }}
                />
              </label>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="submit" style={primaryBtn}>
                  Применить
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={secondaryBtn}
                >
                  Сбросить
                </button>
              </div>
            </form>

            <p style={helperText}>
              Пустые поля игнорируются. Можно фильтровать по сделке, клиенту, типу и периоду.
            </p>
          </section>

          <section style={sectionCard}>
            <h2 style={sectionTitle}>Реестр документов</h2>

            {documents.length === 0 ? (
              <p style={{ fontSize: 14 }}>Документов пока нет.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table
                  style={{
                    borderCollapse: 'collapse',
                    minWidth: 1120,
                    width: '100%',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={tableHeaderCell}>Дата</th>
                      <th style={tableHeaderCell}>Тип</th>
                      <th style={tableHeaderCell}>Шаблон</th>
                      <th style={tableHeaderCell}>Сделка</th>
                      <th style={tableHeaderCell}>Клиент</th>
                      <th style={tableHeaderCell}>Объект</th>
                      <th style={tableHeaderCell}>Формат</th>
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
                      const content = getDocumentContent(doc);
                      const hasContent = Boolean(content);
                      const template = getDocumentTemplate(doc);

                      return (
                        <tr key={doc.id}>
                          <td style={tableCell}>{formatDate(doc.createdAt)}</td>
                          <td style={tableCell}>
                            <span
                              style={{
                                ...badge,
                                backgroundColor: 'rgba(129,140,248,0.16)',
                                color: '#c7d2fe',
                              }}
                            >
                              {doc.type}
                            </span>
                          </td>
                          <td style={tableCell}>
                            {template ? (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>
                                  {template.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--nh-text-muted)',
                                    marginTop: 2,
                                  }}
                                >
                                  {template.type}
                                </div>
                              </div>
                            ) : (
                              <span style={{ opacity: 0.7 }}>Без шаблона</span>
                            )}
                          </td>
                          <td style={tableCell}>
                            <div style={{ fontSize: 12 }}>
                              <span style={{ fontWeight: 500 }}>#{deal.id}</span>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                                marginTop: 2,
                              }}
                            >
                              {deal.type} · {deal.status}
                            </div>
                          </td>
                          <td style={tableCell}>{clientLabel}</td>
                          <td style={tableCell}>{unitLabel}</td>
                          <td style={tableCell}>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                alignItems: 'flex-start',
                              }}
                            >
                              {doc.fileUrl ? (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  style={{
                                    fontSize: 13,
                                    color: 'var(--nh-accent)',
                                    textDecoration: 'underline',
                                  }}
                                >
                                  Скачать файл
                                </a>
                              ) : (
                                <span style={{ opacity: 0.7 }}>Файла нет</span>
                              )}

                              {hasContent && (
                                <details
                                  style={{
                                    fontSize: 11,
                                    maxWidth: 320,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <summary
                                    style={{
                                      color: 'var(--nh-accent)',
                                      marginBottom: 4,
                                    }}
                                  >
                                    Просмотреть текст
                                  </summary>
                                  <div
                                    style={{
                                      maxHeight: 180,
                                      overflow: 'auto',
                                      padding: 6,
                                      borderRadius: 8,
                                      border: '1px solid rgba(148,163,184,0.45)',
                                      backgroundColor: 'rgba(15,23,42,0.45)',
                                    }}
                                    dangerouslySetInnerHTML={{
                                      __html: content ?? '',
                                    }}
                                  />
                                </details>
                              )}
                            </div>
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
                                <div style={{ fontSize: 12, marginTop: 2 }}>
                                  {doc.signedBy
                                    ? doc.signedBy.fullName
                                    : 'Подписант не указан'}
                                </div>
                                {doc.signedAt && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: 'var(--nh-text-muted)',
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
                                style={{
                                  ...primaryBtn,
                                  padding: '4px 10px',
                                  fontSize: 12,
                                }}
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
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'generate' && (
        <section style={sectionCard}>
          <h2 style={sectionTitle}>Создать документ по шаблону</h2>

          <form
            onSubmit={handleGenerateFromTemplate}
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
              Шаблон:
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{ ...inputPill, marginLeft: 6, minWidth: 260 }}
              >
                <option value="">Выбери шаблон</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.type})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
              Сделка:
              <select
                value={selectedDealForTemplate}
                onChange={(e) => setSelectedDealForTemplate(e.target.value)}
                style={{ ...inputPill, marginLeft: 6, minWidth: 260 }}
              >
                <option value="">Выбери сделку</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {getDealLabel(deal)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={generateLoading}
              style={primaryBtn}
            >
              {generateLoading ? 'Генерация...' : 'Сгенерировать документ'}
            </button>
          </form>

          <p style={helperText}>
            Работают плейсхолдеры вроде {'{{client.fullName}}'}, {'{{client.phone}}'},
            {' {{unit.number}}'}, {'{{deal.type}}'}, {'{{manager.fullName}}'}.
          </p>
        </section>
      )}

      {activeTab === 'templates' && (
        <section style={sectionCard}>
          <h2 style={sectionTitle}>Шаблоны документов</h2>

          {canManageTemplates && (
            <form
              onSubmit={handleCreateTemplate}
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginTop: 8,
                marginBottom: 14,
              }}
            >
              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                Название:
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Договор купли-продажи"
                  style={{ ...inputPill, marginLeft: 6, minWidth: 220 }}
                />
              </label>

              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                Тип:
                <input
                  type="text"
                  value={newTemplateType}
                  onChange={(e) => setNewTemplateType(e.target.value)}
                  placeholder="CONTRACT, ACT..."
                  style={{ ...inputPill, marginLeft: 6, minWidth: 180 }}
                />
              </label>

              <label
                style={{
                  fontSize: 13,
                  color: 'var(--nh-text-muted)',
                  flex: '1 1 100%',
                }}
              >
                Содержимое шаблона:
                <textarea
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  placeholder="Текст с {{client.fullName}}, {{unit.number}} и т.п."
                  style={textAreaStyle}
                />
              </label>

              <button type="submit" style={primaryBtn}>
                Сохранить шаблон
              </button>
            </form>
          )}

          {editingTemplateId && canManageTemplates && (
            <form
              onSubmit={handleUpdateTemplate}
              style={{
                marginTop: 8,
                marginBottom: 14,
                padding: 14,
                borderRadius: 14,
                border: '1px solid rgba(59,130,246,0.24)',
                background:
                  'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))',
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ width: '100%' }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Редактирование шаблона
                </div>
              </div>

              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                Название:
                <input
                  type="text"
                  value={editTemplateName}
                  onChange={(e) => setEditTemplateName(e.target.value)}
                  style={{ ...inputPill, marginLeft: 6, minWidth: 220 }}
                />
              </label>

              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                Тип:
                <input
                  type="text"
                  value={editTemplateType}
                  onChange={(e) => setEditTemplateType(e.target.value)}
                  style={{ ...inputPill, marginLeft: 6, minWidth: 180 }}
                />
              </label>

              <label
                style={{
                  fontSize: 13,
                  color: 'var(--nh-text-muted)',
                  flex: '1 1 100%',
                }}
              >
                Содержимое шаблона:
                <textarea
                  value={editTemplateContent}
                  onChange={(e) => setEditTemplateContent(e.target.value)}
                  style={textAreaStyle}
                />
              </label>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={templateSaving}
                  style={primaryBtn}
                >
                  {templateSaving ? 'Сохраняю...' : 'Сохранить изменения'}
                </button>
                <button
                  type="button"
                  onClick={resetEditTemplateForm}
                  disabled={templateSaving}
                  style={secondaryBtn}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          {!canManageTemplates && (
            <p style={helperText}>
              У тебя нет прав на создание, редактирование или удаление шаблонов.
            </p>
          )}

          {templates.length === 0 ? (
            <p style={{ marginTop: 12, fontSize: 14 }}>Шаблонов пока нет.</p>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  minWidth: 980,
                  width: '100%',
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderCell}>Дата</th>
                    <th style={tableHeaderCell}>Название</th>
                    <th style={tableHeaderCell}>Тип</th>
                    <th style={tableHeaderCell}>Содержимое</th>
                    <th style={tableHeaderCell}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td style={tableCell}>{formatDate(tpl.createdAt)}</td>
                      <td style={tableCell}>{tpl.name}</td>
                      <td style={tableCell}>{tpl.type}</td>
                      <td style={tableCell}>
                        <details
                          style={{
                            fontSize: 12,
                            maxWidth: 380,
                            cursor: 'pointer',
                          }}
                        >
                          <summary
                            style={{
                              color: 'var(--nh-accent)',
                              marginBottom: 4,
                            }}
                          >
                            Открыть содержимое
                          </summary>
                          <div
                            style={{
                              whiteSpace: 'pre-wrap',
                              maxHeight: 220,
                              overflow: 'auto',
                              padding: 8,
                              borderRadius: 8,
                              border: '1px solid rgba(148,163,184,0.45)',
                              backgroundColor: 'rgba(15,23,42,0.45)',
                            }}
                          >
                            {tpl.content}
                          </div>
                        </details>
                      </td>
                      <td style={tableCell}>
                        {canManageTemplates ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => startEditingTemplate(tpl)}
                              style={{
                                ...secondaryBtn,
                                padding: '4px 10px',
                                fontSize: 12,
                              }}
                            >
                              Изменить
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              disabled={templateDeletingId === tpl.id}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 999,
                                border: 'none',
                                background: '#ef4444',
                                color: '#fff',
                                fontSize: 12,
                                cursor:
                                  templateDeletingId === tpl.id
                                    ? 'not-allowed'
                                    : 'pointer',
                                opacity: templateDeletingId === tpl.id ? 0.7 : 1,
                              }}
                            >
                              {templateDeletingId === tpl.id
                                ? 'Удаляю...'
                                : 'Удалить'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ opacity: 0.6 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'manual' && (
        <section style={sectionCard}>
          <h2 style={sectionTitle}>Добавить документ вручную</h2>

          <form
            onSubmit={handleCreateSubmit}
            style={{
              display: 'grid',
              gap: 12,
              marginTop: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                Сделка:
                <select
                  value={newDealId}
                  onChange={(e) => setNewDealId(e.target.value)}
                  style={{ ...inputPill, marginLeft: 6, minWidth: 260 }}
                >
                  <option value="">Выбери сделку</option>
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {getDealLabel(deal)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                Тип документа:
                <input
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Договор, акт, доп.соглашение..."
                  style={{ ...inputPill, marginLeft: 6, minWidth: 220 }}
                />
              </label>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--nh-text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Ссылка на файл
                </div>
                <input
                  type="text"
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    ...inputPill,
                    width: '100%',
                    borderRadius: 12,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={helperText}>
                  Можно оставить пустым, если документ будет храниться как текст.
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--nh-text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Текст / HTML документа
                </div>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="<h1>Договор...</h1> или обычный текст"
                  style={{ ...textAreaStyle, minHeight: 140 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="submit" style={primaryBtn}>
                Сохранить документ
              </button>
            </div>
          </form>

          <p style={helperText}>
            Сейчас можно создать документ либо по ссылке на файл, либо как текстовый документ внутри CRM.
          </p>
        </section>
      )}

      {activeTab === 'print' && (
        <section style={sectionCard}>
          <h2 style={sectionTitle}>Набор документов для печати</h2>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 8,
              marginBottom: 10,
            }}
          >
            <label style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
              Сделка:
              <select
                value={printDealId}
                onChange={(e) => setPrintDealId(e.target.value)}
                style={{ ...inputPill, marginLeft: 6, minWidth: 280 }}
              >
                <option value="">Выбери сделку</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {getDealLabel(deal)}
                  </option>
                ))}
              </select>
            </label>

            {printDeal && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--nh-text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span>
                  Текущая сделка: <b>#{printDeal.id}</b> · {printDeal.type} · {printDeal.status}
                </span>
                <span>
                  Клиент: {printDeal.client ? printDeal.client.fullName : '—'}
                  {' · '}
                  Объект: {printDeal.unit ? printDeal.unit.number ?? '-' : '—'}
                </span>
              </div>
            )}
          </div>

          {!printDealId && (
            <p style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
              Выбери сделку, чтобы собрать по ней комплект документов для печати или отправки.
            </p>
          )}

          {printDealId && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 10,
                  marginTop: 6,
                }}
              >
                <div style={{ fontSize: 13, color: 'var(--nh-text-muted)' }}>
                  Документов по сделке: <b>{printDealDocs.length}</b>
                  {printDealDocsByType.length > 0 && (
                    <>
                      {' '}· типов: <b>{printDealDocsByType.length}</b>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOpenAllPrintFiles}
                  disabled={!printDealDocs.some((d) => d.fileUrl)}
                  style={{
                    ...primaryBtn,
                    padding: '6px 12px',
                    fontSize: 12,
                    opacity: printDealDocs.some((d) => d.fileUrl) ? 1 : 0.5,
                    cursor: printDealDocs.some((d) => d.fileUrl)
                      ? 'pointer'
                      : 'not-allowed',
                  }}
                >
                  Открыть все файлы
                </button>
              </div>

              {printDealDocsByType.length === 0 ? (
                <p style={{ fontSize: 14 }}>Документов по этой сделке пока нет.</p>
              ) : (
                printDealDocsByType.map(([type, docs]) => (
                  <div
                    key={type}
                    style={{
                      marginBottom: 14,
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.35)',
                      padding: 10,
                      background:
                        'linear-gradient(to right, rgba(15,23,42,0.4), rgba(15,23,42,0.2))',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            ...badge,
                            backgroundColor: 'rgba(129,140,248,0.2)',
                            color: '#c7d2fe',
                          }}
                        >
                          {type}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--nh-text-muted)',
                          }}
                        >
                          В наборе: {docs.length} шт.
                        </span>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          borderCollapse: 'collapse',
                          width: '100%',
                          minWidth: 700,
                          fontSize: 12,
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={tableHeaderCell}>Дата</th>
                            <th style={tableHeaderCell}>Шаблон</th>
                            <th style={tableHeaderCell}>Клиент</th>
                            <th style={tableHeaderCell}>Объект</th>
                            <th style={tableHeaderCell}>Файл / текст</th>
                            <th style={tableHeaderCell}>Подпись</th>
                          </tr>
                        </thead>
                        <tbody>
                          {docs.map((doc) => {
                            const deal = doc.deal;
                            const unitLabel = deal.unit
                              ? `${deal.unit.number ?? '-'} (${deal.unit.type})`
                              : '-';
                            const clientLabel = deal.client
                              ? `${deal.client.fullName} (${deal.client.phone})`
                              : '-';
                            const signed = !!doc.signedAt;
                            const content = getDocumentContent(doc);
                            const hasContent = Boolean(content);
                            const template = getDocumentTemplate(doc);

                            return (
                              <tr key={doc.id}>
                                <td style={tableCell}>{formatDate(doc.createdAt)}</td>
                                <td style={tableCell}>
                                  {template ? (
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 500 }}>
                                        {template.name}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: 'var(--nh-text-muted)',
                                        }}
                                      >
                                        {template.type}
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ opacity: 0.7 }}>Без шаблона</span>
                                  )}
                                </td>
                                <td style={tableCell}>{clientLabel}</td>
                                <td style={tableCell}>{unitLabel}</td>
                                <td style={tableCell}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 4,
                                      alignItems: 'flex-start',
                                    }}
                                  >
                                    {doc.fileUrl ? (
                                      <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        download
                                        style={{
                                          fontSize: 12,
                                          color: 'var(--nh-accent)',
                                          textDecoration: 'underline',
                                        }}
                                      >
                                        Скачать
                                      </a>
                                    ) : (
                                      <span style={{ opacity: 0.7 }}>Нет файла</span>
                                    )}

                                    {hasContent && (
                                      <details
                                        style={{
                                          fontSize: 11,
                                          maxWidth: 320,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <summary
                                          style={{
                                            color: 'var(--nh-accent)',
                                            marginBottom: 4,
                                          }}
                                        >
                                          Текст документа
                                        </summary>
                                        <div
                                          style={{
                                            maxHeight: 160,
                                            overflow: 'auto',
                                            padding: 6,
                                            borderRadius: 8,
                                            border: '1px solid rgba(148,163,184,0.45)',
                                            backgroundColor: 'rgba(15,23,42,0.45)',
                                          }}
                                          dangerouslySetInnerHTML={{
                                            __html: content ?? '',
                                          }}
                                        />
                                      </details>
                                    )}
                                  </div>
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
                                      {doc.signedBy && (
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: 'var(--nh-text-main)',
                                          }}
                                        >
                                          {doc.signedBy.fullName}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ opacity: 0.7 }}>Не подписан</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default DocumentsPage;