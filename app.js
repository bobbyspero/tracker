// Tech Layoffs Tracker - Main Application
class LayoffTracker {
    constructor() {
        this.layoffsData = [];
        this.map = null;
        this.heatLayer = null;
        this.isPlaying = false;
        this.currentIndex = 0;
        this.animationInterval = null;
        this.animationSpeed = 1000;
        this.markers = [];

        this.init();
    }

    async init() {
        this.setupUI();
        await this.loadData();
        this.initMap();
        this.updateStats();
        this.startTicker();
        this.setupEventListeners();
        this.addLog('SYSTEM INITIALIZED SUCCESSFULLY');
    }

    setupUI() {
        // Display current date
        const dateElement = document.getElementById('current-date');
        const now = new Date();
        dateElement.textContent = now.toISOString().split('T')[0];
    }

    async loadData() {
        try {
            const response = await fetch('data/layoffs.json');
            this.layoffsData = await response.json();

            // Sort by date
            this.layoffsData.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Update data count
            document.getElementById('data-count').textContent = this.layoffsData.length;

            this.addLog(`LOADED ${this.layoffsData.length} LAYOFF EVENTS`);
        } catch (error) {
            console.error('Error loading data:', error);
            this.addLog('ERROR: FAILED TO LOAD DATA - USING SAMPLE DATA');
            this.loadSampleData();
        }
    }

    loadSampleData() {
        // Fallback sample data if JSON file is not found
        this.layoffsData = [
            { company: 'Meta', date: '2024-01-15', count: 10000, location: 'Menlo Park, CA', lat: 37.4529, lng: -122.1817 },
            { company: 'Amazon', date: '2024-01-20', count: 18000, location: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
            { company: 'Google', date: '2024-02-01', count: 12000, location: 'Mountain View, CA', lat: 37.386, lng: -122.0838 },
            { company: 'Microsoft', date: '2024-02-10', count: 10000, location: 'Redmond, WA', lat: 47.6740, lng: -122.1215 },
            { company: 'Twitter', date: '2024-02-15', count: 3700, location: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
            { company: 'Salesforce', date: '2024-03-01', count: 8000, location: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
            { company: 'Stripe', date: '2024-03-10', count: 1000, location: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
            { company: 'Spotify', date: '2024-03-15', count: 600, location: 'Stockholm, Sweden', lat: 59.3293, lng: 18.0686 },
            { company: 'Dell', date: '2024-04-01', count: 6650, location: 'Round Rock, TX', lat: 30.5083, lng: -97.6789 },
            { company: 'IBM', date: '2024-04-05', count: 3900, location: 'Armonk, NY', lat: 41.1196, lng: -73.7198 },
            { company: 'SAP', date: '2024-04-20', count: 3000, location: 'Walldorf, Germany', lat: 49.2978, lng: 8.6442 },
            { company: 'PayPal', date: '2024-05-01', count: 2500, location: 'San Jose, CA', lat: 37.3382, lng: -121.8863 },
            { company: 'Snap', date: '2024-05-10', count: 1200, location: 'Santa Monica, CA', lat: 34.0195, lng: -118.4912 },
            { company: 'Shopify', date: '2024-05-15', count: 1000, location: 'Ottawa, Canada', lat: 45.4215, lng: -75.6972 },
            { company: 'Zoom', date: '2024-06-01', count: 1300, location: 'San Jose, CA', lat: 37.3382, lng: -121.8863 },
            { company: 'Lyft', date: '2024-06-10', count: 1072, location: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
            { company: 'DoorDash', date: '2024-06-20', count: 1250, location: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
            { company: 'Cisco', date: '2024-07-01', count: 4000, location: 'San Jose, CA', lat: 37.3382, lng: -121.8863 },
            { company: 'Intel', date: '2024-07-15', count: 15000, location: 'Santa Clara, CA', lat: 37.3541, lng: -121.9552 },
            { company: 'Oracle', date: '2024-08-01', count: 2000, location: 'Austin, TX', lat: 30.2672, lng: -97.7431 }
        ];

        this.layoffsData.sort((a, b) => new Date(a.date) - new Date(b.date));
        document.getElementById('data-count').textContent = this.layoffsData.length;
    }

    initMap() {
        // Initialize Leaflet map
        this.map = L.map('map', {
            center: [37.0902, -95.7129], // Center of USA
            zoom: 4,
            zoomControl: true,
            minZoom: 2,
            maxZoom: 10
        });

        // Add dark tile layer for terminal aesthetic
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);

        // Initialize with all data showing
        this.updateHeatMap(this.layoffsData);

        this.addLog('MAP INITIALIZED');
    }

    updateHeatMap(dataSlice) {
        // Remove existing heat layer
        if (this.heatLayer) {
            this.map.removeLayer(this.heatLayer);
        }

        // Remove existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Prepare heat data: [lat, lng, intensity]
        const heatData = dataSlice.map(item => {
            // Normalize intensity based on layoff count (0-1 scale)
            const intensity = Math.min(item.count / 5000, 2);
            return [item.lat, item.lng, intensity];
        });

        // Add heat layer
        this.heatLayer = L.heatLayer(heatData, {
            radius: 30,
            blur: 40,
            maxZoom: 10,
            max: 1.0,
            gradient: {
                0.0: '#00ff00',
                0.4: '#ffff00',
                0.7: '#ff8800',
                1.0: '#ff0000'
            }
        }).addTo(this.map);

        // Add markers with popups
        dataSlice.forEach(item => {
            const marker = L.circleMarker([item.lat, item.lng], {
                radius: 5,
                fillColor: '#00ff00',
                color: '#00ff00',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.4
            }).addTo(this.map);

            marker.bindPopup(`
                <div style="font-family: 'VT323', monospace;">
                    <strong>${item.company}</strong><br>
                    DATE: ${item.date}<br>
                    LAYOFFS: ${item.count.toLocaleString()}<br>
                    LOCATION: ${item.location}
                </div>
            `);

            this.markers.push(marker);
        });
    }

    updateStats() {
        const totalLayoffs = this.layoffsData.reduce((sum, item) => sum + item.count, 0);
        const companies = new Set(this.layoffsData.map(item => item.company)).size;
        const locations = new Set(this.layoffsData.map(item => item.location)).size;
        const latestDate = this.layoffsData.length > 0
            ? this.layoffsData[this.layoffsData.length - 1].date
            : 'N/A';

        document.getElementById('total-layoffs').textContent = totalLayoffs.toLocaleString();
        document.getElementById('total-companies').textContent = companies;
        document.getElementById('total-locations').textContent = locations;
        document.getElementById('latest-date').textContent = latestDate;

        // Calculate severity
        const avgLayoffsPerEvent = totalLayoffs / this.layoffsData.length;
        let severity = 'LOW';
        if (avgLayoffsPerEvent > 5000) severity = 'CRITICAL';
        else if (avgLayoffsPerEvent > 2000) severity = 'HIGH';
        else if (avgLayoffsPerEvent > 1000) severity = 'MEDIUM';

        const severityElement = document.getElementById('severity');
        severityElement.textContent = severity;
        severityElement.className = 'stat-value ' + (severity === 'CRITICAL' || severity === 'HIGH' ? 'critical' : '');

        // Populate companies list
        this.updateCompaniesList();
    }

    updateCompaniesList() {
        // Aggregate layoffs by company
        const companyMap = {};
        this.layoffsData.forEach(item => {
            if (companyMap[item.company]) {
                companyMap[item.company] += item.count;
            } else {
                companyMap[item.company] = item.count;
            }
        });

        // Convert to array and sort by count (descending)
        const companiesArray = Object.entries(companyMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // Populate the list
        const companiesList = document.getElementById('companies-list');
        companiesList.innerHTML = '';

        companiesArray.forEach(company => {
            const entry = document.createElement('div');
            entry.className = 'company-entry';
            entry.innerHTML = `
                <span class="company-name">${company.name}</span>
                <span class="company-count">${company.count.toLocaleString()}</span>
            `;
            companiesList.appendChild(entry);
        });
    }

    startTicker() {
        const ticker = document.getElementById('ticker');
        let tickerContent = '';

        this.layoffsData.forEach(item => {
            tickerContent += `▮▮ ${item.date} - ${item.company}: ${item.count.toLocaleString()} LAYOFFS in ${item.location} ▮▮ `;
        });

        // Duplicate for seamless loop
        ticker.textContent = tickerContent + tickerContent;
    }

    setupEventListeners() {
        // Play button
        document.getElementById('play-btn').addEventListener('click', () => {
            this.playAnimation();
        });

        // Pause button
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.pauseAnimation();
        });

        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetAnimation();
        });

        // Speed select
        document.getElementById('speed-select').addEventListener('change', (e) => {
            this.animationSpeed = parseInt(e.target.value);
            if (this.isPlaying) {
                this.pauseAnimation();
                this.playAnimation();
            }
        });

        // Timeline slider
        const timelineRange = document.getElementById('timeline-range');
        timelineRange.max = this.layoffsData.length - 1;
        timelineRange.addEventListener('input', (e) => {
            if (!this.isPlaying) {
                this.currentIndex = parseInt(e.target.value);
                this.updateTimeline();
            }
        });
    }

    playAnimation() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        document.getElementById('play-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;

        this.addLog('TIMELINE ANIMATION STARTED');

        this.animationInterval = setInterval(() => {
            if (this.currentIndex >= this.layoffsData.length) {
                this.pauseAnimation();
                this.addLog('TIMELINE ANIMATION COMPLETED');
                return;
            }

            this.updateTimeline();
            this.currentIndex++;
        }, this.animationSpeed);
    }

    pauseAnimation() {
        this.isPlaying = false;
        document.getElementById('play-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;

        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }

        this.addLog('TIMELINE ANIMATION PAUSED');
    }

    resetAnimation() {
        this.pauseAnimation();
        this.currentIndex = 0;
        this.updateTimeline();
        this.addLog('TIMELINE RESET TO START');
    }

    updateTimeline() {
        const dataSlice = this.layoffsData.slice(0, this.currentIndex + 1);

        // Update map
        this.updateHeatMap(dataSlice);

        // Update timeline UI
        const timelineRange = document.getElementById('timeline-range');
        timelineRange.value = this.currentIndex;

        const progressBar = document.getElementById('progress-bar');
        const progress = ((this.currentIndex + 1) / this.layoffsData.length) * 100;
        progressBar.style.width = progress + '%';

        // Update timeline date
        const timelineDate = document.getElementById('timeline-date');
        if (this.currentIndex < this.layoffsData.length) {
            const currentEvent = this.layoffsData[this.currentIndex];
            timelineDate.textContent = `${currentEvent.date} - ${currentEvent.company} (${currentEvent.count.toLocaleString()})`;

            // Add to log
            if (this.isPlaying) {
                this.addLog(`${currentEvent.date} | ${currentEvent.company} | ${currentEvent.count.toLocaleString()} LAYOFFS | ${currentEvent.location}`);
            }
        } else {
            timelineDate.textContent = 'END OF TIMELINE';
        }
    }

    addLog(message) {
        const logContent = document.getElementById('log-content');
        const timestamp = new Date().toTimeString().split(' ')[0];
        const entry = document.createElement('div');
        entry.className = 'log-entry new';
        entry.textContent = `[${timestamp}] ${message}`;

        // Add to top
        if (logContent.firstChild) {
            logContent.insertBefore(entry, logContent.firstChild);
        } else {
            logContent.appendChild(entry);
        }

        // Limit to 50 entries
        while (logContent.children.length > 50) {
            logContent.removeChild(logContent.lastChild);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LayoffTracker();
});
