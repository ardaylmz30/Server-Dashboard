# Server Dashboard

Ana makine sistem kaynaklarını (CPU/RAM/disk) izlemek ve Docker konteynerlerini bir web arayüzünden yönetmek için geliştirilmiş küçük bir full-stack uygulama.

- **Frontend**: React 19 + TypeScript + Vite + Recharts
- **Backend**: FastAPI + Uvicorn + psutil + Docker SDK

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows'ta: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Ortam değişkenleri (yerel geliştirme için hepsi isteğe bağlıdır):

| Değişken                | Varsayılan                | Amaç                                                                    |
|-------------------------|---------------------------|-------------------------------------------------------------------------|
| `DASHBOARD_API_KEY`     | tanımsız (auth yok)       | Tanımlandığında; Docker başlatma/durdurma/yeniden başlatma/log uç noktaları isteklerde bu değeri içeren bir `X-API-Key` üst bilgisi (header) gerektirir. **Backend'i localhost dışına açmadan önce bu değeri mutlaka ayarlayın.** |
| `DASHBOARD_CORS_ORIGINS`| `http://localhost:5173`   | İzin verilen frontend kökenlerinin (origins) virgülle ayrılmış listesi.  |

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Ortam değişkenleri (`frontend/.env`):

| Değişken          | Varsayılan               | Amaç                                          |
|-------------------|--------------------------|-----------------------------------------------|
| `VITE_API_URL`    | `http://127.0.0.1:8000`  | Backend temel URL adresi.                     |
| `VITE_API_KEY`    | tanımsız                 | Tanımlandıysa backend tarafındaki `DASHBOARD_API_KEY` ile aynı olmalıdır. |

## Canlıya Alma (Production) Kontrol Listesi

1. Backend'deki `DASHBOARD_API_KEY` ve frontend'deki `VITE_API_KEY` değerlerini birbiriyle aynı olacak şekilde ayarlayın.
2. `DASHBOARD_CORS_ORIGINS` değerini gerçek frontend alan adınız/alan adlarınız (domain) olacak şekilde güncelleyin.
3. Frontend'i `npm run build` komutuyla derleyin ve `dist/` klasörünü statik bir sunucu veya ters proxy (reverse proxy) üzerinden sunun.
4. Backend'i `--reload` parametresi yerine bir süreç yöneticisi (örn. systemd, Docker) arkasında çalıştırın.

## Ekran Görüntüleri
[Sunucu Paneli Ekran Görüntüsü](Screenshots/Server-Dashboard.png)

[Docker Ekran Görüntüsü](Screenshots/Docker.png)

## Proje Yapısı

```
backend/
  main.py            # FastAPI uygulaması, rotalar, CORS, kimlik doğrulama
  docker_manager.py  # Docker SDK işlemleri
  requirements.txt

frontend/
  src/
    api/dashboardApi.ts  # Tüm backend HTTP çağrıları + ortak tipler
    App.tsx               # Arayüz (UI), durum (state), veri yenileme (polling)
    App.css
```

Kod tabanı büyüdükçe, `App.tsx` içerisindeki arayüz parçalarını `components/` klasörüne ayırabilir ve `App.tsx` dosyasını orkestrasyon/durum katmanı olarak tutabilirsiniz — bu tür bir karmaşıklık gerçekten ortaya çıkana kadar Redux, React Query veya benzeri kütüphanelere ihtiyaç yoktur.