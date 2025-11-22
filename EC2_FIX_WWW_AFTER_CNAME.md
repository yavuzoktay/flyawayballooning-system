# EC2 Fix: www Domain After CNAME Record Added

CNAME record Route 53'te eklendi ama www domain hala login sayfasına gidiyor. Aşağıdaki adımları takip edin.

## 🔄 EC2'de Yapılacaklar

### 1. EC2'ye SSH ile bağlanın
```bash
ssh -i your-key.pem ec2-user@34.205.25.8
```

### 2. Proje dizinine gidin ve kodları çekin
```bash
cd /home/ec2-user/flyawayballooning-system-backend
git pull origin main
```

### 3. Nginx Config'i Güncelleyin
```bash
# Nginx config dosyasını kopyalayın
sudo cp nginx.conf /etc/nginx/nginx.conf

# Nginx config'i test edin
sudo nginx -t
```

### 4. Nginx'i Restart Edin
```bash
sudo systemctl restart nginx
```

### 5. Nginx Durumunu Kontrol Edin
```bash
sudo systemctl status nginx
```

### 6. DNS Propagation Kontrolü
```bash
# DNS'in güncellenip güncellenmediğini kontrol edin
dig www.flyawayballooning-book.com
nslookup www.flyawayballooning-book.com

# www domain'in CNAME olarak çözümlenip çözümlenmediğini kontrol edin
# Çıktıda "CNAME flyawayballooning-book.com" görmelisiniz
```

### 7. Test Edin
```bash
# www domain test (CNAME ile non-www'ye yönlendirmeli)
curl -I http://www.flyawayballooning-book.com/
curl -I https://www.flyawayballooning-book.com/

# Non-www domain test
curl -I http://flyawayballooning-book.com/
```

---

## 🔍 Sorun Giderme

### DNS henüz propagate olmamışsa:

DNS değişiklikleri 5-60 dakika sürebilir. Kontrol edin:

```bash
# Farklı DNS server'larından test edin
dig @8.8.8.8 www.flyawayballooning-book.com
dig @1.1.1.1 www.flyawayballooning-book.com
```

### www domain hala login sayfasına gidiyorsa:

1. **Browser cache'i temizleyin:**
   - Hard refresh: Ctrl+Shift+R (Windows) veya Cmd+Shift+R (Mac)
   - Veya incognito/private mode kullanın

2. **AWS ELB/CloudFront kontrolü:**
   - CloudFront distribution'da www domain'i kaldırın
   - ELB listener rules'da www domain için redirect rule ekleyin

3. **Nginx loglarını kontrol edin:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

4. **Mevcut Nginx config'i kontrol edin:**
```bash
sudo cat /etc/nginx/nginx.conf | grep -A 10 "www.flyawayballooning-book"
```

### ELB/CloudFront seviyesinde yapılandırma:

Eğer AWS ELB veya CloudFront kullanıyorsanız:

1. **CloudFront Distribution:**
   - www domain'i Alternate Domain Names (CNAMEs) listesinden kaldırın
   - Veya www domain için ayrı bir distribution oluşturmayın

2. **ELB Listener Rules:**
   - www domain için redirect rule ekleyin:
     - Condition: Host header is `www.flyawayballooning-book.com`
     - Action: Redirect to `https://flyawayballooning-book.com`

---

## ⚠️ Önemli Notlar

- **DNS Propagation:** Route 53 değişiklikleri 60 saniye içinde propagate olur ama global DNS cache'leri 5-60 dakika sürebilir
- **Browser Cache:** Browser'lar DNS'i cache'ler, hard refresh yapın
- **ELB Priority:** AWS ELB, Nginx'ten önce devreye girer, bu yüzden ELB seviyesinde yapılandırma gerekebilir

---

## ✅ Kontrol Listesi

- [ ] Git pull başarılı oldu
- [ ] Nginx config güncellendi
- [ ] Nginx restart edildi
- [ ] DNS CNAME record doğru çözümleniyor
- [ ] www domain non-www'ye yönlendiriyor
- [ ] Browser cache temizlendi
- [ ] ELB/CloudFront yapılandırması kontrol edildi

