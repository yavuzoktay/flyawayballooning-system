# AWS Log Kontrol Komutları

## 1. PM2 Log Kontrolü (Eğer PM2 kullanıyorsanız)

```bash
# PM2 process listesi
pm2 list

# Son 100 satır log
pm2 logs flyawayballooning-server --lines 100

# Google Calendar ile ilgili logları filtrele
pm2 logs flyawayballooning-server --lines 500 | grep -i "google\|calendar\|📅\|✅.*calendar\|❌.*calendar"

# Booking oluşturma loglarını filtrele
pm2 logs flyawayballooning-server --lines 500 | grep -i "createBooking\|booking.*created\|📅.*calendar"
```

## 2. Server Log Dosyası Kontrolü

```bash
# Server dizinine git
cd /path/to/server

# Son 100 satır log
tail -n 100 server.log

# Son 500 satır ve Google Calendar logları
tail -n 500 server.log | grep -i "google\|calendar\|📅\|✅.*calendar\|❌.*calendar"

# Booking oluşturma logları (son 1 saat)
tail -n 1000 server.log | grep -i "createBooking\|booking.*created"

# Tüm hataları görüntüle
tail -n 1000 server.log | grep -i "error\|❌\|failed"

# Son booking işlemi için detaylı log
tail -n 2000 server.log | grep -A 20 -B 20 "createBooking"
```

## 3. Node.js Console Log Kontrolü

```bash
# Eğer node index.js ile çalıştırıyorsanız
# Loglar direkt console'da görünecek

# Background'da çalıştırıyorsanız
nohup node index.js > server.log 2>&1 &

# Logları canlı izle
tail -f server.log | grep -i "google\|calendar\|createBooking"
```

## 4. Environment Variables Kontrolü

```bash
# Google Calendar environment variables kontrolü
echo "GOOGLE_CLIENT_EMAIL: $GOOGLE_CLIENT_EMAIL"
echo "GOOGLE_CALENDAR_ID: $GOOGLE_CALENDAR_ID"
echo "GOOGLE_PRIVATE_KEY: ${GOOGLE_PRIVATE_KEY:0:50}..." # İlk 50 karakter

# Veya .env dosyasından
cat .env | grep GOOGLE
```

## 5. Database'den Son Booking Kontrolü

```bash
# MySQL'e bağlan
mysql -u [username] -p [database_name]

# Son booking'i kontrol et
SELECT id, flight_date, status, google_calendar_event_id, created_at 
FROM all_booking 
ORDER BY created_at DESC 
LIMIT 5;

# Google Calendar event ID'si olmayan booking'leri kontrol et
SELECT id, flight_date, status, location, created_at 
FROM all_booking 
WHERE google_calendar_event_id IS NULL 
AND status = 'Scheduled' 
AND flight_date IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

## 6. Google Calendar API Test

```bash
# Node.js ile test scripti çalıştır
node -e "
const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n'),
    ['https://www.googleapis.com/auth/calendar']
);

const calendar = google.calendar({ version: 'v3', auth });

calendar.calendarList.list()
    .then(res => {
        console.log('✅ Google Calendar API bağlantısı başarılı!');
        console.log('Calendars:', res.data.items.map(c => c.summary));
    })
    .catch(err => {
        console.error('❌ Google Calendar API hatası:', err.message);
        console.error('Details:', err.response?.data || err);
    });
"
```

## 7. Real-time Log Monitoring

```bash
# Canlı log takibi (Google Calendar için)
tail -f server.log | grep --line-buffered -i "google\|calendar\|📅\|createBooking"

# Veya tüm logları canlı izle
tail -f server.log
```

## 8. Hata Ayıklama için Özel Log Komutları

```bash
# Son 15 dakika içindeki tüm booking işlemleri
tail -n 5000 server.log | grep -i "createBooking" | tail -n 50

# Google Calendar event oluşturma denemeleri
tail -n 5000 server.log | grep -i "📅.*calendar\|✅.*calendar\|❌.*calendar"

# Booking ID ile arama (örnek: booking ID 1234)
tail -n 5000 server.log | grep -i "1234\|booking.*1234"

# Environment variable eksikliği kontrolü
tail -n 1000 server.log | grep -i "GOOGLE\|environment\|config"
```

## 9. PM2 Restart ve Log Kontrolü

```bash
# PM2'yi restart et
pm2 restart flyawayballooning-server

# Restart sonrası logları izle
pm2 logs flyawayballooning-server --lines 50
```

## 10. Database Error Logs Kontrolü

```bash
# Error logs tablosundan son hataları kontrol et
mysql -u [username] -p [database_name] -e "
SELECT id, level, message, source, created_at 
FROM error_logs 
WHERE source LIKE '%google%' OR source LIKE '%calendar%' OR message LIKE '%calendar%'
ORDER BY created_at DESC 
LIMIT 20;
"
```

