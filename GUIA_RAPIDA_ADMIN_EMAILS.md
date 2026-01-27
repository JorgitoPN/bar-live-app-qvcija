
# 🚀 GUÍA RÁPIDA PARA ADMINISTRADOR: Solución Emails

## ⚡ ACCIÓN INMEDIATA (5 minutos)

### 1. Ir a Resend
🔗 https://resend.com/domains

### 2. Copiar estos 3 registros DNS:

```
1. DKIM:
   Tipo: TXT
   Nombre: resend._domainkey.barlive.app
   Valor: [Copiar de Resend]

2. SPF:
   Tipo: TXT
   Nombre: barlive.app
   Valor: v=spf1 include:_spf.resend.com ~all

3. DMARC:
   Tipo: TXT
   Nombre: _dmarc.barlive.app
   Valor: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
```

### 3. Ir a IONOS
🔗 https://www.ionos.es/

Dominios → barlive.app → DNS → Añadir los 3 registros

### 4. Esperar 15-30 minutos

### 5. Verificar en Resend
Clic en "Verify Domain"

---

## ✅ VERIFICACIÓN RÁPIDA

```bash
# Ejecutar estos comandos:
dig TXT resend._domainkey.barlive.app
dig TXT barlive.app
dig TXT _dmarc.barlive.app
```

O usar: https://mxtoolbox.com/

---

## 🆘 SI ALGO FALLA

1. **Esperar más tiempo** (hasta 48h)
2. **Verificar que los valores sean exactos** (sin espacios extra)
3. **Contactar soporte:**
   - Resend: support@resend.com
   - IONOS: 900 649 649

---

## 📞 CONTACTO

**Soporte BarLive:** soporte@barliveapp.es

---

**Tiempo estimado total:** 30-45 minutos (incluyendo propagación DNS)
