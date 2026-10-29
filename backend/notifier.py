import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from dotenv import load_dotenv

load_dotenv()

def send_email_alert(subject: str, body: str) -> bool:
    if os.getenv("SMTP_ENABLED", "false").lower() != "true":
        return False

    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    receiver = os.getenv("ALERT_RECEIVER_EMAIL")

    if not all([host, user, password, receiver]):
        print("[Notifier] SMTP ayarları eksik, e-posta gönderilemedi.")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = user
        msg["To"] = receiver
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
        print(f"[Notifier] E-posta gönderildi: {receiver}")
        return True
    except Exception as e:
        print(f"[Notifier] E-posta hatası: {e}")
        return False


def send_telegram_alert(message: str) -> bool:
    if os.getenv("TELEGRAM_ENABLED", "false").lower() != "true":
        return False

    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        print("[Notifier] Telegram ayarları eksik, mesaj gönderilemedi.")
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }

    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        print("[Notifier] Telegram bildirimi gönderildi.")
        return True
    except Exception as e:
        print(f"[Notifier] Telegram hatası: {e}")
        return False


def dispatch_alert(server_name: str, alert_data: dict):
    """Uyarı ve Kritik seviyesindeki olayları her iki kanala iletir."""
    severity = alert_data["severity"]
    if severity not in ["Uyarı", "Kritik"]:
        return

    icon = "🚨" if severity == "Kritik" else "⚠️"
    subject = f"{icon} [{severity}] Sunucu CPU Alarmı - {server_name}"

    message = (
        f"*{subject}*\n\n"
        f"🖥️ *Sunucu:* `{server_name}`\n"
        f"📊 *Anlık CPU:* `%{alert_data['cpu']:.2f}`\n"
        f"📈 *Hareketli Ort. (6 ölçüm):* `%{alert_data['rolling_mean']:.2f}`\n"
        f"⚡ *Anlık Değişim:* `{alert_data['cpu_change']:+.2f} puan`\n"
        f"🔍 *Tetiklenme Sebebi:* {alert_data['reason']}\n"
        f"🕒 *Zaman:* `{alert_data['timestamp']}`"
    )

    # E-posta için Markdown yıldızlarını temizleyelim
    plain_body = message.replace("*", "").replace("`", "")

    send_telegram_alert(message)
    send_email_alert(subject, plain_body)


def dispatch_environment_alert(device_id: str, alert_data: dict):
    """ESP32 ortam sensörü alarmlarını her iki kanala iletir."""
    severity = alert_data["severity"]
    icon = "🔥" if severity == "Kritik" else "🌡️"
    subject = f"{icon} [{severity}] Ortam Sıcaklığı Alarmı - {device_id}"

    humidity = alert_data.get("humidity")
    cpu = alert_data.get("cpu")
    lines = [
        f"*{subject}*\n",
        f"📟 *Sensör:* `{device_id}`",
        f"🌡️ *Sıcaklık:* `{alert_data['smoothed_temperature']:.1f}°C` (anlık `{alert_data['temperature']:.1f}°C`)",
        f"📈 *Son ölçümlerdeki artış:* `+{alert_data['temp_rise']:.1f}°C`",
    ]
    if humidity is not None:
        lines.append(f"💧 *Nem:* `%{humidity:.0f}`")
    if cpu is not None:
        lines.append(f"🖥️ *Sunucu CPU:* `%{cpu:.1f}`")
    lines += [
        f"🔍 *Tetiklenme Sebebi:* {alert_data['reason']}",
        f"🕒 *Zaman:* `{alert_data['timestamp']}`",
    ]
    message = "\n".join(lines)

    plain_body = message.replace("*", "").replace("`", "")

    send_telegram_alert(message)
    send_email_alert(subject, plain_body)