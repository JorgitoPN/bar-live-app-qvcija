
export const formatearFecha = (fecha: string): string => {
  const date = new Date(fecha);
  const ahora = new Date();
  const diff = ahora.getTime() - date.getTime();
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos}m`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias}d`;
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export const formatearNumero = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatearPrecio = (precio: number): string => {
  return `${precio.toFixed(2)}€`;
};

export const formatearDistancia = (distancia: number): string => {
  if (distancia < 1) {
    return `${Math.round(distancia * 1000)}m`;
  }
  return `${distancia.toFixed(1)}km`;
};

export const formatearHora = (fecha: string): string => {
  const date = new Date(fecha);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export const formatearFechaCompleta = (fecha: string): string => {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const calcularDiasRestantes = (fecha: string): number => {
  const hoy = new Date();
  const fechaEvento = new Date(fecha);
  const diff = fechaEvento.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const calcularPorcentaje = (valor: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((valor / total) * 100);
};
