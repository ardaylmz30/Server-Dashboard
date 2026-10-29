// Server Dashboard - ESP32 ortam sıcaklığı/nem sensörü
//
// Gerekli kütüphaneler (Arduino IDE > Kütüphane Yöneticisi):
//   - "Adafruit AHTX0"
//   - "Adafruit Unified Sensor"
//
// secrets.example.h dosyasını aynı klasörde secrets.h olarak kopyalayıp doldurun.

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include "secrets.h"

// AHT20 I2C pinleri
#define SDA_PIN 21
#define SCL_PIN 22

// Backend'deki hareketli pencere 6 ölçüm: 10 sn aralıkla son 1 dakikayı kapsar
const unsigned long SEND_INTERVAL_MS = 10000;

Adafruit_AHTX0 aht;
bool ahtReady = false;
unsigned long lastSend = 0;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("WiFi'ye bağlanılıyor: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("Bağlandı, IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("WiFi bağlantısı kurulamadı, sonraki turda tekrar denenecek.");
  }
}

void sendReading(float temperature, float humidity) {
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/sensors/" + DEVICE_ID + "/readings";

  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", SENSOR_API_KEY);

  char body[96];
  snprintf(body, sizeof(body), "{\"temperature\":%.2f,\"humidity\":%.2f}", temperature, humidity);

  int code = http.POST(body);
  if (code == 200) {
    Serial.printf("Gönderildi: %.2f°C, %%%.1f nem -> %s\n", temperature, humidity, http.getString().c_str());
  } else if (code > 0) {
    Serial.printf("Sunucu hatası %d: %s\n", code, http.getString().c_str());
  } else {
    Serial.printf("Bağlantı hatası: %s\n", http.errorToString(code).c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);

  ahtReady = aht.begin();
  Serial.println(ahtReady ? "AHT20 bağlandı." : "AHT20 BULUNAMADI! Kabloları kontrol edin.");

  connectWiFi();
}

void loop() {
  if (millis() - lastSend < SEND_INTERVAL_MS) return;
  lastSend = millis();

  connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return;

  if (!ahtReady) ahtReady = aht.begin();

  sensors_event_t humidityEvent, tempEvent;
  if (!ahtReady || !aht.getEvent(&humidityEvent, &tempEvent)) {
    Serial.println("Sensör okunamadı, kabloları kontrol edin.");
    return;
  }

  float humidity = humidityEvent.relative_humidity;
  float temperature = tempEvent.temperature;

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Sensör okunamadı, kabloları kontrol edin.");
    return;
  }

  sendReading(temperature, humidity);
}
