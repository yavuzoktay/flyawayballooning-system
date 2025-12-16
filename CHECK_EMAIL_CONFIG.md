# Email Configuration Check

## Gerekli Environment Variables

### SendGrid (Birincil)
Aşağıdakilerden en az biri olmalı:
- `SENDGRID_API_KEY`
- `SENDGRID_PRIMARY_API_KEY`
- `SENDGRID_API_KEY_LIVE`
- `SENDGRID_API_KEY_PROD`
- `SENDGRID_BACKUP_API_KEY`

### SMTP Fallback (Opsiyonel ama önerilir)
- `SMTP_HOST` veya `EMAIL_SMTP_HOST`
- `SMTP_USER` veya `EMAIL_SMTP_USER`
- `SMTP_PASS` veya `EMAIL_SMTP_PASS`
- `SMTP_PORT` veya `EMAIL_SMTP_PORT` (varsayılan: 587)
- `SMTP_SECURE` veya `EMAIL_SMTP_SECURE` (varsayılan: false, 465 portu için true)

## EC2'de Kontrol Etme

### 1. EC2'ye SSH ile bağlanın:
```bash
ssh -i /path/to/your-key.pem ec2-user@54.174.83.100
```

### 2. Server dizinine gidin:
```bash
cd flyawayballooning-system-backend/server
```

### 3. .env dosyasını kontrol edin:
```bash
# Tüm email ile ilgili değişkenleri görmek için:
cat .env | grep -E "SENDGRID|SMTP|EMAIL"

# Veya tüm .env dosyasını görmek için:
cat .env
```

### 4. SendGrid API key kontrolü:
```bash
cat .env | grep SENDGRID
```

### 5. SMTP ayarları kontrolü:
```bash
cat .env | grep SMTP
```

## Eksikse Ekleme

Eğer eksikse, `.env` dosyasına ekleyin:

```bash
# SendGrid API Key (en az biri)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# SMTP Fallback (opsiyonel ama önerilir)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM_EMAIL=info@flyawayballooning.com
SMTP_FROM_NAME=Fly Away Ballooning
```

## PM2'yi Yeniden Başlatma

Değişikliklerden sonra PM2'yi yeniden başlatın:

```bash
cd flyawayballooning-system-backend/server
pm2 restart flyawayballooning-backend
pm2 logs flyawayballooning-backend --lines 50
```

## Test

Email servisinin çalışıp çalışmadığını kontrol etmek için logları izleyin:

```bash
pm2 logs flyawayballooning-backend --lines 0 | grep -E "Email service|sendgridReady|smtpTransporter"
```

Başarılı bir yapılandırma şu logları göstermelidir:
- `✅ Email service is available`
- `sendgridReady: true` veya `smtpTransporter: configured`

