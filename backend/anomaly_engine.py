import os
from collections import deque
from datetime import datetime, timedelta
import joblib
import pandas as pd
from notifier import dispatch_alert


class CPUAnomalyMonitor:
    def __init__(self, model_path: str = "cpu_anomaly_model_v2.joblib"):
        self.window_size = 6
        # Her sunucu için son 6 CPU ölçümünü hafızada tutar
        self.history = {}
        # Her sunucu için devam eden olay (event) bilgisi ve son bildirim zamanı
        self.active_events = {}
        # Panelde göstermek için geçmiş alarmlar (son 100 olay)
        self.alert_logs = deque(maxlen=100)

        self.cooldown_minutes = int(os.getenv("ALERT_COOLDOWN_MINUTES", "10"))
        self.rapid_change_threshold = 15.0
        self.high_cpu_threshold = 80.0
        self.critical_cpu_threshold = 85.0

        self.model = None
        if os.path.exists(model_path):
            try:
                artifact = joblib.load(model_path)
                # Eğer sözlük olarak kaydettiysek içinden modeli al, doğrudan modelse kendisini al
                self.model = artifact["model"] if isinstance(artifact, dict) else artifact
                print(f"[AnomalyEngine] Model başarıyla yüklendi: {model_path}")
            except Exception as e:
                print(f"[AnomalyEngine] Model yüklenemedi, kural tabanlı modda çalışacak: {e}")
        else:
            print(f"[AnomalyEngine] '{model_path}' bulunamadı. Şimdilik kural tabanlı çalışıyor.")

    def process_metric(self, server_id: str, cpu_value: float) -> dict:
        now = datetime.now()

        if server_id not in self.history:
            self.history[server_id] = deque(maxlen=self.window_size)

        server_hist = self.history[server_id]
        prev_cpu = server_hist[-1] if len(server_hist) > 0 else cpu_value
        server_hist.append(cpu_value)

        # 1. Özellikleri (Features) hesapla
        rolling_mean = sum(server_hist) / len(server_hist)
        cpu_change = cpu_value - prev_cpu

        # 2. Model ve Kuralları Değerlendir
        ml_anomaly = False
        anomaly_score = 0.0

        if self.model is not None and len(server_hist) >= self.window_size:
            X = pd.DataFrame([{
                "value": cpu_value,
                "rolling_mean": rolling_mean,
                "cpu_change": cpu_change
            }])
            pred = self.model.predict(X)[0]
            anomaly_score = float(self.model.decision_function(X)[0])
            ml_anomaly = (pred == -1)

        rapid_change = abs(cpu_change) >= self.rapid_change_threshold
        high_cpu = cpu_value >= self.high_cpu_threshold
        is_candidate = ml_anomaly or rapid_change or high_cpu

        if not is_candidate:
            return {
                "is_anomaly": False,
                "severity": "Normal",
                "cpu": cpu_value,
                "rolling_mean": round(rolling_mean, 2),
                "cpu_change": round(cpu_change, 2)
            }

        # 3. Olay Gruplama (10 dakikadan yakın anomalileri tek olayda birleştir)
        event = self.active_events.get(server_id)
        if event and (now - event["last_seen"]) <= timedelta(minutes=self.cooldown_minutes):
            event["last_seen"] = now
            event["points"] += 1
            event["min_cpu"] = min(event["min_cpu"], cpu_value)
            event["max_cpu"] = max(event["max_cpu"], cpu_value)
            event["max_change"] = max(event["max_change"], abs(cpu_change))
            event["duration_minutes"] = (now - event["start"]).total_seconds() / 60.0
        else:
            event = {
                "server_id": server_id,
                "start": now,
                "last_seen": now,
                "points": 1,
                "min_cpu": cpu_value,
                "max_cpu": cpu_value,
                "max_change": abs(cpu_change),
                "duration_minutes": 0.0,
                "notified_severity": None
            }
            self.active_events[server_id] = event

        # 4. Önem Derecesini (Severity) Belirle (Kaggle'daki mantığımızın birebir aynısı)
        severity = "Bilgi"
        reasons = []

        if ml_anomaly:
            reasons.append("ML Anomalisi")
        if rapid_change:
            reasons.append(f"Ani Değişim ({cpu_change:+.1f}p)")
        if high_cpu:
            reasons.append(f"Yüksek CPU (%{cpu_value:.1f})")

        if (event["points"] >= 2 and event["duration_minutes"] >= 10) or event["max_change"] >= self.rapid_change_threshold:
            severity = "Uyarı"

        if event["max_cpu"] >= self.critical_cpu_threshold and event["duration_minutes"] >= 10:
            severity = "Kritik"
        elif cpu_value >= 90.0:  # Anlık çok kritik sıçrama koruması
            severity = "Kritik"

        event["severity"] = severity
        reason_str = " + ".join(reasons)

        alert_payload = {
            "server_id": server_id,
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "cpu": cpu_value,
            "rolling_mean": round(rolling_mean, 2),
            "cpu_change": round(cpu_change, 2),
            "anomaly_score": round(anomaly_score, 4),
            "points": event["points"],
            "duration_minutes": round(event["duration_minutes"], 1),
            "severity": severity,
            "reason": reason_str
        }

        # 5. Bildirim Gönderimi (Aynı olay için tekrar tekrar spam yapmayı engeller)
        # Sadece olay ilk kez "Uyarı" olduğunda veya "Uyarı"dan "Kritik"e yükseldiğinde bildirim atar
        severity_rank = {"Bilgi": 1, "Uyarı": 2, "Kritik": 3}
        last_notified_rank = severity_rank.get(event["notified_severity"], 0)

        if severity in ["Uyarı", "Kritik"] and severity_rank[severity] > last_notified_rank:
            dispatch_alert(server_id, alert_payload)
            event["notified_severity"] = severity

        self.alert_logs.appendleft(alert_payload)
        return {"is_anomaly": True, **alert_payload}


# Global instance
monitor = CPUAnomalyMonitor()