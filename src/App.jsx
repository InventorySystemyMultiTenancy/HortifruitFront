import { AnimatePresence, motion } from "framer-motion";
import {
  Apple,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Building2,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  PlusCircle,
  ScanBarcode,
  Store,
  Truck,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DailyCloseForm from "./components/DailyCloseForm.jsx";
import ReportPanel from "./components/ReportPanel.jsx";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import { formatCurrency, formatDateTime } from "./lib/date.js";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const sidebarItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "shops", label: "Lojas", icon: Store },
  { key: "products", label: "Produtos", icon: Apple },
  { key: "plantations", label: "Plantações", icon: Leaf },
  { key: "stock", label: "Movimentações", icon: Truck },
  { key: "daily-close", label: "Fechamento Diário", icon: ScanBarcode },
  { key: "financial", label: "Financeiro", icon: BadgeDollarSign },
  { key: "reports", label: "Relatórios", icon: BarChart3 },
];

function AuthScreen() {
  const { login, loading, error } = useApp();
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    await login(form);
  }

  return (
    <div className="auth-shell">
      <motion.section
        className="auth-card card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="brand-lockup">
          <div className="brand-mark auth-brand-mark">
            <img src="/image.png" alt="Logo Hortifruit" />
          </div>
          <div>
            <span className="eyebrow">Hortifruit InfraSyncTech</span>
            <h1>
              Gestão operacional para hortifruti com ritmo de balcão e visão de
              diretoria.
            </h1>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="admin@hortifruit.com"
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="******"
            />
          </label>

          {error ? <div className="feedback error">{error}</div> : null}

          <button
            className="action-button primary auth-button"
            type="submit"
            disabled={loading}
          >
            Entrar no sistema
          </button>
        </form>
      </motion.section>
    </div>
  );
}

function Sidebar() {
  const { activeView, setActiveView, logout, user } = useApp();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark compact">
          <img src="/image.png" alt="Logo Hortifruit" />
        </div>
        <div>
          <strong>Hortifruit</strong>
          <p>
            {user?.role === "ADMIN"
              ? "Painel administrativo"
              : "Operação de loja"}
          </p>
        </div>
      </div>

      <nav className="nav-list">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              className={`nav-item ${activeView === item.key ? "active" : ""}`}
              type="button"
              onClick={() => setActiveView(item.key)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        className="action-button secondary logout-button"
        type="button"
        onClick={logout}
      >
        <LogOut size={16} />
        Sair
      </button>
    </aside>
  );
}

function Topbar() {
  const {
    user,
    dashboard,
    selectedShopId,
    setSelectedShopId,
    refreshDashboard,
    reportFilters,
    setReportFilters,
  } = useApp();

  const shopOptions = dashboard.shops || [];

  useEffect(() => {
    if (selectedShopId === "all" && user?.role !== "ADMIN" && user?.shopId) {
      setSelectedShopId(user.shopId);
    }
  }, [selectedShopId, setSelectedShopId, user]);

  return (
    <header className="topbar card">
      <div>
        <span className="eyebrow">Bem-vindo</span>
        <h2>{user?.name}</h2>
        <p>{formatDateTime(new Date())}</p>
      </div>

      <div className="topbar-actions">
        {user?.role === "ADMIN" ? (
          <label className="field inline">
            <span>Loja</span>
            <select
              value={selectedShopId}
              onChange={async (event) => {
                setSelectedShopId(event.target.value);
                const nextFilters = {
                  ...reportFilters,
                  shopId: event.target.value,
                };
                setReportFilters(nextFilters);
                await refreshDashboard(nextFilters);
              }}
            >
              <option value="all">Consolidado</option>
              {shopOptions.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="pill success">
          <Users size={16} />
          <span>{user?.role}</span>
        </div>
      </div>
    </header>
  );
}

function DashboardSection() {
  const { user, dashboard } = useApp();
  const report = dashboard.report;
  const chartData = useMemo(
    () =>
      report
        ? [
            {
              label: "Período",
              faturamento: Number(report.grossRevenue || 0),
              gastos: Number(report.costs?.total || 0),
            },
          ]
        : [],
    [report],
  );

  return (
    <motion.section
      className="stack"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid metrics-grid">
        <div className="card metric-card positive">
          <span>Faturamento bruto</span>
          <strong>{formatCurrency(report?.grossRevenue)}</strong>
          <small>Venda consolidada no período</small>
        </div>
        <div className="card metric-card warning">
          <span>Gastos totais</span>
          <strong>{formatCurrency(report?.costs?.total)}</strong>
          <small>Custos rateados + variáveis + plantação</small>
        </div>
        <div className="card metric-card">
          <span>Saldo líquido</span>
          <strong>{formatCurrency(report?.netResult)}</strong>
          <small>Receita menos despesas totais</small>
        </div>
      </div>

      {user?.role === "ADMIN" ? (
        <div className="grid two-columns dashboard-grid">
          <motion.div className="card chart-card" whileHover={{ y: -2 }}>
            <div className="card-header">
              <div>
                <span className="eyebrow">Admin</span>
                <h3>Faturamento vs gastos</h3>
              </div>
              <BarChart3 size={18} />
            </div>

            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(27,67,50,0.12)"
                  />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar
                    dataKey="faturamento"
                    fill="#1B4332"
                    radius={[12, 12, 0, 0]}
                  />
                  <Bar
                    dataKey="gastos"
                    fill="#FFB703"
                    radius={[12, 12, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <div className="stack">
            <div className="card">
              <div className="card-header">
                <div>
                  <span className="eyebrow">Ativos</span>
                  <h3>Lojas e funcionários</h3>
                </div>
                <Building2 size={18} />
              </div>
              <div className="summary-list compact">
                <div>
                  <span>Lojas cadastradas</span>
                  <strong>{dashboard.shops.length}</strong>
                </div>
                <div>
                  <span>Produtos</span>
                  <strong>{dashboard.products.length}</strong>
                </div>
                <div>
                  <span>Custos lançados</span>
                  <strong>{dashboard.costs.length}</strong>
                </div>
                <div>
                  <span>Fechamentos</span>
                  <strong>{dashboard.closes.length}</strong>
                </div>
              </div>
            </div>

            <div className="card quick-actions">
              <div className="card-header">
                <div>
                  <span className="eyebrow">Ações rápidas</span>
                  <h3>Operação do dia</h3>
                </div>
                <PlusCircle size={18} />
              </div>
              <p>
                Use a navegação lateral para abrir cadastro de lojas,
                financeiro, fechamento diário e relatórios.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card worker-hero">
          <span className="eyebrow">Fluxo simplificado</span>
          <h3>Entrada rápida para fechamento diário</h3>
          <p>
            O funcionário vê a operação reduzida para registrar abertura,
            reposição, perdas, vendas e confirmar o saldo.
          </p>
        </div>
      )}
    </motion.section>
  );
}

function ProductsSection() {
  const {
    products,
    createProduct,
    deleteProduct,
    deactivateAndDeleteProductPermanent,
    user,
  } = useApp();
  const [form, setForm] = useState({
    name: "",
    unit: "KG",
    suggestedPrice: "",
    sku: "",
  });

  async function handleSubmit(event) {
    event.preventDefault();
    await createProduct({
      ...form,
      suggestedPrice: Number(form.suggestedPrice || 0),
      sku: form.sku || undefined,
    });
    setForm({ name: "", unit: "KG", suggestedPrice: "", sku: "" });
  }

  return (
    <motion.section
      className="stack"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Cadastro global</span>
          <h2>Produtos</h2>
          <p>Produtos e preço sugerido por unidade para toda a empresa.</p>
        </div>
      </div>

      {user?.role === "ADMIN" ? (
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-grid four-columns">
            <label className="field">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Unidade</span>
              <select
                value={form.unit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    unit: event.target.value,
                  }))
                }
              >
                <option value="KG">KG</option>
                <option value="UNIT">Unidade</option>
              </select>
            </label>
            <label className="field">
              <span>Preço sugerido</span>
              <input
                type="number"
                step="0.01"
                value={form.suggestedPrice}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    suggestedPrice: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>SKU</span>
              <input
                value={form.sku}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sku: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <button className="action-button primary" type="submit">
            Cadastrar produto
          </button>
        </form>
      ) : null}

      <div className="grid cards-grid">
        {products.map((product) => (
          <article className="card list-card" key={product.id}>
            <div className="list-card-head">
              <div>
                <strong>{product.name}</strong>
                <p>{product.unit === "KG" ? "Quilo" : "Unidade"}</p>
              </div>
              <span
                className={`pill ${product.isActive ? "success" : "muted"}`}
              >
                {product.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="list-meta">
              <span>{formatCurrency(product.suggestedPrice)}</span>
              <span>SKU: {product.sku || "-"}</span>
            </div>
            {user?.role === "ADMIN" ? (
              <div className="list-meta">
                <button
                  className="action-button secondary"
                  type="button"
                  onClick={async () => {
                    if (
                      window.confirm(`Desativar o produto ${product.name}?`)
                    ) {
                      await deleteProduct(product.id);
                    }
                  }}
                >
                  Desativar
                </button>
                <button
                  className="action-button secondary danger"
                  type="button"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `A exclusão permanente exige desativação prévia. Deseja continuar com ${product.name}?`,
                      )
                    ) {
                      return;
                    }

                    if (
                      !window.confirm(
                        `Confirma EXCLUSÃO PERMANENTE do produto ${product.name}? Essa ação não pode ser desfeita.`,
                      )
                    ) {
                      return;
                    }

                    await deactivateAndDeleteProductPermanent(product.id);
                  }}
                >
                  <Trash2 size={16} />
                  Excluir permanente
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </motion.section>
  );
}

function PlantationsSection() {
  const {
    plantations,
    createPlantation,
    deletePlantation,
    deactivateAndDeletePlantationPermanent,
    user,
  } = useApp();
  const [form, setForm] = useState({ name: "", location: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    await createPlantation(form);
    setForm({ name: "", location: "" });
  }

  return (
    <motion.section
      className="stack"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Origem de produção</span>
          <h2>Plantações</h2>
          <p>Cadastro das origens para rastrear remessas para lojas.</p>
        </div>
      </div>

      {user?.role === "ADMIN" ? (
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-grid two-columns">
            <label className="field">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Localização</span>
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <button className="action-button primary" type="submit">
            Cadastrar plantação
          </button>
        </form>
      ) : null}

      <div className="grid cards-grid">
        {plantations.map((plantation) => (
          <article className="card list-card" key={plantation.id}>
            <div className="list-card-head">
              <div>
                <strong>{plantation.name}</strong>
                <p>{plantation.location || "Sem localização"}</p>
              </div>
              <span
                className={`pill ${plantation.isActive ? "success" : "muted"}`}
              >
                {plantation.isActive ? "Ativa" : "Inativa"}
              </span>
            </div>
            {user?.role === "ADMIN" ? (
              <div className="list-meta">
                <button
                  className="action-button secondary"
                  type="button"
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Desativar a plantação ${plantation.name}?`,
                      )
                    ) {
                      await deletePlantation(plantation.id);
                    }
                  }}
                >
                  Desativar
                </button>
                <button
                  className="action-button secondary danger"
                  type="button"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `A exclusão permanente exige desativação prévia. Deseja continuar com ${plantation.name}?`,
                      )
                    ) {
                      return;
                    }

                    if (
                      !window.confirm(
                        `Confirma EXCLUSÃO PERMANENTE da plantação ${plantation.name}? Essa ação não pode ser desfeita.`,
                      )
                    ) {
                      return;
                    }

                    await deactivateAndDeletePlantationPermanent(plantation.id);
                  }}
                >
                  <Trash2 size={16} />
                  Excluir permanente
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </motion.section>
  );
}

function StockSection() {
  const {
    stockMovements,
    products,
    dashboard,
    createStockMovement,
    deleteStockMovement,
    user,
  } = useApp();
  const [form, setForm] = useState({
    productId: "",
    plantationId: "",
    shopId: "",
    quantity: "",
    unitCost: "",
    movementDate: "",
    notes: "",
  });

  async function handleSubmit(event) {
    event.preventDefault();
    await createStockMovement({
      ...form,
      plantationId: form.plantationId || undefined,
      shopId: user?.role === "ADMIN" ? form.shopId || undefined : undefined,
      quantity: Number(form.quantity || 0),
      unitCost: form.unitCost ? Number(form.unitCost) : undefined,
      movementDate: form.movementDate || undefined,
      notes: form.notes || undefined,
    });

    setForm({
      productId: "",
      plantationId: "",
      shopId: "",
      quantity: "",
      unitCost: "",
      movementDate: "",
      notes: "",
    });
  }

  return (
    <motion.section
      className="stack"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Logística</span>
          <h2>Movimentações de estoque</h2>
          <p>
            Registro de remessas da plantação para lojas e controle de custo
            unitário.
          </p>
        </div>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid five-columns">
          <label className="field">
            <span>Produto</span>
            <select
              value={form.productId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  productId: event.target.value,
                }))
              }
            >
              <option value="">Selecione</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Plantação</span>
            <select
              value={form.plantationId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  plantationId: event.target.value,
                }))
              }
            >
              <option value="">Não informar</option>
              {dashboard.plantations.map((plantation) => (
                <option key={plantation.id} value={plantation.id}>
                  {plantation.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Loja</span>
            <select
              value={user?.role === "ADMIN" ? form.shopId : user?.shopId || ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  shopId: event.target.value,
                }))
              }
              disabled={user?.role !== "ADMIN"}
            >
              <option value="">Selecione</option>
              {dashboard.shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Quantidade</span>
            <input
              type="number"
              step="0.001"
              value={form.quantity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  quantity: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>Custo unitário</span>
            <input
              type="number"
              step="0.01"
              value={form.unitCost}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  unitCost: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <div className="form-grid two-columns">
          <label className="field">
            <span>Data da movimentação</span>
            <input
              type="date"
              value={form.movementDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  movementDate: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>Observações</span>
            <input
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <button className="action-button primary" type="submit">
          <Boxes size={16} />
          Registrar movimentação
        </button>
      </form>

      <div className="grid cards-grid">
        {stockMovements.map((movement) => (
          <article className="card list-card" key={movement.id}>
            <div className="list-card-head">
              <div>
                <strong>{movement.product?.name || "Produto"}</strong>
                <p>{movement.shop?.name || "Sem loja"}</p>
              </div>
              <span className="pill success">
                {Number(movement.quantity).toFixed(3)}
              </span>
            </div>
            <div className="list-meta">
              <span>Plantação: {movement.plantation?.name || "-"}</span>
              <span>
                Custo:{" "}
                {movement.unitCost ? formatCurrency(movement.unitCost) : "-"}
              </span>
            </div>
            {user?.role === "ADMIN" ? (
              <button
                className="action-button secondary danger"
                type="button"
                onClick={async () => {
                  if (window.confirm("Excluir esta movimentação de estoque?")) {
                    await deleteStockMovement(movement.id);
                  }
                }}
              >
                <Trash2 size={16} />
                Excluir
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </motion.section>
  );
}

function ShopsSection() {
  const {
    dashboard,
    createShop,
    deleteShop,
    deactivateAndDeleteShopPermanent,
    user,
  } = useApp();
  const [form, setForm] = useState({ name: "", code: "", city: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    await createShop(form);
    setForm({ name: "", code: "", city: "" });
  }

  return (
    <motion.section
      className="stack"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Gestão de lojas</span>
          <h2>Unidades físicas</h2>
          <p>Cadastro e listagem das lojas da empresa.</p>
        </div>
      </div>

      {user?.role === "ADMIN" ? (
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-grid three-columns">
            <label className="field">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Código</span>
              <input
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Cidade</span>
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <button className="action-button primary" type="submit">
            Cadastrar loja
          </button>
        </form>
      ) : null}

      <div className="grid cards-grid">
        {dashboard.shops.map((shop) => (
          <motion.article
            className="card list-card"
            key={shop.id}
            whileHover={{ y: -3 }}
          >
            <div className="list-card-head">
              <div>
                <strong>{shop.name}</strong>
                <p>{shop.city || "Sem cidade cadastrada"}</p>
              </div>
              <span className={`pill ${shop.isActive ? "success" : "muted"}`}>
                {shop.isActive ? "Ativa" : "Inativa"}
              </span>
            </div>
            <div className="list-meta">
              <span>Código: {shop.code || "-"}</span>
              <span>Criada em: {formatDateTime(shop.createdAt)}</span>
            </div>
            {user?.role === "ADMIN" ? (
              <div className="list-meta">
                <button
                  className="action-button secondary"
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Desativar a loja ${shop.name}?`)) {
                      await deleteShop(shop.id);
                    }
                  }}
                >
                  Desativar
                </button>
                <button
                  className="action-button secondary danger"
                  type="button"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `A exclusão permanente exige desativação prévia. Deseja continuar com ${shop.name}?`,
                      )
                    ) {
                      return;
                    }

                    if (
                      !window.confirm(
                        `Confirma EXCLUSÃO PERMANENTE da loja ${shop.name}? Essa ação não pode ser desfeita.`,
                      )
                    ) {
                      return;
                    }

                    await deactivateAndDeleteShopPermanent(shop.id);
                  }}
                >
                  <Trash2 size={16} />
                  Excluir permanente
                </button>
              </div>
            ) : null}
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

function FinancialSection() {
  const {
    dashboard,
    createCost,
    deleteCost,
    deactivateAndDeleteCostPermanent,
  } = useApp();
  const [form, setForm] = useState({
    name: "",
    nature: "FIXED",
    scope: "COMPANY",
    amount: "",
    dueDate: "",
  });

  async function handleSubmit(event) {
    event.preventDefault();
    await createCost({
      ...form,
      amount: Number(form.amount || 0),
      dueDate: form.dueDate || undefined,
    });
    setForm({
      name: "",
      nature: "FIXED",
      scope: "COMPANY",
      amount: "",
      dueDate: "",
    });
  }

  return (
    <motion.section
      className="stack"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Módulo financeiro</span>
          <h2>Gastos fixos e variáveis</h2>
          <p>
            Custos fixos impactam o rateio diário e os variáveis entram direto
            no período selecionado.
          </p>
        </div>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid four-columns">
          <label className="field">
            <span>Nome</span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Aluguel, energia..."
            />
          </label>
          <label className="field">
            <span>Natureza</span>
            <select
              value={form.nature}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  nature: event.target.value,
                }))
              }
            >
              <option value="FIXED">Fixo</option>
              <option value="VARIABLE">Variável</option>
            </select>
          </label>
          <label className="field">
            <span>Escopo</span>
            <select
              value={form.scope}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scope: event.target.value,
                }))
              }
            >
              <option value="COMPANY">Empresa</option>
              <option value="SHOP">Loja</option>
              <option value="PLANTATION">Plantação</option>
            </select>
          </label>
          <label className="field">
            <span>Valor</span>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <div className="form-grid two-columns">
          <label className="field">
            <span>Vencimento</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dueDate: event.target.value,
                }))
              }
            />
          </label>
          <div className="field info-box">
            <span>Impacto</span>
            <strong>
              O relatório já exibe o rateio dos fixos por dia do período.
            </strong>
          </div>
        </div>
        <button className="action-button primary" type="submit">
          Lançar gasto
        </button>
      </form>

      <div className="grid cards-grid">
        {dashboard.costs.map((cost) => (
          <article className="card list-card" key={cost.id}>
            <div className="list-card-head">
              <div>
                <strong>{cost.name}</strong>
                <p>{cost.scope}</p>
              </div>
              <span
                className={`pill ${cost.nature === "FIXED" ? "success" : "warning"}`}
              >
                {cost.nature === "FIXED" ? "Fixo" : "Variável"}
              </span>
            </div>
            <div className="list-meta">
              <span>{formatCurrency(cost.amount)}</span>
              <span>
                {cost.dueDate
                  ? `Vencimento: ${formatDateTime(cost.dueDate)}`
                  : "Sem vencimento"}
              </span>
            </div>
            <div className="list-meta">
              <button
                className="action-button secondary"
                type="button"
                onClick={async () => {
                  if (window.confirm(`Desativar o custo ${cost.name}?`)) {
                    await deleteCost(cost.id);
                  }
                }}
              >
                Desativar
              </button>
              <button
                className="action-button secondary danger"
                type="button"
                onClick={async () => {
                  if (
                    !window.confirm(
                      `A exclusão permanente exige desativação prévia. Deseja continuar com ${cost.name}?`,
                    )
                  ) {
                    return;
                  }

                  if (
                    !window.confirm(
                      `Confirma EXCLUSÃO PERMANENTE do custo ${cost.name}? Essa ação não pode ser desfeita.`,
                    )
                  ) {
                    return;
                  }

                  await deactivateAndDeleteCostPermanent(cost.id);
                }}
              >
                <Trash2 size={16} />
                Excluir permanente
              </button>
            </div>
          </article>
        ))}
      </div>
    </motion.section>
  );
}

function DailyCloseSection() {
  const { dashboard, user } = useApp();

  return (
    <div className="stack">
      {user?.role === "WORKER" ? (
        <div className="card worker-banner">
          <span className="eyebrow">Operação do funcionário</span>
          <h2>Entrada de dados rápida e sem ruído</h2>
          <p>
            O fluxo mostra somente o necessário para confirmar o fechamento do
            dia.
          </p>
        </div>
      ) : null}
      <DailyCloseForm shops={dashboard.shops} />
    </div>
  );
}

function ReportsSection() {
  return <ReportPanel />;
}

function ContentArea() {
  const { activeView } = useApp();

  return (
    <AnimatePresence mode="wait">
      {activeView === "dashboard" ? <DashboardSection key="dashboard" /> : null}
      {activeView === "shops" ? <ShopsSection key="shops" /> : null}
      {activeView === "products" ? <ProductsSection key="products" /> : null}
      {activeView === "plantations" ? (
        <PlantationsSection key="plantations" />
      ) : null}
      {activeView === "stock" ? <StockSection key="stock" /> : null}
      {activeView === "daily-close" ? (
        <DailyCloseSection key="daily-close" />
      ) : null}
      {activeView === "financial" ? <FinancialSection key="financial" /> : null}
      {activeView === "reports" ? <ReportsSection key="reports" /> : null}
    </AnimatePresence>
  );
}

function Shell() {
  const { user, loading, error } = useApp();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        <Topbar />
        {loading ? (
          <div className="global-loading">Carregando dados do backend...</div>
        ) : null}
        {error ? <div className="global-error">{error}</div> : null}
        <ContentArea />
        <footer className="footer-note">
          <Menu size={14} />
          <span>
            {user?.role === "ADMIN"
              ? "Visão consolidada do administrador"
              : "Visão simplificada do funcionário"}
          </span>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  const { token } = useApp();

  return token ? <Shell /> : <AuthScreen />;
}

export function AppRoot() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
