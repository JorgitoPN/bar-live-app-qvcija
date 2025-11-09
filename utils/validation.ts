
export const validarEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validarTelefono = (telefono: string): boolean => {
  const regex = /^[0-9]{9}$/;
  return regex.test(telefono.replace(/\s/g, ''));
};

export const validarPassword = (password: string): { valido: boolean; mensaje?: string } => {
  if (password.length < 8) {
    return { valido: false, mensaje: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valido: false, mensaje: 'La contraseña debe contener al menos una mayúscula' };
  }
  if (!/[a-z]/.test(password)) {
    return { valido: false, mensaje: 'La contraseña debe contener al menos una minúscula' };
  }
  if (!/[0-9]/.test(password)) {
    return { valido: false, mensaje: 'La contraseña debe contener al menos un número' };
  }
  return { valido: true };
};

export const validarURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validarNombreUsuario = (nombre: string): { valido: boolean; mensaje?: string } => {
  if (nombre.length < 3) {
    return { valido: false, mensaje: 'El nombre debe tener al menos 3 caracteres' };
  }
  if (nombre.length > 30) {
    return { valido: false, mensaje: 'El nombre no puede tener más de 30 caracteres' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(nombre)) {
    return { valido: false, mensaje: 'El nombre solo puede contener letras, números y guiones bajos' };
  }
  return { valido: true };
};

export const sanitizarTexto = (texto: string): string => {
  return texto.trim().replace(/\s+/g, ' ');
};
