export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMonthLabel(value) {
  if (!value) return "";
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = [];

  while (start <= end) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }

  return days;
}

export function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
