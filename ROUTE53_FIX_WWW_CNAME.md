# Route 53: www CNAME Record Conflict Çözümü

## 🔍 Sorun

Route 53'te `www.flyawayballooning-book.com` için CNAME record oluştururken hata alıyorsunuz:
```
RRSet of type CNAME with DNS name www.flyawayballooning-book.com. 
is not permitted as it conflicts with other records with the same DNS name
```

Bu, aynı DNS name için zaten başka bir record (A, CNAME, veya başka bir type) olduğu anlamına gelir.

## 🔧 Çözüm Adımları

### 1. Mevcut Record'u Bulun

AWS Route 53 Console'da:

1. **Route 53** → **Hosted zones** → **flyawayballooning-book.com**'a gidin
2. Record listesinde **`www`** ile başlayan record'u arayın
3. Record type'ı kontrol edin (A, CNAME, veya başka bir type olabilir)

### 2. Mevcut Record'u Silin veya Düzenleyin

**Seçenek A: Record'u Silin (Önerilen)**

1. `www` record'unu bulun
2. Record'u seçin (checkbox işaretleyin)
3. **Delete** butonuna tıklayın
4. Onaylayın

**Seçenek B: Record'u Düzenleyin**

1. `www` record'una tıklayın
2. **Edit record** butonuna tıklayın
3. Record type'ı **CNAME** olarak değiştirin
4. Value'yu `flyawayballooning-book.com` olarak ayarlayın
5. **Save changes** butonuna tıklayın

### 3. Yeni CNAME Record Oluşturun

Mevcut record silindikten sonra:

1. **Create record** butonuna tıklayın
2. **Record name:** `www` (veya boş bırakın, otomatik olarak www eklenir)
3. **Record type:** `CNAME - Routes traffic to another domain name`
4. **Value:** `flyawayballooning-book.com`
5. **TTL:** `300` (veya istediğiniz değer)
6. **Routing policy:** `Simple routing`
7. **Create records** butonuna tıklayın

## 📋 Alternatif Çözüm: A Record Kullanın

Eğer CNAME çalışmazsa, A record kullanabilirsiniz:

1. **Record name:** `www`
2. **Record type:** `A - Routes traffic to an IPv4 address and some AWS resources`
3. **Alias:** `ON` (toggle'ı açın)
4. **Route traffic to:** 
   - **Alias to:** `CloudFront distribution` veya `Application and Classic Load Balancer`
   - Veya non-www domain'in A record'unu seçin
5. **Create records**

## ⚠️ Önemli Notlar

- **CNAME Conflict:** Aynı DNS name için hem A hem CNAME record olamaz
- **Root Domain:** Root domain (`flyawayballooning-book.com`) için CNAME kullanılamaz, sadece A record kullanılabilir
- **Subdomain:** `www` bir subdomain olduğu için CNAME kullanılabilir
- **Propagation:** DNS değişiklikleri 5-10 dakika içinde yayılır

## ✅ Kontrol

Record oluşturulduktan sonra:

```bash
# DNS propagation kontrolü
dig www.flyawayballooning-book.com
nslookup www.flyawayballooning-book.com

# Browser'da test
# http://www.flyawayballooning-book.com → http://flyawayballooning-book.com'a yönlendirmeli
```

## 🔄 Eğer Hala Çalışmazsa

1. **Route 53'te tüm record'ları kontrol edin:**
   - `www` ile başlayan tüm record'ları listeleyin
   - Gereksiz olanları silin

2. **AWS CloudFront/ELB kontrolü:**
   - CloudFront distribution'da www domain'i kaldırın
   - ELB listener rules'da www domain'i kaldırın

3. **Nginx config kontrolü:**
   - EC2'de nginx config'i güncelleyin
   - www domain'i non-www'ye yönlendirin

