import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Save,
  Store,
} from "lucide-react";
import { formatCurrency, formatDate, toInputDate } from "../lib/date.js";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../lib/api.js";

const AUDIT_MARKER = "[AUDIT_TRAIL_JSON]";

function extractUserNotes(rawNotes) {
  if (!rawNotes) return "";
  const markerIndex = rawNotes.indexOf(AUDIT_MARKER);
  if (markerIndex === -1) return rawNotes;
  return rawNotes.slice(0, markerIndex).trimEnd();
}

function formatQuantity(value) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function normalizeDecimalInput(value) {
  if (value == null) return "";
  return String(value).replace(",", ".");
}

function parseDecimal(value) {
  const normalized = normalizeDecimalInput(value);
  if (normalized === "") return 0;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

const fields = [
  {
    key: "openingAmount",
    label: "Abertura",
    hint: "Valor no caixa ao iniciar o dia",
    placeholder: "Ex: 150.00",
  },
  {
    key: "replenishment",
    label: "Reposição",
    hint: "Entrada por reposição da loja",
    placeholder: "Ex: 50.00",
  },
  {
    key: "losses",
    label: "Perdas",
    hint: "Valor perdido no dia (quebras, avarias e descartes)",
    placeholder: "Ex: 20.00",
  },
  {
    key: "sales",
    label: "Venda",
    hint: "Total vendido no PDV (entrada de caixa)",
    placeholder: "Ex: 100.00",
  },
];

const emptyRow = {
  openingAmount: "",
  replenishment: "",
  losses: "",
  sales: "",
  finalBalance: "",
  notes: "",
};

export default function DailyCloseForm({
  shops = [],
  initialClose = null,
  onCancelEdit,
  onSaved,
}) {
  const { user, products, saveDailyClose, loading } = useApp();
  const isEditMode = Boolean(initialClose?.id);
  const [shopId, setShopId] = useState(user?.shopId || shops[0]?.id || "");
  const [closeDate, setCloseDate] = useState(toInputDate(new Date()));
  const [form, setForm] = useState(emptyRow);
  const [stockRows, setStockRows] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [productEntries, setProductEntries] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role !== "ADMIN" && user?.shopId) {
      setShopId(user.shopId);
    }
  }, [user]);

  useEffect(() => {
    if (!initialClose) {
      if (user?.role !== "ADMIN" && user?.shopId) {
        setShopId(user.shopId);
      }
      setCloseDate(toInputDate(new Date()));
      setForm(emptyRow);
      return;
    }

    setShopId(initialClose.shopId || "");
    setCloseDate(toInputDate(initialClose.closeDate || new Date()));
    setForm({
      openingAmount: String(initialClose.openingAmount ?? ""),
      replenishment: String(initialClose.replenishment ?? ""),
      losses: String(initialClose.losses ?? ""),
      sales: String(initialClose.sales ?? ""),
      finalBalance: String(initialClose.finalBalance ?? ""),
      notes: extractUserNotes(initialClose.notes),
    });
  }, [initialClose, user]);

  useEffect(() => {
    if (!shopId) {
      setStockRows([]);
      setProductEntries([]);
      return;
    }

    async function loadShopStock() {
      setStockLoading(true);
      try {
        const response = await api.get(`/stock-movements/summary/${shopId}`);
        const rows = response.products || [];
        setStockRows(rows);
        setProductEntries(
          rows.map((row) => ({
            productId: row.productId,
            soldQuantity: "",
            lossQuantity: "",
            remainingQuantity: "",
          })),
        );
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setStockLoading(false);
      }
    }

    loadShopStock();
  }, [shopId]);

  useEffect(() => {
    if (!isEditMode || !initialClose?.items?.length || !stockRows.length) {
      return;
    }

    const mapByProduct = new Map();

    for (const item of initialClose.items) {
      if (!item.productId) continue;

      const current = mapByProduct.get(item.productId) || {
        soldQuantity: "",
        lossQuantity: "",
        remainingQuantity: "",
      };

      if (item.kind === "VENDA") {
        current.soldQuantity = String(item.quantity ?? "");
      }

      if (item.kind === "PERDA") {
        current.lossQuantity = String(item.quantity ?? "");
      }

      if (item.kind === "ESTOQUE_FINAL") {
        current.remainingQuantity = String(item.quantity ?? "");
      }

      mapByProduct.set(item.productId, current);
    }

    setProductEntries(
      stockRows.map((row) => ({
        productId: row.productId,
        soldQuantity: mapByProduct.get(row.productId)?.soldQuantity || "",
        lossQuantity: mapByProduct.get(row.productId)?.lossQuantity || "",
        remainingQuantity:
          mapByProduct.get(row.productId)?.remainingQuantity || "",
      })),
    );
  }, [initialClose, isEditMode, stockRows]);

  const computedBalance = useMemo(() => {
    const opening = parseDecimal(form.openingAmount);
    const replenishment = parseDecimal(form.replenishment);
    const losses = parseDecimal(form.losses);
    const sales = parseDecimal(form.sales);
    return opening + replenishment + sales - losses;
  }, [form]);

  const manualBalance =
    form.finalBalance === "" ? null : parseDecimal(form.finalBalance);
  const balanceMatches =
    manualBalance === null || Number.isNaN(manualBalance)
      ? true
      : Number(manualBalance.toFixed(2)) === Number(computedBalance.toFixed(2));
  const finalBalance = manualBalance === null ? computedBalance : manualBalance;

  const productStockIssues = useMemo(() => {
    return productEntries
      .map((entry) => {
        const product = products.find((item) => item.id === entry.productId);
        const available =
          stockForProduct(entry.productId) +
          previousOutForProduct(entry.productId);
        const sold = parseDecimal(entry.soldQuantity);
        const loss = parseDecimal(entry.lossQuantity);
        const totalOut = sold + loss;

        if (totalOut <= available) {
          return null;
        }

        return {
          productId: entry.productId,
          productName: product?.name || "Produto",
          available,
          totalOut,
          overflow: totalOut - available,
        };
      })
      .filter(Boolean);
  }, [productEntries, products, isEditMode, initialClose, stockRows]);

  const reviewSummary = useMemo(() => {
    let soldTotal = 0;
    let lossTotal = 0;
    let remainingTotal = 0;
    let touchedProducts = 0;

    for (const entry of productEntries) {
      const sold = parseDecimal(entry.soldQuantity);
      const loss = parseDecimal(entry.lossQuantity);
      const manualRemaining =
        entry.remainingQuantity === "" || entry.remainingQuantity == null
          ? null
          : parseDecimal(entry.remainingQuantity);
      const resolvedRemaining =
        manualRemaining == null ? autoRemaining(entry) : manualRemaining;

      if (sold > 0 || loss > 0 || manualRemaining != null) {
        touchedProducts += 1;
      }

      soldTotal += sold;
      lossTotal += loss;
      remainingTotal += Math.max(0, resolvedRemaining);
    }

    return {
      soldTotal,
      lossTotal,
      remainingTotal,
      touchedProducts,
      balanceDelta:
        manualBalance === null
          ? 0
          : Number((manualBalance - computedBalance).toFixed(2)),
    };
  }, [
    productEntries,
    stockRows,
    initialClose,
    isEditMode,
    manualBalance,
    computedBalance,
  ]);

  const firstStockIssue = productStockIssues[0] || null;
  const hasRealtimeWarnings = !balanceMatches || productStockIssues.length > 0;

  function updateField(key, value) {
    const normalizedValue =
      key === "notes" ? value : normalizeDecimalInput(value);
    setForm((current) => ({ ...current, [key]: normalizedValue }));
  }

  function updateProductEntry(productId, key, value) {
    const normalizedValue = normalizeDecimalInput(value);
    setProductEntries((current) =>
      current.map((entry) =>
        entry.productId === productId
          ? { ...entry, [key]: normalizedValue }
          : entry,
      ),
    );
  }

  function stockForProduct(productId) {
    const row = stockRows.find((item) => item.productId === productId);
    return Number(row?.quantity || 0);
  }

  function previousOutForProduct(productId) {
    if (!isEditMode || !initialClose?.items?.length) return 0;

    return initialClose.items.reduce((sum, item) => {
      if (
        item.productId !== productId ||
        (item.kind !== "VENDA" && item.kind !== "PERDA")
      ) {
        return sum;
      }

      return sum + Number(item.quantity || 0);
    }, 0);
  }

  function autoRemaining(entry) {
    const available =
      stockForProduct(entry.productId) + previousOutForProduct(entry.productId);
    const sold = parseDecimal(entry.soldQuantity);
    const loss = parseDecimal(entry.lossQuantity);
    return available - sold - loss;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatusMessage("");

    if (!shopId) {
      setError("Selecione uma loja para registrar o fechamento");
      return;
    }

    if (!balanceMatches) {
      setError("O saldo final informado não bate com a fórmula do fechamento");
      return;
    }

    if (productStockIssues.length) {
      const firstIssue = productStockIssues[0];
      setError(
        `Estoque insuficiente em ${firstIssue.productName}. Disponível: ${formatQuantity(firstIssue.available)} | Saída informada: ${formatQuantity(firstIssue.totalOut)}`,
      );
      return;
    }

    const normalizedEntries = productEntries
      .map((entry) => {
        const soldQuantity = parseDecimal(entry.soldQuantity);
        const lossQuantity = parseDecimal(entry.lossQuantity);
        const remainingQuantity =
          entry.remainingQuantity === "" || entry.remainingQuantity == null
            ? null
            : parseDecimal(entry.remainingQuantity);

        return {
          productId: entry.productId,
          soldQuantity,
          lossQuantity,
          remainingQuantity,
        };
      })
      .filter(
        (entry) =>
          entry.soldQuantity > 0 ||
          entry.lossQuantity > 0 ||
          entry.remainingQuantity != null,
      );

    try {
      const response = await saveDailyClose({
        id: initialClose?.id,
        shopId,
        closeDate,
        openingAmount: parseDecimal(form.openingAmount),
        replenishment: parseDecimal(form.replenishment),
        losses: parseDecimal(form.losses),
        sales: parseDecimal(form.sales),
        finalBalance: manualBalance === null ? undefined : manualBalance,
        notes: form.notes,
        productEntries: normalizedEntries,
      });

      setForm(emptyRow);
      setProductEntries((current) =>
        current.map((entry) => ({
          ...entry,
          soldQuantity: "",
          lossQuantity: "",
          remainingQuantity: "",
        })),
      );
      setStatusMessage(
        isEditMode
          ? "Fechamento atualizado com sucesso"
          : "Fechamento confirmado com sucesso",
      );
      onSaved?.(response);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <motion.section
      className="card form-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Fechamento Diário</span>
          <h2>{isEditMode ? "Editar fechamento" : "Entrada rápida do PDV"}</h2>
          <p>
            Preencha apenas os campos necessários. O sistema calcula o saldo
            final automaticamente se ele ficar em branco.
          </p>
        </div>
        <div className="pill success">
          <CheckCircle2 size={16} />
          <span>{formatDate(closeDate)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="daily-close-form">
        <div className="daily-guide">
          <strong>Como preencher</strong>
          <p>
            1) Preencha os valores do caixa. 2) Informe vendido/perda por
            produto. 3) Deixe "Saldo Final" e "Restante" em branco se quiser
            cálculo automático.
          </p>
        </div>

        <div className="form-grid two-columns">
          <label className="field">
            <span>Loja</span>
            <div className="input-with-icon">
              <Store size={16} />
              <select
                value={shopId}
                onChange={(event) => setShopId(event.target.value)}
                disabled={user?.role !== "ADMIN"}
              >
                <option value="">Selecione</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field">
            <span>Data de fechamento</span>
            <input
              type="date"
              value={closeDate}
              onChange={(event) => setCloseDate(event.target.value)}
            />
          </label>
        </div>

        <div className="spreadsheet-card">
          <div className="spreadsheet-header">
            <div>
              <strong>Resumo do caixa</strong>
              <p>Layout pensado para operação rápida no balcão.</p>
            </div>
            <div className={`pill ${balanceMatches ? "success" : "warning"}`}>
              <Calculator size={16} />
              <span>{formatCurrency(finalBalance)}</span>
            </div>
          </div>

          <div className="spreadsheet-table">
            {fields.map((field) => (
              <div className="spreadsheet-row" key={field.key}>
                <div>
                  <strong>{field.label}</strong>
                  <small>{field.hint}</small>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form[field.key]}
                  onChange={(event) =>
                    updateField(field.key, event.target.value)
                  }
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            <div className="spreadsheet-row highlight">
              <div>
                <strong>Saldo Final</strong>
                <small>
                  Fórmula: abertura + reposição + venda - perdas. Pode deixar em
                  branco para cálculo automático.
                </small>
              </div>
              <input
                type="number"
                step="0.01"
                value={form.finalBalance}
                onChange={(event) =>
                  updateField("finalBalance", event.target.value)
                }
                placeholder={computedBalance.toFixed(2)}
              />
            </div>
          </div>

          <label className="field notes-field">
            <span>Observações</span>
            <textarea
              rows="3"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Avarias, divergências, reforço de caixa, observações do turno"
            />
          </label>
        </div>

        <div className="spreadsheet-card">
          <div className="spreadsheet-header">
            <div>
              <strong>Fechamento por produto</strong>
              <p>
                Informe vendido e perda. Se deixar o restante em branco, o
                sistema calcula automaticamente.
              </p>
            </div>
          </div>

          {stockLoading ? (
            <p>Carregando estoque da loja...</p>
          ) : productEntries.length === 0 ? (
            <p>Sem estoque para fechamento por produto nesta loja.</p>
          ) : (
            <div className="product-close-grid">
              <div className="product-close-head">Produto</div>
              <div className="product-close-head">Disponível</div>
              <div className="product-close-head">Vendido (qtd)</div>
              <div className="product-close-head">Perda (qtd)</div>
              <div className="product-close-head">Restante (auto)</div>

              {productEntries.map((entry) => {
                const product = products.find(
                  (item) => item.id === entry.productId,
                );
                const available =
                  stockForProduct(entry.productId) +
                  previousOutForProduct(entry.productId);
                const sold = parseDecimal(entry.soldQuantity);
                const loss = parseDecimal(entry.lossQuantity);
                const totalOut = sold + loss;
                const hasStockIssue = totalOut > available;
                const computedRemaining = autoRemaining(entry);
                const safeRemaining = Math.max(0, computedRemaining);
                const remainingValue =
                  entry.remainingQuantity === ""
                    ? formatQuantity(safeRemaining)
                    : entry.remainingQuantity;

                return (
                  <div className="product-close-row" key={entry.productId}>
                    <div className="product-close-cell">
                      <strong>{product?.name || "Produto"}</strong>
                    </div>
                    <div className="product-close-cell">
                      {formatQuantity(available)} {product?.unit || ""}
                    </div>
                    <div className="product-close-cell">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max={available}
                        value={entry.soldQuantity}
                        onChange={(event) =>
                          updateProductEntry(
                            entry.productId,
                            "soldQuantity",
                            event.target.value,
                          )
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="product-close-cell">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max={available}
                        value={entry.lossQuantity}
                        onChange={(event) =>
                          updateProductEntry(
                            entry.productId,
                            "lossQuantity",
                            event.target.value,
                          )
                        }
                        placeholder="0"
                      />
                    </div>
                    <div
                      className={`product-close-cell ${hasStockIssue ? "danger" : ""}`}
                    >
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={entry.remainingQuantity}
                        onChange={(event) =>
                          updateProductEntry(
                            entry.productId,
                            "remainingQuantity",
                            event.target.value,
                          )
                        }
                        placeholder={remainingValue}
                      />
                      {hasStockIssue ? (
                        <small>Saída maior que disponível</small>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="summary-grid">
          <div className="summary-box">
            <span>Saldo calculado</span>
            <strong>{formatCurrency(computedBalance)}</strong>
          </div>
          <div className="summary-box">
            <span>Saldo informado</span>
            <strong>
              {manualBalance === null
                ? "Automático"
                : formatCurrency(manualBalance)}
            </strong>
          </div>
          <div
            className={`summary-box ${balanceMatches ? "positive" : "negative"}`}
          >
            <span>Validação</span>
            <strong>{balanceMatches ? "OK" : "Inconsistente"}</strong>
          </div>
        </div>

        <div className="close-checklist">
          <div className="close-checklist-head">
            <div>
              <strong>Conferência antes de confirmar</strong>
              <p>Resumo rápido para validar o fechamento do turno.</p>
            </div>
            <span
              className={`pill ${hasRealtimeWarnings ? "warning" : "success"}`}
            >
              {hasRealtimeWarnings
                ? "Atenção necessária"
                : "Pronto para salvar"}
            </span>
          </div>
          <div className="close-checklist-grid">
            <div className="summary-box">
              <span>Total vendido (qtd)</span>
              <strong>{formatQuantity(reviewSummary.soldTotal)}</strong>
            </div>
            <div className="summary-box">
              <span>Total perdido (qtd)</span>
              <strong>{formatQuantity(reviewSummary.lossTotal)}</strong>
            </div>
            <div className="summary-box">
              <span>Restante estimado (qtd)</span>
              <strong>{formatQuantity(reviewSummary.remainingTotal)}</strong>
            </div>
            <div className="summary-box">
              <span>Produtos lançados</span>
              <strong>{reviewSummary.touchedProducts}</strong>
            </div>
            <div
              className={`summary-box ${balanceMatches ? "positive" : "negative"}`}
            >
              <span>Diferença no saldo</span>
              <strong>{formatCurrency(reviewSummary.balanceDelta)}</strong>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {hasRealtimeWarnings ? (
            <motion.div
              className="feedback warning"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AlertTriangle size={16} />
              <span>
                {!balanceMatches
                  ? "Saldo informado diferente do saldo calculado. Ajuste ou deixe o campo em branco para cálculo automático."
                  : `Saída acima do estoque em ${firstStockIssue?.productName}. Sugestão: reduzir ${formatQuantity(firstStockIssue?.overflow || 0)} na saída.`}
              </span>
            </motion.div>
          ) : null}

          {error ? (
            <motion.div
              className="feedback error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </motion.div>
          ) : null}

          {statusMessage ? (
            <motion.div
              className="feedback success"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <CheckCircle2 size={16} />
              <span>{statusMessage}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="action-row">
          {isEditMode ? (
            <button
              className="action-button secondary"
              type="button"
              onClick={() => onCancelEdit?.()}
            >
              Cancelar edição
            </button>
          ) : null}

          <button
            className="action-button primary"
            type="submit"
            disabled={
              loading ||
              !balanceMatches ||
              stockLoading ||
              productStockIssues.length > 0
            }
          >
            <Save size={16} />
            {isEditMode ? "Salvar edição" : "Confirmar Fechamento"}
          </button>
        </div>
      </form>
    </motion.section>
  );
}
