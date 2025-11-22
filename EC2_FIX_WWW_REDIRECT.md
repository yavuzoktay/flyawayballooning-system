# EC2 Fix: www.flyawayballooning-book.com Redirect

www olan domain login sayfasını açıyor. www olmayan domain'e yönlendirmek için aşağıdaki komutları çalıştırın.

## 🔄 Nginx Config Güncelleme

### 1. EC2'ye SSH ile bağlanın
```bash
ssh -i your-key.pem ec2-user@34.205.25.8
```

### 2. Proje dizinine gidin
```bash
cd /home/ec2-user/flyawayballooning-system-backend
```

### 3. Git'ten en son kodları çekin
```bash
git pull origin main
```

### 4. Nginx Config'i Güncelleyin
```bash
# Nginx config dosyasını kopyalayın
sudo cp nginx.conf /etc/nginx/nginx.conf

# Nginx config'i test edin
sudo nginx -t
```

### 5. Nginx'i Restart Edin
```bash
sudo systemctl restart nginx
```

### 6. Nginx Durumunu Kontrol Edin
```bash
sudo systemctl status nginx
```

### 7. Test Edin
```bash
# www olmayan domain test
curl -I http://flyawayballooning-book.com/

# www domain test (301 redirect olmalı)
curl -I http://www.flyawayballooning-book.com/
```

---

## 🔍 Sorun Giderme

### Nginx config test başarısız olursa:

1. **Config dosyasını kontrol edin:**
```bash
sudo nginx -t
sudo cat /etc/nginx/nginx.conf | grep -A 5 "flyawayballooning-book"
```

2. **Nginx loglarını kontrol edin:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

3. **Mevcut server block'ları kontrol edin:**
```bash
sudo ls -la /etc/nginx/sites-enabled/
sudo ls -la /etc/nginx/conf.d/
```

### www domain hala login sayfasını açıyorsa:

1. **Diğer Nginx config dosyalarını kontrol edin:**
```bash
# Tüm nginx config dosyalarını kontrol edin
sudo find /etc/nginx -name "*.conf" -exec grep -l "www.flyawayballooning-book" {} \;
```

2. **www için ayrı bir server block varsa kaldırın:**
```bash
# Eğer sites-enabled'da ayrı bir config varsa
sudo ls -la /etc/nginx/sites-enabled/
# Gerekirse kaldırın
sudo rm /etc/nginx/sites-enabled/www-flyawayballooning-book.conf
```

3. **Nginx'i reload edin:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📝 Önemli Notlar

- www olan domain artık www olmayan domain'e 301 (permanent) redirect yapacak
- Bu SEO için iyi bir pratiktir
- Browser'lar redirect'i cache'leyeceği için birkaç saniye sürebilir
- HTTPS için de aynı redirect'i eklemeniz gerekebilir (SSL sertifikası varsa)

---

## ✅ Kontrol Listesi

- [ ] Git pull başarılı oldu
- [ ] Nginx config test başarılı
- [ ] Nginx restart edildi
- [ ] www domain www olmayan domain'e redirect ediyor
- [ ] www olmayan domain doğru siteyi açıyor
- [ ] Login sayfası artık www ile açılmıyor

