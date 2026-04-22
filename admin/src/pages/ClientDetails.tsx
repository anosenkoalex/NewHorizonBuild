import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Client,
  ClientDetailsEntity,
  fetchClientById,
} from '../api/clients';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (value?: number | string | null) => {
  if (value == null) return '—';

  const n =
    typeof value === 'number' ? value : Number(String(value).replace(/\s/g, ''));

  if (Number.isFinite(n)) {
    return `${n.toLocaleString('ru-RU')} сом`;
  }

  return String(value);
};

const dealTypeLabel = (type?: string | null) => {
  switch (type) {
    case 'SALE':
      return 'Продажа';
    case 'INSTALLMENT':
      return 'Рассрочка';
    case 'EQUITY':
      return 'Долевое участие';
    default:
      return type || '—';
  }
};

const dealStatusLabel = (status?: string | null) => {
  switch (status) {
    case 'DRAFT':
      return 'Черновик';
    case 'ACTIVE':
      return 'Активна';
    case 'COMPLETED':
      return 'Завершена';
    case 'CANCELED':
      return 'Отменена';
    default:
      return status || '—';
  }
};

const unitTypeLabel = (type?: string | null) => {
  switch (type) {
    case 'APARTMENT':
      return 'Квартира';
    case 'COMMERCIAL':
      return 'Коммерция';
    case 'PARKING':
      return 'Паркинг';
    default:
      return type || '—';
  }
};

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { client?: Client } | undefined;
  const stateClient = state?.client;

  const [client, setClient] = useState<ClientDetailsEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerStyle: React.CSSProperties = {
    padding: '0 24px 32px',
    maxWidth: 1180,
    margin: '0 auto',
    color: 'var(--nh-text-main)',
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    background:
      'radial-gradient(circle at top left, var(--nh-accent-soft), transparent 55%), var(--nh-bg-elevated)',
    color: 'var(--nh-text-main)',
    padding: 20,
    boxShadow: '0 14px 32px rgba(15,23,42,0.35)',
    marginBottom: 18,
    border: '1px solid var(--nh-border-subtle)',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
  };

  const metricCard: React.CSSProperties = {
    borderRadius: 14,
    padding: '14px 16px',
    border: '1px solid rgba(148,163,184,0.22)',
    background: 'rgba(255,255,255,0.02)',
  };

  useEffect(() => {
    if (!id) {
      setError('Не передан ID клиента');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchClientById(id);
        setClient(data);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Не удалось загрузить клиента',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const resolvedClient = client;

  const deals = resolvedClient?.deals ?? [];

  const summary = useMemo(() => {
    const totalDeals = deals.length;
    const activeDeals = deals.filter((d) => d.status === 'ACTIVE').length;
    const completedDeals = deals.filter((d) => d.status === 'COMPLETED').length;
    const canceledDeals = deals.filter((d) => d.status === 'CANCELED').length;

    const totalPotentialRevenue = deals.reduce((sum, deal) => {
      const price = deal.unit?.price;
      const numeric =
        typeof price === 'number' ? price : Number(String(price ?? ''));
      return Number.isFinite(numeric) ? sum + numeric : sum;
    }, 0);

    return {
      totalDeals,
      activeDeals,
      completedDeals,
      canceledDeals,
      totalPotentialRevenue,
    };
  }, [deals]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ paddingTop: 20, fontSize: 14 }}>Загрузка клиента...</div>
      </div>
    );
  }

  if (error || !resolvedClient) {
    return (
      <div style={containerStyle}>
        <header style={{ margin: '18px 0 16px' }}>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            style={{
              borderRadius: 999,
              border: '1px solid var(--nh-border-subtle)',
              backgroundColor: 'var(--nh-bg-elevated)',
              color: 'var(--nh-text-main)',
              fontSize: 12,
              padding: '4px 10px',
              cursor: 'pointer',
              marginBottom: 6,
            }}
          >
            ← Назад к списку клиентов
          </button>
          <h1
            style={{
              margin: '4px 0 4px',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Карточка клиента
          </h1>
          <div
            style={{
              fontSize: 13,
              opacity: 0.75,
              color: 'var(--nh-text-muted)',
            }}
          >
            ID клиента: {id}
          </div>
        </header>

        <div style={cardStyle}>
          <div
            style={{
              fontSize: 14,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            Не удалось загрузить данные клиента
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.82,
              marginBottom: 12,
              color: 'var(--nh-text-muted)',
            }}
          >
            {error ?? 'Клиент не найден'}
          </div>

          {stateClient && (
            <div
              style={{
                fontSize: 13,
                opacity: 0.75,
                marginBottom: 12,
              }}
            >
              Есть данные из списка: <b>{stateClient.fullName}</b>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/clients')}
            style={{
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#f9fafb',
              fontSize: 13,
              fontWeight: 600,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            К списку клиентов
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header style={{ margin: '18px 0 16px' }}>
        <button
          type="button"
          onClick={() => navigate('/clients')}
          style={{
            borderRadius: 999,
            border: '1px solid var(--nh-border-subtle)',
            backgroundColor: 'var(--nh-bg-elevated)',
            color: 'var(--nh-text-main)',
            fontSize: 12,
            padding: '4px 10px',
            cursor: 'pointer',
            marginBottom: 6,
          }}
        >
          ← Назад к списку клиентов
        </button>

        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            opacity: 0.6,
            color: 'var(--nh-text-muted)',
          }}
        >
          Клиент
        </div>

        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          {resolvedClient.fullName}
        </h1>

        <div
          style={{
            fontSize: 13,
            opacity: 0.8,
            color: 'var(--nh-text-muted)',
          }}
        >
          ID: {resolvedClient.id} · Создан: {formatDate(resolvedClient.createdAt)}
        </div>
      </header>

      <section style={cardStyle}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Всего сделок
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.totalDeals}
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Активные
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.activeDeals}
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Завершённые
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.completedDeals}
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Потенциальная сумма
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {summary.totalPotentialRevenue.toLocaleString('ru-RU')} сом
            </div>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={sectionTitle}>Основная информация</div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
              ФИО
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {resolvedClient.fullName}
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
              Телефон
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {resolvedClient.phone}
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
              Email
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {resolvedClient.email ?? '—'}
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
              Дата создания
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {formatDate(resolvedClient.createdAt)}
            </div>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={sectionTitle}>Сделки клиента</div>

        {deals.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              opacity: 0.8,
              color: 'var(--nh-text-muted)',
            }}
          >
            За этим клиентом пока не закреплено ни одной сделки.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: 14,
            }}
          >
            {deals.map((deal) => (
              <div
                key={deal.id}
                style={{
                  borderRadius: 16,
                  border: '1px solid rgba(148,163,184,0.2)',
                  background: 'rgba(255,255,255,0.02)',
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Сделка {deal.id}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--nh-text-muted)',
                      }}
                    >
                      Создана: {formatDate(deal.createdAt)} · Обновлена:{' '}
                      {formatDate(deal.updatedAt)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/deals/${deal.id}`)}
                    style={{
                      borderRadius: 999,
                      border: '1px solid var(--nh-border-subtle)',
                      background: 'transparent',
                      color: 'var(--nh-text-main)',
                      fontSize: 12,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      height: 34,
                    }}
                  >
                    Открыть сделку
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={metricCard}>
                    <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
                      Тип сделки
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {dealTypeLabel(deal.type)}
                    </div>
                  </div>

                  <div style={metricCard}>
                    <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
                      Статус
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {dealStatusLabel(deal.status)}
                    </div>
                  </div>

                  <div style={metricCard}>
                    <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
                      Юнит
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {deal.unit?.number ?? '—'}
                    </div>
                  </div>

                  <div style={metricCard}>
                    <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
                      Сумма
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {formatMoney(deal.unit?.price)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={metricCard}>
                    <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
                      Тип объекта
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {unitTypeLabel(deal.unit?.type)}
                    </div>
                  </div>

                  <div style={metricCard}>
                    <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
                      Площадь
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {deal.unit?.area != null ? `${deal.unit.area} м²` : '—'}
                    </div>
                  </div>

                  <div style={metricCard}>
                    <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
                      Менеджер
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {deal.manager?.fullName ?? '—'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <div style={metricCard}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 10,
                      }}
                    >
                      Последние комментарии
                    </div>

                    {(deal.comments?.length ?? 0) === 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--nh-text-muted)',
                        }}
                      >
                        Комментариев пока нет
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {deal.comments?.map((comment) => (
                          <div
                            key={comment.id}
                            style={{
                              borderRadius: 12,
                              padding: '10px 12px',
                              background: 'rgba(148,163,184,0.08)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                marginBottom: 4,
                              }}
                            >
                              {comment.author?.fullName ?? 'Сотрудник'}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                lineHeight: 1.5,
                                marginBottom: 4,
                              }}
                            >
                              {comment.text}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              {formatDate(comment.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={metricCard}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 10,
                      }}
                    >
                      История статусов
                    </div>

                    {(deal.statusHistory?.length ?? 0) === 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--nh-text-muted)',
                        }}
                      >
                        История статусов отсутствует
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {deal.statusHistory?.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              borderRadius: 12,
                              padding: '10px 12px',
                              background: 'rgba(148,163,184,0.08)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                marginBottom: 4,
                              }}
                            >
                              {dealStatusLabel(item.fromStatus)} →{' '}
                              {dealStatusLabel(item.toStatus)}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--nh-text-muted)',
                                marginBottom: 4,
                              }}
                            >
                              {item.changedBy?.fullName ?? 'Сотрудник'}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              {formatDate(item.createdAt)}
                            </div>
                            {item.comment && (
                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 12,
                                  lineHeight: 1.45,
                                }}
                              >
                                {item.comment}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <div style={sectionTitle}>Что ещё можно добавить потом</div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--nh-text-muted)',
            lineHeight: 1.7,
          }}
        >
          Следующим этапом сюда можно добавить платежи клиента, таймлайн звонков,
          встречи, прикреплённые документы и заметки менеджеров. Сейчас карточка
          уже подтягивает реальные сделки, статусы, комментарии и менеджера.
        </div>
      </section>
    </div>
  );
};

export default ClientDetails;