import React, { useEffect, useState } from 'react';
import './Weather.css';

const WMO_CODES = {
  0:  { label: 'Clear sky',          icon: '☀️' },
  1:  { label: 'Mainly clear',       icon: '🌤️' },
  2:  { label: 'Partly cloudy',      icon: '⛅' },
  3:  { label: 'Overcast',           icon: '☁️' },
  45: { label: 'Fog',                icon: '🌫️' },
  48: { label: 'Icy fog',            icon: '🌫️' },
  51: { label: 'Light drizzle',      icon: '🌦️' },
  53: { label: 'Drizzle',            icon: '🌦️' },
  55: { label: 'Heavy drizzle',      icon: '🌧️' },
  61: { label: 'Slight rain',        icon: '🌧️' },
  63: { label: 'Rain',               icon: '🌧️' },
  65: { label: 'Heavy rain',         icon: '🌧️' },
  71: { label: 'Slight snow',        icon: '🌨️' },
  73: { label: 'Snow',               icon: '❄️' },
  75: { label: 'Heavy snow',         icon: '❄️' },
  80: { label: 'Slight showers',     icon: '🌦️' },
  81: { label: 'Showers',            icon: '🌧️' },
  82: { label: 'Heavy showers',      icon: '⛈️' },
  95: { label: 'Thunderstorm',       icon: '⛈️' },
  96: { label: 'Thunderstorm + hail',icon: '⛈️' },
  99: { label: 'Thunderstorm + hail',icon: '⛈️' },
};

function wmoLookup(code) {
  return WMO_CODES[code] ?? { label: 'Unknown', icon: '🌡️' };
}

async function fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,` +
    `wind_speed_10m,precipitation,weather_code` +
    `&wind_speed_unit=mph&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Your location';
  } catch {
    return 'Your location';
  }
}

export default function Weather() {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const [data, name] = await Promise.all([
            fetchWeather(lat, lon),
            reverseGeocode(lat, lon),
          ]);
          setWeather(data.current);
          setCity(name);
        } catch {
          setError('Could not load weather data.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location access denied. Allow location to see weather.');
        setLoading(false);
      }
    );
  }, []);

  if (loading) return <div className="weather-panel loading">Loading weather…</div>;
  if (error)   return <div className="weather-panel error">{error}</div>;
  if (!weather) return null;

  const { label, icon } = wmoLookup(weather.weather_code);

  return (
    <div className="weather-panel">
      <div className="weather-top">
        <div>
          <p className="weather-city">{city}</p>
          <p className="weather-condition">{icon} {label}</p>
        </div>
        <div className="weather-temp">{Math.round(weather.temperature_2m)}°C</div>
      </div>
      <div className="weather-stats">
        <div className="weather-stat">
          <span className="ws-label">Feels like</span>
          <span className="ws-value">{Math.round(weather.apparent_temperature)}°C</span>
        </div>
        <div className="weather-stat">
          <span className="ws-label">Humidity</span>
          <span className="ws-value">{weather.relative_humidity_2m}%</span>
        </div>
        <div className="weather-stat">
          <span className="ws-label">Wind</span>
          <span className="ws-value">{Math.round(weather.wind_speed_10m)} mph</span>
        </div>
        <div className="weather-stat">
          <span className="ws-label">Precip.</span>
          <span className="ws-value">{weather.precipitation} mm</span>
        </div>
      </div>
      <p className="weather-source">
        Weather data via <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> · No API key required
      </p>
    </div>
  );
}
