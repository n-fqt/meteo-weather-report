const API = "https://api.open-meteo.com/v1/forecast";
const GEO = "https://geocoding-api.open-meteo.com/v1/search";

const $ = (id) => document.getElementById(id);

const state = {
  unit: "c",
  data: null,
  place: "Paris",
};

const codes = {
  0: ["Ensoleillé", "☀️"],
  1: ["Peu nuageux", "🌤️"],
  2: ["Partiellement nuageux", "⛅"],
  3: ["Couvert", "☁️"],
  45: ["Brouillard", "🌫️"],
  48: ["Brouillard givrant", "🌫️"],
  51: ["Bruine légère", "🌦️"],
  53: ["Bruine", "🌦️"],
  55: ["Bruine dense", "🌧️"],
  56: ["Bruine verglaçante", "🌧️"],
  57: ["Bruine verglaçante", "🌧️"],
  61: ["Pluie faible", "🌦️"],
  63: ["Pluie", "🌧️"],
  65: ["Forte pluie", "🌧️"],
  66: ["Pluie verglaçante", "🌧️"],
  67: ["Pluie verglaçante", "🌧️"],
  71: ["Neige faible", "🌨️"],
  73: ["Neige", "🌨️"],
  75: ["Forte neige", "❄️"],
  77: ["Grains de neige", "🌨️"],
  80: ["Averses faibles", "🌦️"],
  81: ["Averses", "🌧️"],
  82: ["Fortes averses", "⛈️"],
  85: ["Averses de neige", "🌨️"],
  86: ["Fortes averses de neige", "❄️"],
  95: ["Orage", "⛈️"],
  96: ["Orage et grêle", "⛈️"],
  99: ["Orage et forte grêle", "⛈️"],
};

const wx = (code) => codes[code] || ["Conditions variables", "🌤️"];

function degrees(celsius) {
  return Math.round(state.unit === "c" ? celsius : (celsius * 9) / 5 + 32);
}

function temperature(celsius) {
  return `${degrees(celsius)}°`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function windDirection(value) {
  return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][
    Math.round(value / 45) % 8
  ];
}

function showStatus(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}

function renderWeather() {
  const data = state.data;
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;

  $("place").textContent = state.place;
  $("temp").innerHTML = `${degrees(current.temperature_2m)}<sup>°</sup>`;
  $("feels").textContent = temperature(current.apparent_temperature);

  const [description, icon] = wx(current.weather_code);
  $("summary").textContent = description;
  $("icon").textContent = icon;

  $("high").textContent = temperature(daily.temperature_2m_max[0]);
  $("low").textContent = temperature(daily.temperature_2m_min[0]);
  $("sunrise").textContent = formatTime(daily.sunrise[0]);
  $("sunset").textContent = formatTime(daily.sunset[0]);
  $("wind").textContent = Math.round(current.wind_speed_10m);
  $("direction").textContent = windDirection(current.wind_direction_10m);
  $("humidity").textContent = Math.round(current.relative_humidity_2m);

  const rain =
    hourly.precipitation_probability[0] ||
    daily.precipitation_probability_max[0];
  $("rain").textContent = `${Math.round(rain)}%`;

  const uv = daily.uv_index_max[0] || 0;
  $("uv").textContent = Math.round(uv);
  $("uvlabel").textContent =
    uv < 3
      ? "Faible"
      : uv < 6
        ? "Modéré"
        : uv < 8
          ? "Élevé"
          : uv < 11
            ? "Très élevé"
            : "Extrême";

  const now = new Date(current.time).getTime();
  const upcomingHours = hourly.time
    .map((time, index) => ({ time, index }))
    .filter((item) => new Date(item.time).getTime() >= now)
    .slice(0, 6);

  $("hours").innerHTML = upcomingHours
    .map(
      (item, index) => `
    <div class="hour">
      <time>${index === 0 ? "Maint." : formatTime(item.time)}</time>
      <i>${wx(hourly.weather_code[item.index])[1]}</i>
      <b>${temperature(hourly.temperature_2m[item.index])}</b>
    </div>
  `,
    )
    .join("");

  const minimum = Math.min(...daily.temperature_2m_min);
  const maximum = Math.max(...daily.temperature_2m_max);
  const spread = Math.max(1, maximum - minimum);

  $("days").innerHTML = daily.time
    .slice(0, 5)
    .map((day, index) => {
      const name =
        index === 0
          ? "Aujourd'hui"
          : new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(
              new Date(day),
            );

      const left = ((daily.temperature_2m_min[index] - minimum) / spread) * 100;
      const width = Math.max(
        12,
        ((daily.temperature_2m_max[index] - daily.temperature_2m_min[index]) /
          spread) *
          100,
      );

      return `
      <div class="day">
        <span>${name}</span>
        <span class="dayicon">${wx(daily.weather_code[index])[1]}</span>
        <span class="daylow">${temperature(daily.temperature_2m_min[index])}</span>
        <span class="bar"><i style="left:${left}%;width:${width}%"></i></span>
        <b class="dayhigh">${temperature(daily.temperature_2m_max[index])}</b>
      </div>
    `;
    })
    .join("");

  $("date").textContent = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .toLocaleUpperCase("fr-FR");

  $("units").innerHTML =
    state.unit === "c" ? "°C <span>/</span> °F" : "°F <span>/</span> °C";
}

async function loadWeather(latitude, longitude, place) {
  showStatus("Récupération des conditions météo…");

  const params = new URLSearchParams({
    latitude,
    longitude,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",
    timezone: "auto",
    forecast_days: 5,
  });

  try {
    const response = await fetch(`${API}?${params}`);

    if (!response.ok) {
      throw new Error("Service météo indisponible.");
    }

    state.data = await response.json();
    state.place = place;
    renderWeather();
    showStatus("");
  } catch (error) {
    showStatus(error.message || "Vérifiez votre connexion.", true);
  }
}

async function searchCity(query) {
  if (!query.trim()) return;

  showStatus("Recherche de la ville…");

  try {
    const response = await fetch(
      `${GEO}?name=${encodeURIComponent(query)}&count=1&language=fr&format=json`,
    );

    const result = (await response.json()).results?.[0];

    if (!result) {
      showStatus("Ville introuvable. Essayez un autre nom.", true);
      return;
    }

    const place = [result.name, result.admin1, result.country]
      .filter((value, index, array) => value && array.indexOf(value) === index)
      .join(", ");

    loadWeather(result.latitude, result.longitude, place);
  } catch {
    showStatus("La recherche a échoué.", true);
  }
}

document.querySelector("#search").addEventListener("submit", (event) => {
  event.preventDefault();
  searchCity($("city").value);
});

document.querySelector("#units").addEventListener("click", () => {
  state.unit = state.unit === "c" ? "f" : "c";
  if (state.data) renderWeather();
});

document.querySelector("#locate").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("Géolocalisation indisponible.", true);
    return;
  }

  showStatus("Recherche de votre position…");

  navigator.geolocation.getCurrentPosition(
    (position) =>
      loadWeather(
        position.coords.latitude,
        position.coords.longitude,
        "Votre position",
      ),
    () =>
      showStatus(
        "Position refusée ou indisponible. Recherchez une ville.",
        true,
      ),
    { timeout: 10000, maximumAge: 300000 },
  );
});

if (window.lucide) {
  lucide.createIcons();
}

loadWeather(48.8566, 2.3522, "Paris");
