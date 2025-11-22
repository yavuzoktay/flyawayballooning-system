# AWS EC2 Deployment Komutları

Canlı ortamda (AWS EC2) kodları güncellemek ve deploy etmek için aşağıdaki komutları sırayla çalıştırın.

## 🔄 Tam Deployment (Backend + Frontend)

### 1. EC2'ye SSH ile bağlanın
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 2. Proje dizinine gidin
```bash
cd /home/ec2-user/flyawayballooning-system-backend
```

### 3. Git'ten en son kodları çekin
```bash
git pull origin main
```

### 4. Backend Dependencies Yükleyin
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

# Uploads klasörü için
sudo chown -R ec2-user:ec2-user server/uploads
sudo chmod -R 755 server/uploads
```

### 7. Nginx Configuration Güncelleyin
```bash
# Nginx config dosyasını kopyalayın
sudo cp nginx.conf /etc/nginx/nginx.conf

# Nginx config'i test edin
sudo nginx -t

# Nginx'i restart edin
sudo systemctl restart nginx
```

### 8. PM2 ile Backend'i Restart Edin
```bash
# Mevcut process'i durdurun
pm2 stop flyawayballooning-server
pm2 delete flyawayballooning-server

# Yeni process'i başlatın
cd server
PORT=3002 pm2 start index.js --name flyawayballooning-server
pm2 save
cd ..
```

### 9. Servisleri Kontrol Edin
```bash
# Nginx durumunu kontrol edin
sudo systemctl status nginx

# PM2 durumunu kontrol edin
pm2 status

# PM2 loglarını kontrol edin
pm2 logs flyawayballooning-server --lines 50

# Backend health check
curl http://localhost:3002/api/health
```

---

## 🚀 Hızlı Deployment (Sadece Backend Güncellemesi)

Eğer sadece backend kodlarını güncellediyseniz:

```bash
cd /home/ec2-user/flyawayballooning-system-backend
git pull origin main
cd server
npm install
pm2 restart flyawayballooning-server
pm2 logs flyawayballooning-server --lines 20
```

---

## 🎨 Hızlı Deployment (Sadece Frontend Güncellemesi)

Eğer sadece frontend kodlarını güncellediyseniz:

```bash
cd /home/ec2-user/flyawayballooning-system-backend
git pull origin main
cd client
npm install
npm run build
sudo chown -R nginx:nginx build
sudo chmod -R 755 build
sudo systemctl restart nginx
```

---

## 🔧 Sorun Giderme

### Backend çalışmıyorsa:
```bash
# PM2 loglarını kontrol edin
pm2 logs flyawayballooning-server --lines 100

# Port 3002'nin açık olup olmadığını kontrol edin
netstat -tlnp | grep 3002

# PM2 process'i yeniden başlatın
pm2 restart flyawayballooning-server
```

### Frontend görünmüyorsa:
```bash
# Build klasörünün var olup olmadığını kontrol edin
ls -la /home/ec2-user/flyawayballooning-system-backend/client/build

# Nginx loglarını kontrol edin
sudo tail -f /var/log/nginx/error.log

# Nginx config'i test edin
sudo nginx -t
```

### Nginx çalışmıyorsa:
```bash
# Nginx durumunu kontrol edin
sudo systemctl status nginx

# Nginx'i başlatın
sudo systemctl start nginx

# Nginx config'i test edin
sudo nginx -t
```

---

## 📝 Notlar

- Tüm komutları `ec2-user` kullanıcısı ile çalıştırın
- `sudo` gerektiren komutlar için şifre istenebilir
- PM2 process'leri otomatik olarak sistem yeniden başlatıldığında başlatılır (pm2 startup ile ayarlanmışsa)
- Build işlemi biraz zaman alabilir (2-5 dakika)

---

## ✅ Deployment Sonrası Kontrol Listesi

- [ ] Git pull başarılı oldu
- [ ] Backend dependencies yüklendi
- [ ] Frontend build başarılı oldu
- [ ] Permissions doğru ayarlandı
- [ ] Nginx restart edildi ve çalışıyor
- [ ] PM2 process çalışıyor
- [ ] Backend health check başarılı
- [ ] Canlı site açılıyor ve çalışıyor

