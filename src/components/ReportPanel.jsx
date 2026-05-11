import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "../context/AppContext.jsx";
import { formatCurrency, formatDate } from "../lib/date.js";

function buildReportChart(report) {
  if (!report) return [];

  return [
    {
      name: "Consolidado",
      faturamento: Number(report.grossRevenue || 0),
      gastos: Number(report.costs?.total || 0),
    },
  ];
}

function dailyCostBreakdown(report) {
  if (!report) return [];

  return (report.costs?.daily || []).map((row) => ({
    date: formatDate(row.date),
    fixed: Number(row.fixed || 0),
    variable: Number(row.variable || 0),
    plantation: Number(row.plantation || 0),
    total: Number(row.total || 0),
  }));
}

function downloadCsv(report) {
  const rows = [
    ["Indicador", "Valor"],
    ["Faturamento Bruto", report?.grossRevenue || 0],
    ["Gastos Fixos Rateados", report?.costs?.fixedRateado || 0],
    ["Gastos Variáveis", report?.costs?.variable || 0],
    ["Custos de Plantação", report?.costs?.plantation || 0],
    ["Gastos Totais", report?.costs?.total || 0],
    ["Resultado Líquido", report?.netResult || 0],
  ];

  const csv = rows.map((row) => row.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "relatorio-hortifruit.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportPanel() {
  const {
    dashboard,
    reportFilters,
    setReportFilters,
    loadReport,
    user,
    shops,
  } = useApp();
  const [localFilters, setLocalFilters] = useState(reportFilters);

  const report = dashboard.report;
  const chartData = useMemo(() => buildReportChart(report), [report]);
  const dailyCosts = useMemo(() => dailyCostBreakdown(report), [report]);
  const averageDailyCost =
    dailyCosts.length > 0
      ? Number(report?.costs?.total || 0) / dailyCosts.length
      : 0;

  async function handleSubmit(event) {
    event.preventDefault();
    setReportFilters(localFilters);
    await loadReport(localFilters);
  }

  return (
    <motion.section
      className="stack"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Relatórios avançados</span>
          <h2>Faturamento vs gastos</h2>
          <p>
            Use filtros por período e loja. O rateio de custos fixos é exibido
            por dia do período selecionado.
          </p>
        </div>
        <div className="action-row">
          <button
            className="action-button secondary"
            type="button"
            onClick={() => downloadCsv(report)}
          >
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
          <button
            className="action-button secondary"
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      <form className="card filters-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>Período mensal</span>
          <input
            type="month"
            value={localFilters.month}
            onChange={(event) =>
              setLocalFilters((current) => ({
                ...current,
                month: event.target.value,
              }))
            }
          />
        </label>
        <label className="field">
          <span>Data inicial</span>
          <input
            type="date"
            value={localFilters.startDate}
            onChange={(event) =>
              setLocalFilters((current) => ({
                ...current,
                startDate: event.target.value,
                month: "",
              }))
            }
          />
        </label>
        <label className="field">
          <span>Data final</span>
          <input
            type="date"
            value={localFilters.endDate}
            onChange={(event) =>
              setLocalFilters((current) => ({
                ...current,
                endDate: event.target.value,
                month: "",
              }))
            }
          />
        </label>
        {user?.role === "ADMIN" ? (
          <label className="field">
            <span>Loja</span>
            <select
              value={localFilters.shopId}
              onChange={(event) =>
                setLocalFilters((current) => ({
                  ...current,
                  shopId: event.target.value,
                }))
              }
            >
              <option value="all">Todas</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button className="action-button primary" type="submit">
          <Download size={16} />
          Aplicar filtro
        </button>
      </form>

      <div className="grid metrics-grid">
        <div className="card metric-card positive">
          <span>Faturamento bruto</span>
          <strong>{formatCurrency(report?.grossRevenue)}</strong>
          <small>Receita total no período</small>
        </div>
        <div className="card metric-card warning">
          <span>Gastos totais</span>
          <strong>{formatCurrency(report?.costs?.total)}</strong>
          <small>
            Fixo: {formatCurrency(report?.costs?.fixedRateado)} | Variável:{" "}
            {formatCurrency(report?.costs?.variable)} | Plantação:{" "}
            {formatCurrency(report?.costs?.plantation)}
          </small>
        </div>
        <div className="card metric-card">
          <span>Resultado líquido</span>
          <strong>{formatCurrency(report?.netResult)}</strong>
          <small>Diferença entre faturamento e gastos</small>
        </div>
      </div>

      <div className="grid two-columns report-grid">
        <motion.div className="card chart-card" whileHover={{ y: -2 }}>
          <div className="card-header">
            <div>
              <span className="eyebrow">Dashboard Admin</span>
              <h3>Faturamento vs gastos</h3>
            </div>
            <BarChart3 size={18} />
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(27,67,50,0.12)"
                />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar
                  dataKey="faturamento"
                  fill="#1B4332"
                  radius={[12, 12, 0, 0]}
                />
                <Bar dataKey="gastos" fill="#FFB703" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="stack">
          <div className="card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Custos consolidados</span>
                <h3>Rateio por dia</h3>
              </div>
              <TrendingUp size={18} />
            </div>

            <div className="fixed-cost-highlight">
              <strong>{formatCurrency(averageDailyCost)}</strong>
              <span>Média diária de gastos no período</span>
            </div>

            <div className="fixed-cost-list">
              {dailyCosts.slice(0, 8).map((item) => (
                <div className="fixed-cost-row" key={item.date}>
                  <div>
                    <span>{item.date}</span>
                    <small>
                      Fixo: {formatCurrency(item.fixed)} | Variável:{" "}
                      {formatCurrency(item.variable)} | Plantação:{" "}
                      {formatCurrency(item.plantation)}
                    </small>
                  </div>
                  <strong>{formatCurrency(item.total)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Leitura rápida</span>
                <h3>Resumo financeiro</h3>
              </div>
              <TrendingDown size={18} />
            </div>

            <div className="summary-list">
              <div>
                <span>Fixos rateados</span>
                <strong>{formatCurrency(report?.costs?.fixedRateado)}</strong>
              </div>
              <div>
                <span>Variáveis</span>
                <strong>{formatCurrency(report?.costs?.variable)}</strong>
              </div>
              <div>
                <span>Plantação</span>
                <strong>{formatCurrency(report?.costs?.plantation)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
