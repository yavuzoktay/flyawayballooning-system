# Email Servisi Yapılandırma - EC2'de Düzeltme

## Sorun
Loglardan görüldüğü üzere email servisi yapılandırılmamış:
```
available: false,
sendgridReady: false,
smtpTransporter: 'not configured'
```

## Çözüm Adımları

### 1. EC2'ye SSH ile Bağlanın
```bash
ssh -i /path/to/your-key.pem ec2-user@54.174.83.100
```

### 2. Server Dizinine Gidin
```bash
cd flyawayballooning-system-backend/server
```

### 3. .env Dosyasını Kontrol Edin
```bash
cat .env | grep -E "SENDGRID|SMTP"
```

### 4. Eksikse Ekleyin

#### Seçenek 1: SendGrid API Key (Önerilen)
```bash
nano .env
```

Aşağıdaki satırı ekleyin (SendGrid API key'inizi kullanın):
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Veya alternatif olarak:
```
SENDGRID_PRIMARY_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Seçenek 2: SMTP Fallback (Gmail örneği)
Eğer SendGrid yoksa, SMTP kullanabilirsiniz:
```bash
nano .env
```

Aşağıdaki satırları ekleyin:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
SMTP_FROM_EMAIL=info@flyawayballooning.com
SMTP_FROM_NAME=Fly Away Ballooning
```

**Not:** Gmail için App Password kullanmanız gerekir (normal şifre çalışmaz).

### 5. Dosyayı Kaydedin
- Nano'da: `Ctrl+X`, sonra `Y`, sonra `Enter`

### 6. PM2'yi Yeniden Başlatın
```bash
pm2 restart flyawayballooning-backend
```

### 7. Logları Kontrol Edin
```bash
pm2 logs flyawayballooning-backend --lines 50 | grep -E "Email service|sendgridReady|smtpTransporter"
```

Başarılı yapılandırma şu logları göstermelidir:
- `available: true`
- `sendgridReady: true` VEYA `smtpTransporter: 'configured'`

### 8. Test Edin
Yeni bir Flight Voucher işlemi yapın ve logları kontrol edin:
```bash
pm2 logs flyawayballooning-backend --lines 0 | grep -E "Email service|Flight Voucher|sendAutomaticFlightVoucher"
```

Başarılı email gönderimi şu logları göstermelidir:
- `✅ [sendAutomaticFlightVoucherConfirmationEmail] Email service is available`
- `📤 [sendFlightVoucherEmailToCustomerAndOwner] Sending automatic flight voucher confirmation email`
- `✅ Automatic flight voucher confirmation email sent to customer`

## SendGrid API Key Nasıl Alınır?

1. https://app.sendgrid.com/ adresine gidin
2. Settings > API Keys bölümüne gidin
3. "Create API Key" butonuna tıklayın
4. Key adı verin (örn: "FlyAwayBallooning Production")
5. "Full Access" veya "Mail Send" izni verin
6. Oluşturulan API key'i kopyalayın (sadece bir kez gösterilir!)
7. EC2'deki .env dosyasına ekleyin

## Gmail App Password Nasıl Alınır?

1. Google Account > Security bölümüne gidin
2. "2-Step Verification" aktif olmalı
3. "App passwords" bölümüne gidin
4. "Select app" > "Mail" seçin
5. "Select device" > "Other (Custom name)" seçin
6. "FlyAwayBallooning" gibi bir isim verin
7. Oluşturulan 16 karakterlik şifreyi kopyalayın
8. EC2'deki .env dosyasına `SMTP_PASS` olarak ekleyin

