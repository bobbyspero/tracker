# Tech Layoffs Tracker

An ASCII terminal-style website that tracks tech industry layoffs with an animated heat map visualization.

## Features

- **Terminal Aesthetic**: Retro ASCII design with green text and CRT effects
- **Live Ticker**: Scrolling display of latest tech layoffs
- **Heat Map**: Interactive map showing most affected geographical areas
- **Timeline Animation**: Watch layoffs spread over time with playback controls
- **Statistics Dashboard**: Real-time stats on total layoffs and affected companies

## Getting Started

Simply open `index.html` in a web browser. No build process required!

## Data Format

Layoff data is stored in `data/layoffs.json` with the following structure:
```json
{
  "company": "Company Name",
  "date": "2024-01-15",
  "count": 500,
  "location": "San Francisco, CA",
  "lat": 37.7749,
  "lng": -122.4194
}
```

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- Leaflet.js for mapping
- Leaflet.heat for heat map visualization
