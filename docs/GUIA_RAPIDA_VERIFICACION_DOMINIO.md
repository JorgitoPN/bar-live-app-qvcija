
# 🚀 Guía Rápida: Verificar Dominio en Resend

## ⚡ Solución en 5 Pasos

### 1️⃣ Ir a Resend
```
https://resend.com/domains
```

### 2️⃣ Copiar Registros DNS
Busca tu dominio `barlive.app` y copia los 3 registros:
- ✉️ DKIM (autenticación)
- 🛡️ SPF (anti-spam)
- 📋 DMARC (políticas)

### 3️⃣ Ir a IONOS
```
https://www.ionos.es
→ Dominios
→ barlive.app
→ DNS
```

### 4️⃣ Añadir Registros
Añade los 3 registros TXT que copiaste de Resend

### 5️⃣ Verificar
Espera 30 minutos y verifica en Resend que aparezca:
```
✅ Domain verified
```

---

## 🎯 Ejemplo de Registros

### DKIM
```
Tipo: TXT
Nombre: resend._domainkey
Valor: [valor largo de Resend]
```

### SPF
```
Tipo: TXT
Nombre: @
Valor: v=spf1 include:amazonses.com ~all
```

### DMARC
```
Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=none;
```

---

## ✅ Cómo Saber si Funciona

1. Intenta recuperar contraseña en la app
2. Deberías recibir el correo en 1-2 minutos
3. Los logs de Supabase NO deben mostrar error 450

---

## 🆘 Si No Funciona

1. Espera 1 hora (propagación DNS)
2. Verifica registros en: https://dnschecker.org
3. Contacta soporte: soporte@barliveapp.es

---

**Tiempo estimado:** 30-60 minutos
**Dificultad:** ⭐⭐ (Media)
