#pragma once

// ESP32 yalnızca 2.4 GHz ağlara bağlanır
const char* WIFI_SSID = "WIFI_ADI";
const char* WIFI_PASSWORD = "WIFI_SIFRESI";

// Backend'in çalıştığı bilgisayarın yerel ağ IP'si (ipconfig ile bakın).
// "localhost" çalışmaz: ESP32 için localhost kendisidir.
const char* SERVER_URL = "http://192.168.1.50:8000";

// backend/.env içindeki SENSOR_API_KEY (yoksa DASHBOARD_API_KEY)
const char* SENSOR_API_KEY = "BURAYA_ANAHTAR";

// Bildirimlerde görünen sensör adı (harf, rakam, - ve _)
const char* DEVICE_ID = "server-room";
