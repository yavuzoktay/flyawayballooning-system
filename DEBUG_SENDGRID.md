# SendGrid Debug - EC2'de Kontrol

## Sorun
SendGrid API key eklendi ama hala "Email service not configured" hatası alınıyor.

## Kontrol Adımları

### 1. Server Başlangıç Loglarını Kontrol Edin
```bash
pm2 logs flyawayballooning-backend --lines 100 | grep -E "SendGrid|SENDGRID|Email service|sendgridReady|Server starting"
```

SendGrid başlangıç mesajını arayın:
- `SendGrid API key configured (masked): SG.TsrVn***` ✅ (Başarılı)
- `SENDGRID_API_KEY not found in environment variables` ❌ (Başarısız)

### 2. .env Dosyasının Doğru Yüklendiğini Kontrol Edin
```bash
# .env dosyasını kontrol edin
cat .env | grep SENDGRID_API_KEY

# PM2 ecosystem dosyası var mı kontrol edin
pm2 show flyawayballooning-backend | grep -E "env|\.env"
```

### 3. PM2 Ecosystem Dosyası Kullanıyorsa
Eğer PM2 ecosystem dosyası kullanılıyorsa, orada da .env path'i belirtilmiş olmalı:

```bash
# Ecosystem dosyasını kontrol edin
cat ecosystem.config.js
# veya
pm2 show flyawayballooning-backend
```

### 4. Manuel Test - Node.js ile Environment Variable Kontrolü
```bash
# Node.js ile .env dosyasını yükleyip test edin
node -e "require('dotenv').config(); console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'FOUND' : 'NOT FOUND');"
```

### 5. PM2'yi Tamamen Durdurup Yeniden Başlatın
```bash
pm2 stop flyawayballooning-backend
pm2 delete flyawayballooning-backend
cd /path/to/server
pm2 start index.js --name flyawayballooning-backend --update-env
# veya ecosystem dosyası kullanıyorsanız:
pm2 start ecosystem.config.js --update-env
```

### 6. .env Dosyasının Yolunu Kontrol Edin
PM2'nin çalıştığı dizinde .env dosyası olmalı:

```bash
# PM2'nin çalıştığı dizini kontrol edin
pm2 show flyawayballooning-backend | grep "exec cwd"

# O dizinde .env dosyası var mı?
ls -la /path/to/server/.env
```

### 7. Alternatif: Environment Variable'ı PM2'ye Doğrudan Verin
```bash
pm2 restart flyawayballooning-backend --update-env --env production
```

Veya ecosystem.config.js dosyasında:
```javascript
module.exports = {
  apps: [{
    name: 'flyawayballooning-backend',
    script: './index.js',
    env: {
      // IMPORTANT: Do NOT hard-code real API keys in source control.
      // Use an environment variable or secret manager instead, e.g.:
      // SENDGRID_API_KEY: process.env.SENDGRID_API_KEY
    }
  }]
}
```

## En Hızlı Çözüm
Eğer yukarıdakiler çalışmazsa, server başlangıç loglarını tam olarak görmek için:

```bash
pm2 logs flyawayballooning-backend --lines 200 | head -50
```

İlk 50 satırda "SendGrid API key configured" mesajını arayın.

