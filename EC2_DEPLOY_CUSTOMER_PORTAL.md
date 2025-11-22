# EC2 Deployment Komutları - Customer Portal Content Fix

Canlı sitede `/api/customer-portal-contents` endpoint'i 404 hatası veriyor. Aşağıdaki komutları EC2 instance'da sırayla çalıştırın.

## 🔄 Tam Deployment Komutları

### 1. EC2'ye SSH ile bağlanın
```bash
ssh -i your-key.pem ec2-user@34.205.25.8
```

### 2. Proje dizinine gidin
```bash
cd /home/ec2-user/flyawayballooning-system-backend
# veya
cd ~/flyawayballooning-system-backend
```

### 3. Git'ten en son kodları çekin
```bash
git pull origin main
```

### 4. Backend Dependencies Kontrol Edin
```bash
cd server
npm install
cd ..
```

### 5. Frontend Build Yapın
```bash
cd client
npm install
npm run build
cd ..
```

### 6. Permissions Düzeltin
```bash
# Build klasörü için nginx permissions
sudo chown -R nginx:nginx client/build
sudo chmod -R 755 client/build

# Server klasörü için
sudo chown -R ec2-user:ec2-user server
sudo chmod -R 755 server
```

### 7. PM2 ile Backend'i Restart Edin
```bash
cd server
pm2 restart flyawayballooning-server
# veya eğer process yoksa:
# PORT=3002 pm2 start index.js --name flyawayballooning-server
pm2 save
cd ..
```

### 8. PM2 Loglarını Kontrol Edin
```bash
pm2 logs flyawayballooning-server --lines 50
```

### 9. Backend Endpoint'i Test Edin
```bash
# Health check
curl http://localhost:3002/api/health

# Customer portal contents endpoint test
curl http://localhost:3002/api/customer-portal-contents
```

### 10. Nginx Restart (Gerekirse)
```bash
sudo systemctl restart nginx
sudo nginx -t
```

---

## 🚀 Hızlı Deployment (Sadece Backend)

Eğer sadece backend endpoint'lerini eklediyseniz:

```bash
cd /home/ec2-user/flyawayballooning-system-backend
git pull origin main
cd server
npm install
pm2 restart flyawayballooning-server
pm2 logs flyawayballooning-server --lines 20
```

---

## 🔍 Sorun Giderme

### Endpoint 404 hatası veriyorsa:

1. **Backend endpoint'inin var olup olmadığını kontrol edin:**
```bash
cd server
grep -n "customer-portal-contents" index.js
```

2. **PM2 process'inin çalışıp çalışmadığını kontrol edin:**
```bash
pm2 status
pm2 logs flyawayballooning-server --lines 100
```

3. **Port 3002'nin açık olup olmadığını kontrol edin:**
```bash
netstat -tlnp | grep 3002
```

4. **Backend'i manuel olarak test edin:**
```bash
curl -X GET http://localhost:3002/api/customer-portal-contents
curl -X POST http://localhost:3002/api/customer-portal-contents -H "Content-Type: application/json" -d '{"header":"test","body":"test","sort_order":0,"is_active":1}'
```

5. **Nginx config'i kontrol edin:**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

---

## 📝 Önemli Notlar

- Tüm komutları `ec2-user` kullanıcısı ile çalıştırın
- `sudo` gerektiren komutlar için şifre istenebilir
- PM2 restart sonrası endpoint'lerin yüklenmesi birkaç saniye sürebilir
- Database migration'lar otomatik olarak çalışır (server başlatıldığında)

---

## ✅ Kontrol Listesi

- [ ] Git pull başarılı oldu
- [ ] Backend dependencies yüklendi
- [ ] Frontend build başarılı oldu
- [ ] PM2 restart edildi
- [ ] PM2 logs'ta hata yok
- [ ] Backend endpoint test başarılı
- [ ] Canlı sitede endpoint çalışıyor

