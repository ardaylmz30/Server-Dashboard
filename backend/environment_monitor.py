import os
from collections import deque
from datetime import datetime, timedelta
from notifier import dispatch_environment_alert


class EnvironmentMonitor:
    """ESP32 sensörlerinden gelen ortam sıcaklığı ve nem verilerini izler.

    CPU modeli (cpu_anomaly_model_v2) CPU yüzdeleriyle eğitildiği için sıcaklık
    verisine uygulanmaz. Burada CPUAnomalyMonitor'daki olay gruplama ve
    bildirim mantığı, sıcaklık/nem eşikleriyle kullanılır.
    """

    def __init__(self):
        self.window_size = 6
        # Her cihaz için son 6 sıcaklık ölçümü
        self.history = {}
        # Her cihazın en son gönderdiği ölçüm (panel için)
        self.latest = {}
        self.active_events = {}
        self.alert_logs = deque(maxlen=100)

        self.cooldown_minutes = int(os.getenv("ALERT_COOLDOWN_MINUTES", "10"))
        self.temp_warning = float(os.getenv("TEMP_WARNING_C", "27"))
        self.temp_critical = float(os.getenv("TEMP_CRITICAL_C", "32"))
        self.rapid_rise = float(os.getenv("TEMP_RAPID_RISE_C", "2"))
        self.humidity_low = float(os.getenv("HUMIDITY_LOW", "20"))
        self.humidity_high = float(os.getenv("HUMIDITY_HIGH", "80"))

    def process_reading(self, device_id: str, temperature: float,
                        humidity: float | None = None, cpu: float | None = None) -> dict:
        now = datetime.now()

        if device_id not in self.history:
            self.history[device_id] = deque(maxlen=self.window_size)

        device_hist = self.history[device_id]
        device_hist.append(temperature)

        # 1. Özellikler: son 3 ölçümün medyanı tek seferlik sensör hatalarını eler
        recent = sorted(list(device_hist)[-3:])
        smoothed = recent[len(recent) // 2]
        temp_rise = smoothed - min(device_hist)

        self.latest[device_id] = {
            "device_id": device_id,
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "temperature": temperature,
            "humidity": humidity,
            "smoothed_temperature": round(smoothed, 2),
        }

        # 2. Kuralları değerlendir
        high_temp = smoothed >= self.temp_warning
        rapid_rise = temp_rise >= self.rapid_rise
        bad_humidity = humidity is not None and not (self.humidity_low <= humidity <= self.humidity_high)
        is_candidate = high_temp or rapid_rise or bad_humidity

        if not is_candidate:
            self.latest[device_id]["severity"] = "Normal"
            return {"is_anomaly": False, **self.latest[device_id]}

        # 3. Olay gruplama (cooldown süresinden yakın anomalileri tek olayda birleştir)
        event = self.active_events.get(device_id)
        if event and (now - event["last_seen"]) <= timedelta(minutes=self.cooldown_minutes):
            event["last_seen"] = now
            event["points"] += 1
            event["max_temp"] = max(event["max_temp"], smoothed)
            event["duration_minutes"] = (now - event["start"]).total_seconds() / 60.0
        else:
            event = {
                "device_id": device_id,
                "start": now,
                "last_seen": now,
                "points": 1,
                "max_temp": smoothed,
                "duration_minutes": 0.0,
                "notified_severity": None
            }
            self.active_events[device_id] = event

        # 4. Önem derecesi
        reasons = []
        if high_temp:
            reasons.append(f"Yüksek Sıcaklık ({smoothed:.1f}°C)")
        if rapid_rise:
            reasons.append(f"Hızlı Isınma (+{temp_rise:.1f}°C)")
        if bad_humidity:
            reasons.append(f"Nem Aralık Dışı (%{humidity:.0f})")

        severity = "Uyarı"
        if smoothed >= self.temp_critical:
            severity = "Kritik"
        elif high_temp and event["duration_minutes"] >= self.cooldown_minutes:
            # Uyarı seviyesindeki sıcaklık uzun süre devam ediyorsa (ör. klima arızası)
            severity = "Kritik"

        event["severity"] = severity
        self.latest[device_id]["severity"] = severity

        alert_payload = {
            "device_id": device_id,
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "temperature": temperature,
            "smoothed_temperature": round(smoothed, 2),
            "temp_rise": round(temp_rise, 2),
            "humidity": humidity,
            "cpu": cpu,
            "points": event["points"],
            "duration_minutes": round(event["duration_minutes"], 1),
            "severity": severity,
            "reason": " + ".join(reasons)
        }

        # 5. Bildirim: olay ilk kez Uyarı olduğunda veya Kritik'e yükseldiğinde
        severity_rank = {"Uyarı": 1, "Kritik": 2}
        last_notified_rank = severity_rank.get(event["notified_severity"], 0)

        if severity_rank[severity] > last_notified_rank:
            dispatch_environment_alert(device_id, alert_payload)
            event["notified_severity"] = severity

        self.alert_logs.appendleft(alert_payload)
        return {"is_anomaly": True, **alert_payload}


# Global instance
env_monitor = EnvironmentMonitor()
