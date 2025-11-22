# EC2 Fix: www.flyawayballooning-book.com ELB Redirect Issue

www domain AWS ELB tarafından yakalanıyor ve HTTPS'e yönlendiriyor. Bu sorunu çözmek için aşağıdaki seçeneklerden birini uygulayın.

## 🔍 Sorun Analizi

Curl sonuçları:
- `http://flyawayballooning-book.com/` → 200 OK ✅
- `http://www.flyawayballooning-book.com/` → 301 → `https://www.flyawayballooning-book.com:443/` ❌

www domain AWS ELB (Elastic Load Balancer) tarafından yakalanıyor.

## 🔧 Çözüm Seçenekleri

### Seçenek 1: AWS ELB/Route 53'te Redirect Yapılandırması (Önerilen)

AWS Console'da:

1. **Route 53'te:**
   - `www.flyawayballooning-book.com` için A record oluşturun
   - Alias'ı `flyawayballooning-book.com`'a yönlendirin
   - Veya CNAME record ekleyin: `www` → `flyawayballooning-book.com`

2. **ELB/CloudFront'te:**
   - www domain'i için ayrı bir listener/behavior oluşturun
   - Redirect rule ekleyin: `www.flyawayballooning-book.com` → `flyawayballooning-book.com`

### Seçenek 2: Nginx'te HTTPS Redirect (SSL Sertifikası Gerekli)

EC2'de SSL sertifikası varsa:

```bash
cd /home/ec2-user/flyawayballooning-system-backend
git pull origin main

# Nginx config'i güncelle
sudo cp nginx.conf /etc/nginx/nginx.conf

# SSL sertifikası path'lerini düzelt (Let's Encrypt kullanıyorsanız)
# sudo nano /etc/nginx/nginx.conf
# ssl_certificate ve ssl_certificate_key path'lerini güncelleyin

# Test ve restart
sudo nginx -t
sudo systemctl restart nginx
```

### Seçenek 3: ELB'de www Domain'i Kaldırma

AWS Console'da:

1. **ELB Listener Rules:**
   - www domain için olan rule'u kaldırın
   - Sadece non-www domain'i dinleyin

2. **Route 53:**
   - www için CNAME record ekleyin: `www` → `flyawayballooning-book.com`

## 📝 EC2'de Yapılacaklar

### 1. Nginx Config'i Güncelle
```bash
cd /home/ec2-user/flyawayballooning-system-backend
git pull origin main
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl restart nginx
```

### 2. SSL Sertifikası Kontrolü (Eğer HTTPS redirect eklediyseniz)
```bash
# Let's Encrypt sertifikası var mı kontrol edin
sudo ls -la /etc/letsencrypt/live/

# Eğer yoksa, Let's Encrypt ile sertifika alın
sudo certbot --nginx -d flyawayballooning-book.com -d www.flyawayballooning-book.com
```

### 3. Test
```bash
# HTTP test
curl -I http://www.flyawayballooning-book.com/
# Beklenen: 301 → http://flyawayballooning-book.com/

# HTTPS test (SSL varsa)
curl -I https://www.flyawayballooning-book.com/
# Beklenen: 301 → https://flyawayballooning-book.com/
```

## ⚠️ Önemli Notlar

- **ELB Önceliği:** AWS ELB, Nginx'ten önce devreye girer. Bu yüzden ELB seviyesinde redirect yapılandırması daha etkili olur.
- **SSL Sertifikası:** HTTPS redirect için SSL sertifikası gerekir. Let's Encrypt kullanabilirsiniz.
- **Route 53:** DNS seviyesinde CNAME ile www'yi non-www'ye yönlendirebilirsiniz (en basit çözüm).

## ✅ Önerilen Çözüm

**En kolay ve etkili çözüm:** Route 53'te www için CNAME record ekleyin:
- Record name: `www`
- Record type: `CNAME`
- Value: `flyawayballooning-book.com`
- TTL: 300

Bu şekilde www domain'i otomatik olarak non-www domain'e yönlendirilir ve ELB/Nginx seviyesinde işlem yapmanıza gerek kalmaz.

