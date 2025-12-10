# How to View Backend Logs for Flight Voucher Email Debugging

## Backend Logs (EC2 Server)

Backend loglarını görmek için EC2 instance'a SSH ile bağlanmanız gerekiyor.

### 1. EC2'ye SSH ile Bağlanma

```bash
ssh -i /path/to/your-key.pem ec2-user@44.201.218.229
```

### 2. PM2 Loglarını Görüntüleme

PM2 loglarını görmek için aşağıdaki komutları kullanın:

#### Tüm logları görmek (son 100 satır):
```bash
pm2 logs flyawayballooning-backend --lines 100
```

#### Canlı log takibi (real-time):
```bash
pm2 logs flyawayballooning-backend --lines 0
```

#### Sadece error logları:
```bash
pm2 logs flyawayballooning-backend --err --lines 100
```

#### Sadece output logları:
```bash
pm2 logs flyawayballooning-backend --out --lines 100
```

### 3. Flight Voucher Email Loglarını Filtreleme

Flight Voucher email gönderim loglarını görmek için:

```bash
pm2 logs flyawayballooning-backend --lines 500 | grep -i "flight.*voucher\|email\|sendAutomaticFlightVoucher"
```

Veya daha spesifik:

```bash
pm2 logs flyawayballooning-backend --lines 500 | grep -E "\[sendAutomaticFlightVoucherConfirmationEmail\]|\[WEBHOOK\]|\[FALLBACK\]|Flight Voucher"
```

### 4. Log Dosyalarını Doğrudan Okuma

PM2 log dosyaları genellikle şu konumda bulunur:

```bash
# PM2 log dizini
cd ~/.pm2/logs/

# Error logları
tail -f flyawayballooning-backend-error.log

# Output logları
tail -f flyawayballooning-backend-out.log
```

### 5. Önemli Log Mesajları

Flight Voucher email gönderim sürecinde arayacağınız log mesajları:

- `🚀 [sendAutomaticFlightVoucherConfirmationEmail] START` - Email gönderim fonksiyonu başladı
- `✅ [sendAutomaticFlightVoucherConfirmationEmail] Email service is available` - Email servisi hazır
- `🔍 [sendAutomaticFlightVoucherConfirmationEmail] Fetching voucher from database` - Voucher veritabanından çekiliyor
- `✅ [sendAutomaticFlightVoucherConfirmationEmail] Voucher found` - Voucher bulundu
- `🔍 [sendAutomaticFlightVoucherConfirmationEmail] Checking voucher type` - Voucher tipi kontrol ediliyor
- `📤 [sendAutomaticFlightVoucherConfirmationEmail] Calling sendFlightVoucherEmailToCustomerAndOwner` - Email gönderim fonksiyonu çağrılıyor
- `📧 [WEBHOOK] Sending automatic Flight Voucher Confirmation email from webhook` - Webhook'tan email gönderiliyor
- `📧 [FALLBACK] Sending automatic Flight Voucher Confirmation email from fallback` - Fallback'ten email gönderiliyor
- `✅ [sendFlightVoucherEmailToCustomerAndOwner] Automatic flight voucher confirmation email sent` - Email başarıyla gönderildi
- `❌` ile başlayan mesajlar - Hata durumları

### 6. Test Senaryosu

1. Canlı sitede "Buy Flight Voucher" işlemi yapın
2. Ödeme tamamlandıktan sonra browser console'da logları kontrol edin
3. EC2'ye SSH ile bağlanın
4. PM2 loglarını canlı takip edin: `pm2 logs flyawayballooning-backend --lines 0`
5. Email gönderim sürecini takip edin

## Frontend Logs (Browser Console)

Frontend loglarını görmek için:

1. Canlı sitede (`https://flyawayballooning-book.com/`) ödeme işlemini tamamlayın
2. Browser'da Developer Tools'u açın (F12 veya Cmd+Option+I)
3. Console sekmesine gidin
4. Şu log mesajlarını arayın:
   - `✅ [EmailDebug] Backend createBookingFromSession success`
   - `📧 [EmailDebug] FLIGHT VOUCHER DETECTED`
   - `📧 [EmailDebug] Check backend logs for email sending status`

## Troubleshooting

### Email gönderilmiyorsa:

1. **Backend loglarında hata var mı?**
   - `❌` ile başlayan mesajları kontrol edin
   - Email servis hatası var mı?

2. **Voucher tipi doğru mu?**
   - `book_flight` alanı "Buy Flight Voucher" veya "Flight Voucher" içeriyor mu?
   - `voucher_type` "gift" içermiyor mu?

3. **Email adresi var mı?**
   - Voucher'da `email` veya `purchaser_email` alanı dolu mu?

4. **Webhook çalıştı mı?**
   - `[WEBHOOK]` logları görünüyor mu?
   - Yoksa `[FALLBACK]` logları mı görünüyor?

5. **Email servisi çalışıyor mu?**
   - `isEmailServiceAvailable()` true dönüyor mu?
   - SendGrid veya SMTP ayarları doğru mu?

