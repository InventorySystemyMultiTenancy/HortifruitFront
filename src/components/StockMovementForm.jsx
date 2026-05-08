import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../lib/api.js";

export default function StockMovementForm() {
  const { shops, products } = useApp();
  const [selectedShop, setSelectedShop] = useState("");
  const [shopStockItems, setShopStockItems] = useState([]);
  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    type: "venda",
    unitCost: "",
    notes: "",
  });
  const [loadingStock, setLoadingStock] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Buscar estoque quando seleciona loja
  useEffect(() => {
    if (selectedShop) {
      loadShopStock(selectedShop);
    }
  }, [selectedShop]);

  async function loadShopStock(shopId) {
    setLoadingStock(true);
    setError("");
    try {
      const response = await api.get(`/stock-movements/summary/${shopId}`);
      setShopStockItems(response.products || []);
    } catch (err) {
      console.error("Erro ao carregar estoque:", err);
      setError(err.message);
    } finally {
      setLoadingStock(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess(false);

    if (!selectedShop || !form.productId || !form.quantity) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }

    const payload = {
      productId: form.productId,
      shopId: selectedShop,
      quantity: Number(form.quantity),
      type: form.type,
      unitCost: form.unitCost ? Number(form.unitCost) : null,
      notes: form.notes,
    };
    setLoading(true);
    setError("");

    try {
      await api.post("/stock-movements/register-sale", payload);
      setSuccess(true);
      setForm({
        productId: "",
        quantity: "",
        type: "venda",
        unitCost: "",
        notes: "",
      });
      await loadShopStock(selectedShop);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao registrar movimento:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const currentBalance = shopStockItems.find(
    (item) => item.productId === form.productId,
  );

  return (
    <motion.div
      className="stack"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="form-grid">
        <label className="field">
          <span>Loja</span>
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            disabled={loading}
          >
            <option value="">Selecione uma loja...</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedShop && (
        <motion.div
          className="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3>Estoque da Loja</h3>
          {loadingStock ? (
            <p className="muted">Carregando...</p>
          ) : shopStockItems.length === 0 ? (
            <p className="muted">Nenhum produto em estoque</p>
          ) : (
            <div className="list-card">
              {shopStockItems.map((item) => (
                <div key={item.productId} className="list-card-item">
                  <div>
                    <strong>{item.productName}</strong>
                    <p className="muted">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {selectedShop && (
        <motion.form
          className="card"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3>Registrar Movimento</h3>

          {error && (
            <div className="feedback error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="feedback success">
              <CheckCircle2 size={16} />
              Movimento registrado com sucesso!
            </div>
          )}

          <div className="form-grid">
            <label className="field">
              <span>Produto</span>
              <select
                value={form.productId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    productId: e.target.value,
                  }))
                }
                disabled={loading}
              >
                <option value="">Selecione um produto...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Tipo de Movimento</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value,
                  }))
                }
              >
                <option value="venda">Venda</option>
                <option value="desperdicio">Desperdício</option>
              </select>
            </label>

            <label className="field">
              <span>Quantidade</span>
              <input
                type="number"
                step="0.001"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    quantity: e.target.value,
                  }))
                }
                placeholder="0"
              />
            </label>

            {form.type === "venda" && (
              <label className="field">
                <span>Custo Unitário (opcional)</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      unitCost: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </label>
            )}

            <label className="field full-width">
              <span>Observações</span>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    notes: e.target.value,
                  }))
                }
                placeholder="Adicionar notas..."
                rows={3}
              />
            </label>
          </div>

          {currentBalance && (
            <div className="feedback info">
              <strong>Saldo atual:</strong> {currentBalance.quantity}{" "}
              {currentBalance.unit}
            </div>
          )}

          <button
            className="action-button primary"
            type="submit"
            disabled={loading}
          >
            <Plus size={18} />
            Registrar Movimento
          </button>
        </motion.form>
      )}
    </motion.div>
  );
}
