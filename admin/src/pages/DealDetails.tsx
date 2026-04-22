import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  fetchPaymentsByDeal,
  createPayment,
  updatePayment,
  Payment,
  PaymentStatus,
} from '../api/payments';
import {
  fetchDocuments,
  DocumentItem,
} from '../api/documents';
import {
  Deal,
  DealComment,
  DealStatus,
  DealStatusHistoryItem,
  DealType,
  createDealComment,
  fetchDealById,
  fetchDealComments,
  fetchDealStatusHistory,
  updateDealStatus,
} from '../api/deals';

type TimelineEvent = {
  key: string;
  title: string;
  subtitle: string;
  occurredAt: string;
  color: string;
};

const formatDateTime = (iso: string) => {
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

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU');
};

const formatMoney = (value?: number | string | null) => {
  if (value == null || value === '') return '—';

  const num =
    typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(num)) {
    return String(value);
  }

  return `${num.toLocaleString('ru-RU', {
    maximumFractionDigits: 0,
  })} сом`;
};

const typeLabel: Record<DealType, string> = {
  SALE: 'Продажа',
  INSTALLMENT: 'Рассрочка',
  EQUITY: 'Долевое участие',
};

const statusLabel: Record<DealStatus, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активна',
  COMPLETED: 'Завершена',
  CANCELED: 'Отменена',
};

const statusColor: Record<DealStatus, string> = {
  DRAFT: '#6b7280',
  ACTIVE: '#3b82f6',
  COMPLETED: '#16a34a',
  CANCELED: '#ef4444',
};

const paymentStatusLabel: Record<PaymentStatus, string> = {
  PLANNED: 'Запланирован',
  PAID: 'Оплачен',
  OVERDUE: 'Просрочен',
};

const paymentStatusColors: Record<
  PaymentStatus,
  { bg: string; text: string }
> = {
  PLANNED: { bg: 'rgba(59,130,246,0.12)', text: '#1d4ed8' },
  PAID: { bg: 'rgba(22,163,74,0.12)', text: '#166534' },
  OVERDUE: { bg: 'rgba(248,113,113,0.16)', text: '#b91c1c' },
};

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
  marginBottom: 10,
};

const fieldRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 6,
  fontSize: 13,
};

const fieldLabel: React.CSSProperties = {
  opacity: 0.75,
  minWidth: 140,
};

const fieldValue: React.CSSProperties = {
  fontWeight: 500,
  textAlign: 'right',
  flex: 1,
};

const pillInput: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 999,
  border: '1px solid var(--nh-border-subtle)',
  backgroundColor: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  outline: 'none',
};

const smallPrimaryBtn: React.CSSProperties = {
  borderRadius: 999,
  border: 'none',
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  background: 'var(--nh-accent)',
  color: '#f9fafb',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid var(--nh-border-subtle)',
  backgroundColor: 'var(--nh-bg-elevated)',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  cursor: 'pointer',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 84,
  padding: '10px 12px',
  borderRadius: 14,
  border: '1px solid var(--nh-border-subtle)',
  backgroundColor: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
};

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--nh-text-muted)',
};

const commentCardStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.22)',
  background: 'rgba(15,23,42,0.12)',
};

const DealDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as
    | { deal?: Deal; dealId?: string }
    | undefined;

  const initialDeal =
    state?.deal && state.deal.id === id ? state.deal : null;

  const [deal, setDeal] = useState<Deal | null>(initialDeal);
  const [dealLoading, setDealLoading] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] =
    useState<DealStatus>('DRAFT');
  const [statusChangeComment, setStatusChangeComment] = useState('');
  const [updatingDealStatus, setUpdatingDealStatus] =
    useState(false);

  const [statusHistory, setStatusHistory] = useState<
    DealStatusHistoryItem[]
  >(initialDeal?.statusHistory ?? []);
  const [statusHistoryLoading, setStatusHistoryLoading] =
    useState(false);
  const [statusHistoryError, setStatusHistoryError] =
    useState<string | null>(null);

  const [comments, setComments] = useState<DealComment[]>(
    initialDeal?.comments ?? [],
  );
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [creatingComment, setCreatingComment] = useState(false);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentComment, setNewPaymentComment] = useState('');
  const [creatingPayment, setCreatingPayment] = useState(false);

  const [updatingPaymentId, setUpdatingPaymentId] =
    useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  useEffect(() => {
    if (state?.deal && state.deal.id === id) {
      setDeal(state.deal);
      setComments(state.deal.comments ?? []);
      setStatusHistory(state.deal.statusHistory ?? []);
    }
  }, [id, state?.deal]);

  useEffect(() => {
    if (!deal?.status) return;
    setSelectedStatus(deal.status);
  }, [deal?.status]);

  const loadDeal = useCallback(async () => {
    if (!id) return;

    setDealLoading(true);
    setDealError(null);

    try {
      const data = await fetchDealById(id);
      setDeal(data);
      if (data.comments) {
        setComments(data.comments);
      }
      if (data.statusHistory) {
        setStatusHistory(data.statusHistory);
      }
    } catch (err) {
      if (err instanceof Error) {
        setDealError(err.message);
      } else {
        setDealError('Не удалось загрузить карточку сделки');
      }
    } finally {
      setDealLoading(false);
    }
  }, [id]);

  const loadPayments = useCallback(async (dealId: string) => {
    setPaymentsLoading(true);
    setPaymentsError(null);

    try {
      const data = await fetchPaymentsByDeal(dealId);
      setPayments(data);
    } catch (err) {
      if (err instanceof Error) {
        setPaymentsError(err.message);
      } else {
        setPaymentsError('Не удалось загрузить платежи');
      }
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async (dealId: string) => {
    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      const data = await fetchDocuments({ dealId });
      setDocuments(data);
    } catch (err) {
      if (err instanceof Error) {
        setDocumentsError(err.message);
      } else {
        setDocumentsError('Не удалось загрузить документы');
      }
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  const loadStatusHistory = useCallback(async (dealId: string) => {
    setStatusHistoryLoading(true);
    setStatusHistoryError(null);

    try {
      const data = await fetchDealStatusHistory(dealId);
      setStatusHistory(data);
    } catch (err) {
      if (err instanceof Error) {
        setStatusHistoryError(err.message);
      } else {
        setStatusHistoryError(
          'Не удалось загрузить историю статусов',
        );
      }
    } finally {
      setStatusHistoryLoading(false);
    }
  }, []);

  const loadComments = useCallback(async (dealId: string) => {
    setCommentsLoading(true);
    setCommentsError(null);

    try {
      const data = await fetchDealComments(dealId);
      setComments(data);
    } catch (err) {
      if (err instanceof Error) {
        setCommentsError(err.message);
      } else {
        setCommentsError('Не удалось загрузить комментарии');
      }
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (deal || !id) return;
    void loadDeal();
  }, [deal, id, loadDeal]);

  useEffect(() => {
    if (!deal?.id) return;
    void loadPayments(deal.id);
    void loadDocuments(deal.id);
    if (!deal.statusHistory?.length) {
      void loadStatusHistory(deal.id);
    }
    if (!deal.comments?.length) {
      void loadComments(deal.id);
    }
  }, [
    deal?.comments?.length,
    deal?.id,
    deal?.statusHistory?.length,
    loadComments,
    loadDocuments,
    loadPayments,
    loadStatusHistory,
  ]);

  const paymentsSummary = useMemo(() => {
    if (!payments.length) {
      return {
        total: 0,
        paid: 0,
        remaining: 0,
        overdueCount: 0,
        nextPayment: null as Payment | null,
      };
    }

    let total = 0;
    let paid = 0;
    let overdueCount = 0;
    let nextPayment: Payment | null = null;

    for (const p of payments) {
      const amount = Number(p.amount) || 0;
      total += amount;

      if (p.status === 'PAID') {
        paid += amount;
      }

      if (p.status === 'OVERDUE') {
        overdueCount += 1;
      }

      if (p.status === 'PLANNED') {
        if (!nextPayment) {
          nextPayment = p;
        } else if (
          new Date(p.dueDate).getTime() <
          new Date(nextPayment.dueDate).getTime()
        ) {
          nextPayment = p;
        }
      }
    }

    return {
      total,
      paid,
      remaining: Math.max(total - paid, 0),
      overdueCount,
      nextPayment,
    };
  }, [payments]);

  const timelineEvents = useMemo(() => {
    if (!deal) return [];

    const events: TimelineEvent[] = [
      {
        key: `deal-created-${deal.id}`,
        title: 'Сделка создана',
        subtitle: `${formatDateTime(deal.createdAt)} · тип: ${typeLabel[deal.type]}`,
        occurredAt: deal.createdAt,
        color: '#14b8a6',
      },
    ];

    for (const item of statusHistory) {
      const fromLabel = item.fromStatus
        ? statusLabel[item.fromStatus]
        : null;
      const toLabel = statusLabel[item.toStatus];
      const author = item.changedBy?.fullName
        ? ` · ${item.changedBy.fullName}`
        : '';

      events.push({
        key: `status-history-${item.id}`,
        title: fromLabel
          ? `Статус изменён: ${fromLabel} → ${toLabel}`
          : `Статус установлен: ${toLabel}`,
        subtitle: item.comment
          ? `${formatDateTime(item.createdAt)}${author} · ${item.comment}`
          : `${formatDateTime(item.createdAt)}${author}`,
        occurredAt: item.createdAt,
        color: statusColor[item.toStatus],
      });
    }

    for (const comment of comments) {
      events.push({
        key: `comment-${comment.id}`,
        title: 'Добавлен комментарий',
        subtitle: comment.author?.fullName
          ? `${formatDateTime(comment.createdAt)} · ${comment.author.fullName} · ${comment.text}`
          : `${formatDateTime(comment.createdAt)} · ${comment.text}`,
        occurredAt: comment.createdAt,
        color: '#f59e0b',
      });
    }

    for (const payment of payments) {
      if (payment.status === 'PAID' && payment.paidAt) {
        events.push({
          key: `payment-paid-${payment.id}`,
          title: `Платёж оплачен · ${formatMoney(payment.amount)}`,
          subtitle: payment.comment
            ? `${formatDate(payment.paidAt)} · ${payment.comment}`
            : formatDate(payment.paidAt),
          occurredAt: payment.paidAt,
          color: '#16a34a',
        });
      } else if (payment.status === 'OVERDUE') {
        events.push({
          key: `payment-overdue-${payment.id}`,
          title: `Платёж просрочен · ${formatMoney(payment.amount)}`,
          subtitle: payment.comment
            ? `${formatDate(payment.dueDate)} · ${payment.comment}`
            : `Срок оплаты: ${formatDate(payment.dueDate)}`,
          occurredAt: payment.updatedAt || payment.dueDate,
          color: '#ef4444',
        });
      }
    }

    for (const doc of documents) {
      events.push({
        key: `document-created-${doc.id}`,
        title: `Создан документ · ${doc.type}`,
        subtitle: formatDateTime(doc.createdAt),
        occurredAt: doc.createdAt,
        color: '#8b5cf6',
      });

      if (doc.signedAt) {
        events.push({
          key: `document-signed-${doc.id}`,
          title: `Подписан документ · ${doc.type}`,
          subtitle: doc.signedBy?.fullName
            ? `${formatDateTime(doc.signedAt)} · ${doc.signedBy.fullName}`
            : formatDateTime(doc.signedAt),
          occurredAt: doc.signedAt,
          color: '#22c55e',
        });
      }
    }

    return events
      .filter((event) => !!event.occurredAt)
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() -
          new Date(a.occurredAt).getTime(),
      )
      .slice(0, 20);
  }, [comments, deal, documents, payments, statusHistory]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;

    if (!newPaymentDate || !newPaymentAmount) {
      alert('Заполни дату и сумму платежа');
      return;
    }

    const amount = Number(newPaymentAmount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      alert('Некорректная сумма платежа');
      return;
    }

    try {
      setCreatingPayment(true);

      const created = await createPayment({
        dealId: deal.id,
        dueDate: newPaymentDate,
        amount,
        comment: newPaymentComment || undefined,
      });

      setPayments((prev) =>
        [...prev, created].sort(
          (a, b) =>
            new Date(a.dueDate).getTime() -
            new Date(b.dueDate).getTime(),
        ),
      );

      setNewPaymentAmount('');
      setNewPaymentDate('');
      setNewPaymentComment('');
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при создании платежа');
      }
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleMarkPaymentPaid = async (payment: Payment) => {
    if (payment.status === 'PAID') return;

    try {
      setUpdatingPaymentId(payment.id);

      const updated = await updatePayment(payment.id, {
        status: 'PAID',
      });

      setPayments((prev) =>
        prev.map((p) => (p.id === payment.id ? updated : p)),
      );
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при обновлении платежа');
      }
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleDealStatusSave = async () => {
    if (!deal || selectedStatus === deal.status) return;

    try {
      setUpdatingDealStatus(true);

      const updated = await updateDealStatus(deal.id, {
        status: selectedStatus,
        comment: statusChangeComment.trim() || undefined,
      });

      setDeal((prev) => ({
        ...(prev ?? updated),
        ...updated,
        status: updated.status,
        updatedAt:
          updated.updatedAt || new Date().toISOString(),
      }));

      setStatusChangeComment('');
      await Promise.all([loadStatusHistory(deal.id), loadDeal()]);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Не удалось обновить статус сделки');
      }
      setSelectedStatus(deal.status);
    } finally {
      setUpdatingDealStatus(false);
    }
  };

  const handleCreateComment = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (!deal) return;

    const text = newCommentText.trim();
    if (!text) {
      alert('Напиши комментарий');
      return;
    }

    try {
      setCreatingComment(true);
      const created = await createDealComment(deal.id, { text });
      setComments((prev) => [created, ...prev]);
      setNewCommentText('');
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Не удалось добавить комментарий');
      }
    } finally {
      setCreatingComment(false);
    }
  };

  if (dealLoading && !deal) {
    return (
      <div style={containerStyle}>
        <header style={{ margin: '18px 0 16px' }}>
          <button
            type="button"
            onClick={() => navigate('/deals')}
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
            ← Назад к списку сделок
          </button>
          <h1
            style={{
              margin: '4px 0 4px',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Карточка сделки
          </h1>
        </header>

        <div style={cardStyle}>
          <div
            style={{
              fontSize: 14,
              marginBottom: 4,
              fontWeight: 500,
            }}
          >
            Загружаю данные сделки...
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.8,
            }}
          >
            Подтягиваю карточку по ID: {id}
          </div>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={containerStyle}>
        <header style={{ margin: '18px 0 16px' }}>
          <button
            type="button"
            onClick={() => navigate('/deals')}
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
            ← Назад к списку сделок
          </button>
          <h1
            style={{
              margin: '4px 0 4px',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Карточка сделки
          </h1>
          <div
            style={{
              fontSize: 13,
              opacity: 0.75,
              color: 'var(--nh-text-muted)',
            }}
          >
            ID сделки: {id}
          </div>
        </header>

        <div style={cardStyle}>
          <div
            style={{
              fontSize: 14,
              marginBottom: 4,
              fontWeight: 500,
            }}
          >
            Данные сделки недоступны
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.8,
              marginBottom: 10,
            }}
          >
            {dealError ||
              'Не удалось найти эту сделку. Перейдите в раздел «Сделки» и откройте карточку снова.'}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/deals')}
              style={{
                borderRadius: 999,
                border: 'none',
                background:
                  'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: '#f9fafb',
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              К списку сделок
            </button>
            {id && (
              <button
                type="button"
                onClick={() => void loadDeal()}
                style={secondaryBtn}
              >
                Повторить загрузку
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const unit = deal.unit;
  const client = deal.client;
  const manager = deal.manager;
  const hasUnsavedStatusChange = selectedStatus !== deal.status;

  return (
    <div style={containerStyle}>
      <header style={{ margin: '18px 0 16px' }}>
        <button
          type="button"
          onClick={() => navigate('/deals')}
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
          ← Назад к списку сделок
        </button>
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            opacity: 0.6,
            color: 'var(--nh-text-muted)',
          }}
        >
          Сделка
        </div>
        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          {typeLabel[deal.type]} · {unit?.number || 'Юнит'}
        </h1>
        <div
          style={{
            fontSize: 13,
            opacity: 0.8,
            color: 'var(--nh-text-muted)',
          }}
        >
          ID: {deal.id} · Создана: {formatDateTime(deal.createdAt)}
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 2fr) minmax(0, 1.25fr)',
          gap: 18,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <section style={cardStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 12,
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={sectionTitle}>Основная информация</div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  backgroundColor: statusColor[deal.status],
                  color: '#ffffff',
                }}
              >
                {statusLabel[deal.status]}
              </span>
            </div>

            <div style={fieldRow}>
              <div style={fieldLabel}>Тип сделки</div>
              <div style={fieldValue}>{typeLabel[deal.type]}</div>
            </div>

            <div style={fieldRow}>
              <div style={fieldLabel}>Статус</div>
              <div style={fieldValue}>{statusLabel[deal.status]}</div>
            </div>

            <div style={fieldRow}>
              <div style={fieldLabel}>Дата создания</div>
              <div style={fieldValue}>
                {formatDateTime(deal.createdAt)}
              </div>
            </div>

            <div style={fieldRow}>
              <div style={fieldLabel}>Сумма (стоимость юнита)</div>
              <div style={fieldValue}>{formatMoney(unit?.price)}</div>
            </div>

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop:
                  '1px dashed rgba(148,163,184,0.45)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  opacity: 0.7,
                  marginBottom: 8,
                }}
              >
                Изменение статуса сделки
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(
                      e.target.value as DealStatus,
                    )
                  }
                  style={{
                    ...pillInput,
                    maxWidth: 220,
                  }}
                >
                  <option value="DRAFT">Черновик</option>
                  <option value="ACTIVE">Активна</option>
                  <option value="COMPLETED">Завершена</option>
                  <option value="CANCELED">Отменена</option>
                </select>

                <button
                  type="button"
                  onClick={handleDealStatusSave}
                  disabled={
                    updatingDealStatus || !hasUnsavedStatusChange
                  }
                  style={{
                    ...smallPrimaryBtn,
                    opacity:
                      updatingDealStatus || !hasUnsavedStatusChange
                        ? 0.6
                        : 1,
                    cursor:
                      updatingDealStatus || !hasUnsavedStatusChange
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {updatingDealStatus
                    ? 'Сохраняю...'
                    : 'Сохранить статус'}
                </button>

                {hasUnsavedStatusChange && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus(deal.status);
                      setStatusChangeComment('');
                    }}
                    style={secondaryBtn}
                  >
                    Отменить
                  </button>
                )}
              </div>

              <div>
                <div
                  style={{
                    ...mutedText,
                    marginBottom: 4,
                  }}
                >
                  Комментарий к смене статуса
                </div>
                <textarea
                  value={statusChangeComment}
                  onChange={(e) =>
                    setStatusChangeComment(e.target.value)
                  }
                  placeholder="Например: клиент подтвердил оплату, сделка переведена в завершённые..."
                  style={{
                    ...textareaStyle,
                    minHeight: 72,
                  }}
                />
              </div>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={sectionTitle}>Объект</div>

            <div style={fieldRow}>
              <div style={fieldLabel}>Номер юнита</div>
              <div style={fieldValue}>{unit?.number || '—'}</div>
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Тип</div>
              <div style={fieldValue}>{unit?.type || '—'}</div>
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Проект</div>
              <div style={fieldValue}>
                {unit?.projectName || '—'}
              </div>
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Дом / секция / этаж</div>
              <div style={fieldValue}>
                {unit?.buildingName || '—'}
                {unit?.sectionName ? ` · ${unit.sectionName}` : ''}
                {typeof unit?.floorNumber === 'number'
                  ? ` · ${unit.floorNumber} этаж`
                  : ''}
              </div>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={sectionTitle}>Клиент</div>

            <div style={fieldRow}>
              <div style={fieldLabel}>ФИО</div>
              <div style={fieldValue}>
                {client?.fullName || '—'}
              </div>
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Телефон</div>
              <div style={fieldValue}>
                {client?.phone || '—'}
              </div>
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Email</div>
              <div style={fieldValue}>
                {client?.email || '—'}
              </div>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={sectionTitle}>Ответственный менеджер</div>

            <div style={fieldRow}>
              <div style={fieldLabel}>Имя</div>
              <div style={fieldValue}>
                {manager?.fullName || '—'}
              </div>
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Телефон</div>
              <div style={fieldValue}>
                {manager?.phone || '—'}
              </div>
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Email</div>
              <div style={fieldValue}>
                {manager?.email || '—'}
              </div>
            </div>
          </section>
        </div>

        <div>
          <section style={cardStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={sectionTitle}>Активность по сделке</div>
              {deal?.id && (
                <button
                  type="button"
                  onClick={() => {
                    void Promise.all([
                      loadStatusHistory(deal.id),
                      loadComments(deal.id),
                      loadPayments(deal.id),
                      loadDocuments(deal.id),
                      loadDeal(),
                    ]);
                  }}
                  style={secondaryBtn}
                >
                  Обновить
                </button>
              )}
            </div>

            <div
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              Таймлайн
            </div>

            {(statusHistoryLoading || commentsLoading) &&
            timelineEvents.length === 0 ? (
              <div style={{ fontSize: 13, marginBottom: 14 }}>
                Загружаю активность по сделке...
              </div>
            ) : timelineEvents.length === 0 ? (
              <div
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: '1px dashed rgba(148,163,184,0.45)',
                  fontSize: 12,
                  color: 'var(--nh-text-muted)',
                  marginBottom: 14,
                }}
              >
                По сделке пока нет событий, кроме базовой карточки.
              </div>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  marginBottom: 14,
                }}
              >
                {timelineEvents.map((event) => (
                  <li
                    key={event.key}
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginBottom: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        marginTop: 5,
                        backgroundColor: event.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 500 }}>
                        {event.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.8,
                          color: 'var(--nh-text-muted)',
                        }}
                      >
                        {event.subtitle}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {(statusHistoryError || commentsError) && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--nh-danger)',
                  marginBottom: 12,
                }}
              >
                {[statusHistoryError, commentsError]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}

            <div
              style={{
                height: 1,
                background:
                  'linear-gradient(to right, transparent, rgba(148,163,184,0.45), transparent)',
                marginBottom: 12,
              }}
            />

            <div
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                opacity: 0.7,
                marginBottom: 6,
              }}
            >
              Комментарии менеджеров
            </div>

            <form
              onSubmit={handleCreateComment}
              style={{
                marginBottom: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Оставить комментарий по сделке..."
                style={textareaStyle}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="submit"
                  disabled={creatingComment}
                  style={smallPrimaryBtn}
                >
                  {creatingComment
                    ? 'Сохраняю...'
                    : 'Добавить комментарий'}
                </button>
              </div>
            </form>

            {commentsLoading && !comments.length ? (
              <div style={{ fontSize: 13 }}>Загрузка комментариев...</div>
            ) : comments.length === 0 ? (
              <div
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: '1px dashed rgba(148,163,184,0.45)',
                  fontSize: 12,
                  color: 'var(--nh-text-muted)',
                  marginBottom: 10,
                }}
              >
                Пока нет комментариев по сделке.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {comments.map((comment) => (
                  <div key={comment.id} style={commentCardStyle}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {comment.author?.fullName || 'Пользователь'}
                      </div>
                      <div style={mutedText}>
                        {formatDateTime(comment.createdAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {comment.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <div style={sectionTitle}>Платежи по сделке</div>
              {deal?.id && (
                <button
                  type="button"
                  onClick={() => void loadPayments(deal.id)}
                  style={secondaryBtn}
                >
                  Обновить
                </button>
              )}
            </div>

            {paymentsLoading && !payments.length ? (
              <div style={{ fontSize: 13 }}>Загрузка платежей...</div>
            ) : paymentsError ? (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--nh-danger)',
                  marginBottom: 8,
                }}
              >
                {paymentsError}
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
                    gap: 10,
                    marginBottom: 10,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        opacity: 0.7,
                        marginBottom: 2,
                      }}
                    >
                      Общая сумма
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {formatMoney(paymentsSummary.total)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        opacity: 0.7,
                        marginBottom: 2,
                      }}
                    >
                      Оплачено
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {formatMoney(paymentsSummary.paid)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        opacity: 0.7,
                        marginBottom: 2,
                      }}
                    >
                      Остаток
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {formatMoney(paymentsSummary.remaining)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        opacity: 0.7,
                        marginBottom: 2,
                      }}
                    >
                      Просрочено
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {paymentsSummary.overdueCount || 0} платежей
                    </div>
                  </div>
                </div>

                {paymentsSummary.nextPayment && (
                  <div
                    style={{
                      marginBottom: 10,
                      fontSize: 12,
                      padding: 8,
                      borderRadius: 10,
                      background:
                        'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(59,130,246,0.1))',
                    }}
                  >
                    <div
                      style={{
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        fontSize: 11,
                        opacity: 0.85,
                      }}
                    >
                      Ближайший платёж
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontWeight: 600,
                      }}
                    >
                      {formatMoney(
                        paymentsSummary.nextPayment.amount,
                      )}{' '}
                      · {formatDate(paymentsSummary.nextPayment.dueDate)}
                    </div>
                  </div>
                )}

                {payments.length === 0 ? (
                  <div style={{ fontSize: 13, marginBottom: 10 }}>
                    По этой сделке пока нет платежей.
                  </div>
                ) : (
                  <div
                    style={{
                      overflowX: 'auto',
                      marginBottom: 10,
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: 520,
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--nh-text-muted)',
                              borderBottom:
                                '1px solid var(--nh-border-subtle)',
                            }}
                          >
                            Дата
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--nh-text-muted)',
                              borderBottom:
                                '1px solid var(--nh-border-subtle)',
                            }}
                          >
                            Сумма
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--nh-text-muted)',
                              borderBottom:
                                '1px solid var(--nh-border-subtle)',
                            }}
                          >
                            Комментарий
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--nh-text-muted)',
                              borderBottom:
                                '1px solid var(--nh-border-subtle)',
                            }}
                          >
                            Статус
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--nh-text-muted)',
                              borderBottom:
                                '1px solid var(--nh-border-subtle)',
                            }}
                          >
                            Действия
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => {
                          const colors =
                            paymentStatusColors[p.status];

                          return (
                            <tr key={p.id}>
                              <td
                                style={{
                                  padding: '6px 8px',
                                  fontSize: 12,
                                  borderBottom:
                                    '1px solid rgba(148,163,184,0.2)',
                                }}
                              >
                                {formatDate(p.dueDate)}
                              </td>
                              <td
                                style={{
                                  padding: '6px 8px',
                                  fontSize: 12,
                                  borderBottom:
                                    '1px solid rgba(148,163,184,0.2)',
                                }}
                              >
                                {formatMoney(p.amount)}
                              </td>
                              <td
                                style={{
                                  padding: '6px 8px',
                                  fontSize: 12,
                                  borderBottom:
                                    '1px solid rgba(148,163,184,0.2)',
                                  color: 'var(--nh-text-muted)',
                                }}
                              >
                                {p.comment || '—'}
                              </td>
                              <td
                                style={{
                                  padding: '6px 8px',
                                  fontSize: 12,
                                  borderBottom:
                                    '1px solid rgba(148,163,184,0.2)',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                  }}
                                >
                                  {paymentStatusLabel[p.status]}
                                </span>
                                {p.paidAt && (
                                  <div
                                    style={{
                                      marginTop: 2,
                                      fontSize: 11,
                                      color:
                                        'var(--nh-text-muted)',
                                    }}
                                  >
                                    {`Оплачено: ${formatDate(p.paidAt)}`}
                                  </div>
                                )}
                              </td>
                              <td
                                style={{
                                  padding: '6px 8px',
                                  fontSize: 12,
                                  borderBottom:
                                    '1px solid rgba(148,163,184,0.2)',
                                }}
                              >
                                {p.status === 'PAID' ? (
                                  <span
                                    style={{
                                      opacity: 0.6,
                                      fontSize: 11,
                                    }}
                                  >
                                    Уже оплачен
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMarkPaymentPaid(p)
                                    }
                                    disabled={
                                      updatingPaymentId === p.id
                                    }
                                    style={smallPrimaryBtn}
                                  >
                                    {updatingPaymentId === p.id
                                      ? 'Обновляю...'
                                      : 'Отметить оплаченным'}
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

                <form
                  onSubmit={handleCreatePayment}
                  style={{
                    borderTop:
                      '1px dashed rgba(148,163,184,0.5)',
                    paddingTop: 10,
                    marginTop: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      opacity: 0.7,
                    }}
                  >
                    Добавить платёж
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: '1 1 120px' }}>
                      <div
                        style={{
                          opacity: 0.7,
                          marginBottom: 2,
                        }}
                      >
                        Дата
                      </div>
                      <input
                        type="date"
                        value={newPaymentDate}
                        onChange={(e) =>
                          setNewPaymentDate(e.target.value)
                        }
                        style={pillInput}
                      />
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                      <div
                        style={{
                          opacity: 0.7,
                          marginBottom: 2,
                        }}
                      >
                        Сумма, сом
                      </div>
                      <input
                        type="number"
                        value={newPaymentAmount}
                        onChange={(e) =>
                          setNewPaymentAmount(e.target.value)
                        }
                        style={pillInput}
                      />
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        opacity: 0.7,
                        marginBottom: 2,
                      }}
                    >
                      Комментарий
                    </div>
                    <input
                      type="text"
                      value={newPaymentComment}
                      onChange={(e) =>
                        setNewPaymentComment(e.target.value)
                      }
                      placeholder="Например: аванс, 1-й взнос, финальный платеж..."
                      style={pillInput}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 8,
                    }}
                  >
                    <button
                      type="submit"
                      disabled={creatingPayment}
                      style={smallPrimaryBtn}
                    >
                      {creatingPayment
                        ? 'Сохраняю...'
                        : 'Добавить платёж'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>

          <section style={cardStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 10,
              }}
            >
              <div style={sectionTitle}>Документы по сделке</div>
              {deal?.id && (
                <button
                  type="button"
                  onClick={() => void loadDocuments(deal.id)}
                  style={secondaryBtn}
                >
                  Обновить
                </button>
              )}
            </div>

            {documentsLoading && !documents.length ? (
              <div style={{ fontSize: 13 }}>Загрузка документов...</div>
            ) : documentsError ? (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--nh-danger)',
                  marginBottom: 8,
                }}
              >
                {documentsError}
              </div>
            ) : documents.length === 0 ? (
              <div style={{ fontSize: 13 }}>
                Пока нет документов, привязанных к этой сделке.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    minWidth: 420,
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--nh-text-muted)',
                          borderBottom:
                            '1px solid var(--nh-border-subtle)',
                        }}
                      >
                        Дата
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--nh-text-muted)',
                          borderBottom:
                            '1px solid var(--nh-border-subtle)',
                        }}
                      >
                        Тип
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--nh-text-muted)',
                          borderBottom:
                            '1px solid var(--nh-border-subtle)',
                        }}
                      >
                        Файл / содержание
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--nh-text-muted)',
                          borderBottom:
                            '1px solid var(--nh-border-subtle)',
                        }}
                      >
                        Подпись
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td
                          style={{
                            padding: '6px 8px',
                            borderBottom:
                              '1px solid rgba(148,163,184,0.2)',
                          }}
                        >
                          {formatDate(doc.createdAt)}
                        </td>
                        <td
                          style={{
                            padding: '6px 8px',
                            borderBottom:
                              '1px solid rgba(148,163,184,0.2)',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 500,
                              backgroundColor:
                                'rgba(129,140,248,0.16)',
                              color: '#c7d2fe',
                            }}
                          >
                            {doc.type}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '6px 8px',
                            borderBottom:
                              '1px solid rgba(148,163,184,0.2)',
                          }}
                        >
                          {doc.fileUrl ? (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: 12,
                                color: 'var(--nh-accent)',
                                textDecoration: 'underline',
                              }}
                            >
                              Открыть файл
                            </a>
                          ) : doc.content ? (
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              {doc.content.length > 80
                                ? `${doc.content.slice(
                                    0,
                                    80,
                                  )}…`
                                : doc.content}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 12,
                                opacity: 0.7,
                              }}
                            >
                              Нет файла / текста
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '6px 8px',
                            borderBottom:
                              '1px solid rgba(148,163,184,0.2)',
                          }}
                        >
                          {doc.signedAt ? (
                            <div style={{ fontSize: 12 }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  backgroundColor: '#dcfce7',
                                  color: '#166534',
                                  marginBottom: 2,
                                }}
                              >
                                Подписан
                              </div>
                              <div>
                                {doc.signedBy
                                  ? doc.signedBy.fullName
                                  : 'Подписант не указан'}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color:
                                    'var(--nh-text-muted)',
                                }}
                              >
                                {formatDate(doc.signedAt)}
                              </div>
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: 12,
                                opacity: 0.7,
                              }}
                            >
                              Не подписан
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div
              style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/documents')}
                style={secondaryBtn}
              >
                Открыть раздел «Документы»
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DealDetails;
