# EC2'de SendGrid API Key Ekleme

## Sorun
`.env` dosyasında `SENDGRID_API_KEY` satırı yok, bu yüzden `sed` komutu çalışmadı.

## Çözüm

### 1. .env Dosyasına API Key'i Ekleyin

```bash
# .env dosyasının sonuna ekleyin (örnek)
# Gerçek SENDGRID_API_KEY değerini burada yazmayın, sadece sunucuda gizli tutun.
echo "SENDGRID_API_KEY=YOUR_REAL_SENDGRID_API_KEY_HERE" >> .env
```

Veya nano ile düzenleyin:
```bash
nano .env
# Dosyanın sonuna şu satırı ekleyin (kendi anahtarınızla değiştirin):
SENDGRID_API_KEY=YOUR_REAL_SENDGRID_API_KEY_HERE
# Ctrl+X, Y, Enter ile kaydedin
```

### 2. Kontrol Edin
```bash
grep SENDGRID_API_KEY .env
```

### 3. PM2'yi Environment Variable'ları Güncelleyerek Restart Edin
```bash
pm2 restart flyawayballooning-backend --update-env
```

**ÖNEMLİ:** `--update-env` flag'i olmadan PM2 environment variable'ları güncellemez!

### 4. Logları Kontrol Edin
```bash
pm2 logs flyawayballooning-backend --lines 50 | grep -E "Email service|sendgridReady|SENDGRID"
```

Başarılı yapılandırma şu logları göstermelidir:
- `sendgridReady: true`
- `available: true`

### 5. Test Edin
Yeni bir Flight Voucher işlemi yapın ve logları izleyin:
```bash
pm2 logs flyawayballooning-backend --lines 0 | grep -E "Email service|Flight Voucher|sendAutomaticFlightVoucher"
```

