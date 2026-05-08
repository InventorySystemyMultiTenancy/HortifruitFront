import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

const AppContext = createContext(null);

const STORAGE_KEYS = {
  token: "hortifruit_token",
  user: "hortifruit_user",
};

const defaultDashboard = {
  report: null,
  shops: [],
  costs: [],
  closes: [],
  products: [],
  plantations: [],
  stockMovements: [],
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.user);
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(
    () => localStorage.getItem(STORAGE_KEYS.token) || "",
  );
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedShopId, setSelectedShopId] = useState("all");
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportFilters, setReportFilters] = useState(() => ({
    month: new Date().toISOString().slice(0, 7),
    startDate: "",
    endDate: "",
    shopId: "all",
  }));

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.token, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.token);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "WORKER" && user.shopId) {
      setSelectedShopId(user.shopId);
      setReportFilters((current) => ({ ...current, shopId: user.shopId }));
    }
  }, [user]);

  async function bootstrap() {
    if (!token || !user) return;

    setLoading(true);
    setError("");
    try {
      const [
        shops,
        costs,
        closes,
        products,
        plantations,
        stockMovements,
        report,
      ] = await Promise.all([
        api.get("/shops"),
        api.get("/costs"),
        api.get("/daily-closes"),
        api.get("/products"),
        api.get("/plantations"),
        api.get("/stock-movements"),
        api.get(
          `/reports?month=${reportFilters.month}${selectedShopId && selectedShopId !== "all" ? `&shopId=${selectedShopId}` : ""}`,
        ),
      ]);

      setDashboard({
        shops,
        costs,
        closes,
        products,
        plantations,
        stockMovements,
        report,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  async function login(credentials) {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/login", credentials);
      setToken(response.token);
      setUser(response.user);
      setActiveView("dashboard");
      return response;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    setDashboard(defaultDashboard);
    setSelectedShopId("all");
    setActiveView("dashboard");
  }

  async function refreshDashboard(nextFilters = reportFilters) {
    if (!user) return;

    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (
        user.role === "ADMIN" &&
        nextFilters.shopId &&
        nextFilters.shopId !== "all"
      ) {
        query.set("shopId", nextFilters.shopId);
      }
      if (nextFilters.month) {
        query.set("month", nextFilters.month);
      } else {
        if (nextFilters.startDate)
          query.set("startDate", nextFilters.startDate);
        if (nextFilters.endDate) query.set("endDate", nextFilters.endDate);
      }

      const [
        shops,
        costs,
        closes,
        products,
        plantations,
        stockMovements,
        report,
      ] = await Promise.all([
        api.get("/shops"),
        api.get("/costs"),
        api.get("/daily-closes"),
        api.get("/products"),
        api.get("/plantations"),
        api.get("/stock-movements"),
        api.get(`/reports?${query.toString()}`),
      ]);

      setDashboard({
        shops,
        costs,
        closes,
        products,
        plantations,
        stockMovements,
        report,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function createShop(payload) {
    await api.post("/shops", {
      ...payload,
      companyId: user.companyId,
    });
    await refreshDashboard();
  }

  async function deleteShop(id) {
    await api.del(`/shops/${id}`);
    await refreshDashboard();
  }

  async function createCost(payload) {
    await api.post("/costs", {
      ...payload,
      companyId: user.companyId,
    });
    await refreshDashboard();
  }

  async function deleteCost(id) {
    await api.del(`/costs/${id}`);
    await refreshDashboard();
  }

  async function createProduct(payload) {
    await api.post("/products", payload);
    await refreshDashboard();
  }

  async function deleteProduct(id) {
    await api.del(`/products/${id}`);
    await refreshDashboard();
  }

  async function createPlantation(payload) {
    await api.post("/plantations", {
      ...payload,
      companyId: user.companyId,
    });
    await refreshDashboard();
  }

  async function deletePlantation(id) {
    await api.del(`/plantations/${id}`);
    await refreshDashboard();
  }

  async function createStockMovement(payload) {
    await api.post("/stock-movements", {
      ...payload,
      companyId: user.role === "ADMIN" ? user.companyId : undefined,
      shopId: user.role === "ADMIN" ? payload.shopId : user.shopId,
    });
    await refreshDashboard();
  }

  async function deleteStockMovement(id) {
    await api.del(`/stock-movements/${id}`);
    await refreshDashboard();
  }

  async function saveDailyClose(payload) {
    const body = {
      ...payload,
      companyId: user.role === "ADMIN" ? user.companyId : undefined,
      shopId: user.role === "ADMIN" ? payload.shopId : user.shopId,
    };

    const response = payload.id
      ? await api.patch(`/daily-closes/${payload.id}`, body)
      : await api.post("/daily-closes", body);

    await refreshDashboard();
    return response;
  }

  async function loadReport(nextFilters = reportFilters) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (
        user?.role === "ADMIN" &&
        nextFilters.shopId &&
        nextFilters.shopId !== "all"
      ) {
        query.set("shopId", nextFilters.shopId);
      }
      if (nextFilters.month) {
        query.set("month", nextFilters.month);
      } else {
        if (nextFilters.startDate)
          query.set("startDate", nextFilters.startDate);
        if (nextFilters.endDate) query.set("endDate", nextFilters.endDate);
      }

      const report = await api.get(`/reports?${query.toString()}`);
      setDashboard((current) => ({ ...current, report }));
      return report;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo(
    () => ({
      user,
      token,
      activeView,
      setActiveView,
      selectedShopId,
      setSelectedShopId,
      reportFilters,
      setReportFilters,
      dashboard,
      shops: dashboard.shops,
      products: dashboard.products,
      plantations: dashboard.plantations,
      stockMovements: dashboard.stockMovements,
      loading,
      error,
      login,
      logout,
      refreshDashboard,
      loadReport,
      createShop,
      createCost,
      createProduct,
      createPlantation,
      createStockMovement,
      deleteShop,
      deleteCost,
      deleteProduct,
      deletePlantation,
      deleteStockMovement,
      saveDailyClose,
    }),
    [
      activeView,
      dashboard,
      error,
      loading,
      reportFilters,
      selectedShopId,
      token,
      user,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }

  return context;
}
