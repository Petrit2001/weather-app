// ------------------------------------------------------------
// Konfiguration
// ------------------------------------------------------------
// Trage hier deinen OpenWeather-API-Key ein (siehe Schritt 2 im Tutorial).
// Wichtig: Key niemals öffentlich teilen oder auf GitHub hochladen!
const API_KEY = "DEIN_API_KEY_HIER";

const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

// ------------------------------------------------------------
// DOM-Elemente
// ------------------------------------------------------------
const form = document.getElementById("weather-search");
const searchInput = document.getElementById("search");
const submitButton = document.getElementById("submit");
const weatherData = document.getElementById("weather-data");

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
  const url = `${GEO_URL}?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
  const results = await fetchJson(url);
  return results.length > 0 ? results[0] : null;
}

// 2) Koordinaten -> aktuelles Wetter (Current Weather API)
//    units=metric liefert direkt °C, lang=de die deutsche Beschreibung.
async function getWeatherData(lon, lat) {
  const url =
    `${WEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&lang=de&appid=${API_KEY}`;
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

  if (API_KEY === "DEIN_API_KEY_HIER") {
    showMessage(
      "API-Key fehlt",
      "Trage deinen OpenWeather-API-Key oben in script.js ein."
    );
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
