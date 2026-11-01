// ------------------------------------------------------------
// Konfiguration
// ------------------------------------------------------------
// Der API-Key steht NICHT im Code. Jeder Besucher trägt seinen eigenen Key
// in das Feld auf der Seite ein; er wird nur im Browser (localStorage) gespeichert.
const STORAGE_KEY = "weather-app-api-key";

const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

// Fest eingebauter Key: Die App funktioniert damit sofort, ohne Eingabe.
// Achtung: Er ist im öffentlichen Code sichtbar. Bei Missbrauch bei OpenWeather
// einen neuen Key erzeugen und hier ersetzen. Leer lassen ("") = Eingabefeld wird angezeigt.
const DEFAULT_API_KEY = "c1530abbbb3b878dc092ad14e4dc3a87";

// OpenWeather-Keys bestehen aus 32 Hex-Zeichen
const KEY_PATTERN = /^[a-f0-9]{32}$/i;

// ------------------------------------------------------------
// DOM-Elemente
// ------------------------------------------------------------
const form = document.getElementById("weather-search");
const searchInput = document.getElementById("search");
const submitButton = document.getElementById("submit");
const weatherData = document.getElementById("weather-data");

const keyForm = document.getElementById("key-form");
const keyInput = document.getElementById("api-key");
const keyClearButton = document.getElementById("key-clear");
const keyHint = document.getElementById("key-hint");
const defaultHintHtml = keyHint.innerHTML;

// ------------------------------------------------------------
// API-Key-Verwaltung
// ------------------------------------------------------------

// Der Key liegt zusätzlich im Speicher, falls localStorage blockiert ist
// (z. B. im privaten Modus). Dann gilt er bis zum Neuladen der Seite.
let apiKey = "";

function loadStoredKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function storeKey(key) {
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    // Speichern nicht möglich: Key bleibt nur bis zum Neuladen im Speicher.
  }
}

function updateKeyUi(message, kind) {
  keyInput.value = "";
  keyInput.placeholder = apiKey ? "API-Key gespeichert ✓" : "API-Key einfügen";
  keyClearButton.hidden = !apiKey;

  if (message) {
    keyHint.textContent = message;
    keyHint.className = kind || "";
  } else {
    keyHint.innerHTML = defaultHintHtml;
    keyHint.className = "";
  }
}

keyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = keyInput.value.trim();

  if (!KEY_PATTERN.test(value)) {
    keyHint.textContent =
      "Das sieht nicht nach einem gültigen Key aus. Er besteht aus 32 Zeichen (Buchstaben a–f und Zahlen).";
    keyHint.className = "error";
    return;
  }

  apiKey = value;
  storeKey(apiKey);
  updateKeyUi("Key gespeichert. Du kannst jetzt nach einer Stadt suchen.", "saved");
  searchInput.focus();
});

keyClearButton.addEventListener("click", () => {
  apiKey = "";
  storeKey("");
  updateKeyUi();
});

apiKey = loadStoredKey() || DEFAULT_API_KEY;
updateKeyUi();

// Mit fest eingebautem Key braucht der Besucher das Eingabefeld nicht.
if (DEFAULT_API_KEY) {
  keyForm.hidden = true;
}

// ------------------------------------------------------------
// Hilfsfunktionen
// ------------------------------------------------------------

// Kleiner Helfer zum Erzeugen von Elementen.
// textContent statt innerHTML: Benutzereingaben können so keinen Code einschleusen.
function createElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function showMessage(title, text) {
  weatherData.replaceChildren();
  weatherData.className = "error";
  weatherData.hidden = false;

  weatherData.append(createElement("h2", title), createElement("p", text));
}

function showWeather(place, weather) {
  const icon = weather.weather[0].icon;
  const description = weather.weather[0].description;

  const img = document.createElement("img");
  img.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
  img.alt = description;
  img.width = 100;
  img.height = 100;

  const info = document.createElement("div");
  const country = place.country ? `, ${place.country}` : "";

  const windKmh = Math.round(weather.wind.speed * 3.6);

  info.append(
    createElement("h2", `${place.name}${country}`),
    createElement("p", `${Math.round(weather.main.temp)} °C`, "temp"),
    createElement("p", description, "description"),
    createElement("p", `Gefühlt: ${Math.round(weather.main.feels_like)} °C`),
    createElement("p", `Luftfeuchtigkeit: ${weather.main.humidity} %`),
    createElement("p", `Wind: ${windKmh} km/h`)
  );

  weatherData.replaceChildren(img, info);
  weatherData.className = "";
  weatherData.hidden = false;
}

// Gemeinsame Fetch-Funktion mit sauberer Fehlerbehandlung
async function fetchJson(url) {
  const response = await fetch(url);

  if (response.status === 401) {
    throw new Error("API_KEY_INVALID");
  }
  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`);
  }
  return response.json();
}

// ------------------------------------------------------------
// API-Aufrufe
// ------------------------------------------------------------

// 1) Stadtname -> Koordinaten (Geocoding API)
//    Eingaben wie "Heilbronn", "Heilbronn, DE" oder "Brooklyn, US" funktionieren.
async function getLonAndLat(city) {
  const url = `${GEO_URL}?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
  const results = await fetchJson(url);
  return results.length > 0 ? results[0] : null;
}

// 2) Koordinaten -> aktuelles Wetter (Current Weather API)
//    units=metric liefert direkt °C, lang=de die deutsche Beschreibung.
async function getWeatherData(lon, lat) {
  const url =
    `${WEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&lang=de&appid=${apiKey}`;
  return fetchJson(url);
}

// ------------------------------------------------------------
// Hauptfunktion
// ------------------------------------------------------------
async function fetchWeather() {
  const city = searchInput.value.trim();

  if (city === "") {
    showMessage("Leere Eingabe!", "Bitte gib einen gültigen Stadtnamen ein.");
    return;
  }

  if (!apiKey) {
    showMessage(
      "API-Key fehlt",
      "Trage oben deinen OpenWeather-API-Key ein und klicke auf „Speichern“."
    );
    keyInput.focus();
    return;
  }

  submitButton.disabled = true;

  try {
    const place = await getLonAndLat(city);

    if (!place) {
      showMessage(
        `Ungültige Eingabe: "${city}"`,
        "Ort nicht gefunden. Bitte versuche es mit einem gültigen Stadtnamen."
      );
      return;
    }

    const weather = await getWeatherData(place.lon, place.lat);
    showWeather(place, weather);
    searchInput.value = "";
  } catch (error) {
    console.error(error);

    if (error.message === "API_KEY_INVALID") {
      showMessage(
        "API-Key ungültig",
        "Prüfe deinen Key. Neue Keys brauchen manchmal ein bis zwei Stunden, bis sie aktiv sind."
      );
    } else if (error instanceof TypeError) {
      showMessage(
        "Keine Verbindung",
        "Die Wetterdaten konnten nicht geladen werden. Bist du online?"
      );
    } else {
      showMessage("Etwas ist schiefgelaufen", "Bitte versuche es später noch einmal.");
    }
  } finally {
    submitButton.disabled = false;
  }
}

// Klick auf "Suchen" und Enter-Taste werden beide über das Formular abgefangen.
form.addEventListener("submit", (event) => {
  event.preventDefault();
  fetchWeather();
});
