# REMINDER.md — Server Dashboard Proje Durumu

Bu dosya, projeye yeni başlayan (veya kaldığı yerden devam eden) herhangi bir AI ajanının ya da geliştiricinin **önce okuması gereken** dosyadır. Amaç: bağlamı sıfırdan anlatmak zorunda kalmadan kaldığı yerden devam edebilmek.

> **Kural:** Bir agent (planner/builder/ui-agent/reviewer) veya sen, anlamlı bir iş parçasını bitirdiğinde bu dosyanın en altındaki **"Değişiklik Günlüğü"** bölümüne kısa bir madde ekle. Uzun açıklama yazma — ne yapıldı, hangi dosyalar etkilendi, sıradaki adım ne, yeterli. Eski günlük maddelerini silme, sadece ekle.

---

## 1. Proje nedir

Server Dashboard: kullanıcıların kendi sunucularındaki Docker container'larını uzaktan izleyip yönetebildiği bir panel. v1.1 tek-kullanıcı/tek-makine varsayımıyla çalışıyor; hedef, çok-kullanıcılı, çok-sunuculu, agent-tabanlı bir mimariye geçmek.

## 2. Şu anki mimari (v1.1 — mevcut kod)

- **Backend**: `backend/main.py` — FastAPI, DB yok, tek statik `X-API-Key` header'ı ile korunan endpoint'ler (`/api/system`, `/api/docker/*`). `backend/docker_manager.py` doğrudan yerel Docker socket'ine (`docker` kütüphanesi) erişiyor.
- **Frontend**: `frontend/` — React + Vite + TypeScript, `src/api/dashboardApi.ts` üzerinden backend'e istek.
- Sistem metrikleri `psutil` ile okunuyor.

## 3. Hedef mimari (whiteboard yol haritası)

1. **Veri tabanı modelleme**: `users` (id, email, password_hash, created_at) ve `servers` (id, user_id, name, agent_id, created_at) — bir kullanıcının birden çok sunucusu olabilir.
2. **Yetkilendirme**: Login (email+password) → FastAPI → PostgreSQL → JWT → React.
3. **Docker API'nin değişimi**: İstekler `JWT → User ID → Server ID → Agent ID → Docker` zincirinden geçecek.
4. **Agent eklenmesi**: Her sunucu için kullanıcının kendi makinesinde çalışan bir agent süreci olacak; backend Docker'a artık doğrudan değil, agent üzerinden erişecek.

Nihai yapı: `User A → Server A → Agent A → Docker`.

Detaylı roller için `.claude/agents/planner.md`, `builder.md`, `ui-agent.md`, `reviewer.md` dosyalarına bak.

## 4. Şu anki durum / kaldığımız nokta

*(Bu bölümü, aşağıdaki değişiklik günlüğü büyüdükçe güncel tutmak için düzenli aralıklarla özetle — en son 1-2 paragraf yeterli.)*

Henüz DB/auth/agent mimarisine geçiş başlamadı. Mevcut kod hâlâ v1.1 (tek API-key, DB'siz) durumda. Bir sonraki adım: `planner`'ı çağırıp DB modelleme + auth akışının somut görev listesini çıkarmak.

## 5. Bilinen açık kararlar (kod yazmadan önce netleştirilmeli)

- Backend ↔ Agent iletişim protokolü henüz seçilmedi (websocket mi, long-poll mü, başka bir şey mi?).
- JWT saklama stratejisi frontend'de netleşmedi (memory+refresh mi, httpOnly cookie mi?).
- Eski `X-API-Key` mekanizmasının hangi aşamada tamamen kaldırılacağı belli değil (geçiş süresince ikisi bir arada mı duracak?).

---

## 6. Değişiklik Günlüğü

*(En yeni madde en altta. Format: `YYYY-AA-GG — ne yapıldı — etkilenen dosyalar — sıradaki adım`)*

- `2026-09-15` — Proje için 4 agent tanımı (`planner`, `ui-agent`, `builder`, `reviewer`) ve bu REMINDER.md dosyası oluşturuldu. Henüz kod değişikliği yapılmadı. Sıradaki adım: `planner`'ı çağırıp DB modelleme görevini başlatmak.

