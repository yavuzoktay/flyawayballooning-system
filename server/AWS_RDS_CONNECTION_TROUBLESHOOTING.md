# AWS RDS Bağlantı Sorun Giderme Rehberi

## Sorun: Local ortamdan AWS RDS veritabanına bağlanılamıyor

### Olası Nedenler ve Çözümler

#### 1. AWS RDS Security Group (Güvenlik Grubu) Ayarları

**En yaygın neden:** Local IP adresiniz RDS güvenlik grubunda whitelist'te değil.

**Çözüm:**
1. AWS Console'a giriş yapın
2. RDS servisine gidin
3. Veritabanı instance'ınızı seçin (trip-booking-database)
4. "Connectivity & security" sekmesine gidin
5. "VPC security groups" bölümündeki güvenlik grubunu tıklayın
6. "Inbound rules" sekmesine gidin
7. "Edit inbound rules" butonuna tıklayın
8. Yeni bir rule ekleyin:
   - **Type:** MySQL/Aurora (3306)
   - **Source:** My IP (otomatik olarak local IP'nizi ekler) veya Custom (0.0.0.0/0 - tüm IP'ler için, güvenlik riski var)
   - **Description:** "Local development access"

**Not:** Production ortamında 0.0.0.0/0 kullanmayın. Sadece gerekli IP adreslerini ekleyin.

#### 2. RDS Instance Durumu

**Kontrol:**
1. AWS Console > RDS > Databases
2. Instance'ın durumunun "Available" olduğundan emin olun
3. Eğer "Stopped" ise, "Start" butonuna tıklayın

#### 3. Public Accessibility

**Kontrol:**
1. RDS instance'ınızın "Publicly accessible" özelliğinin "Yes" olduğundan emin olun
2. Eğer "No" ise:
   - Instance'ı seçin
   - "Modify" butonuna tıklayın
   - "Connectivity" bölümünde "Publicly accessible" seçeneğini "Yes" yapın
   - "Continue" ve "Modify DB instance" butonlarına tıklayın

#### 4. Ağ Bağlantısı Testi

**Terminal'de test edin:**
```bash
# Port 3306'nın açık olup olmadığını test edin
telnet trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com 3306

# veya
nc -zv trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com 3306
```

**Eğer bağlantı başarısız olursa:**
- Firewall ayarlarınızı kontrol edin
- VPN bağlantınızı kontrol edin
- İnternet bağlantınızı kontrol edin

#### 5. Credentials (Kimlik Bilgileri) Kontrolü

**.env dosyasında kontrol edin:**
```env
DB_HOST=trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=qumton-jeghuz-doKxy3
DB_NAME=trip_booking
DB_PORT=3306
```

**Not:** .env dosyasındaki değerlerin doğru olduğundan emin olun.

#### 6. MySQL Client ile Test

**MySQL client ile doğrudan test edin:**
```bash
mysql -h trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com -u admin -p -P 3306
```

Şifre: `qumton-jeghuz-doKxy3`

#### 7. Timeout Ayarları

Kod içinde timeout ayarları zaten 60 saniyeye çıkarıldı. Eğer hala timeout alıyorsanız:

1. Ağ bağlantınızı kontrol edin
2. RDS instance'ının yük durumunu kontrol edin
3. VPC ve subnet ayarlarını kontrol edin

### Hızlı Kontrol Listesi

- [ ] RDS instance durumu "Available"
- [ ] Public accessibility "Yes"
- [ ] Security group'da local IP adresi whitelist'te
- [ ] Port 3306 açık
- [ ] .env dosyasındaki credentials doğru
- [ ] Ağ bağlantısı çalışıyor
- [ ] Firewall/VPN ayarları doğru

### Alternatif Çözüm: SSH Tunnel

Eğer yukarıdaki çözümler işe yaramazsa, SSH tunnel kullanabilirsiniz:

1. AWS EC2 instance'ına SSH ile bağlanın
2. SSH tunnel oluşturun:
```bash
ssh -L 3306:trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com:3306 user@ec2-instance
```

3. .env dosyasında host'u localhost yapın:
```env
DB_HOST=localhost
DB_PORT=3306
```

### Destek

Sorun devam ederse:
1. AWS CloudWatch Logs'u kontrol edin
2. RDS instance'ın event log'larını kontrol edin
3. AWS Support'a başvurun

