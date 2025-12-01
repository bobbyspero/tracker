// Tech Layoffs Tracker - Main Application
class LayoffTracker {
    constructor() {
        this.layoffsData = [];
        this.canvas = null;
        this.ctx = null;
        this.isPlaying = false;
        this.currentIndex = 0;
        this.animationInterval = null;
        this.animationSpeed = 1000;
        this.markers = [];

        // Map view state
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

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
        // Initialize 2D canvas map
        const container = document.getElementById('map-canvas-container');

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        const width = container.clientWidth;
        const height = 500;
        this.canvas.width = width;
        this.canvas.height = height;

        container.appendChild(this.canvas);

        // Mouse controls for panning
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragStartX = e.clientX - this.offsetX;
            this.dragStartY = e.clientY - this.offsetY;
            this.canvas.style.cursor = 'grabbing';
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.offsetX = e.clientX - this.dragStartX;
                this.offsetY = e.clientY - this.dragStartY;
                this.render();
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= zoomFactor;
            this.scale = Math.max(0.5, Math.min(3, this.scale));
            this.render();
        });

        // Click to show marker info
        this.canvas.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.checkMarkerClick(e);
            }
        });

        // Touch controls for mobile
        let touchStartDistance = 0;
        let touchStartScale = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();

            if (e.touches.length === 1) {
                // Single touch - pan
                this.isDragging = true;
                this.dragStartX = e.touches[0].clientX - this.offsetX;
                this.dragStartY = e.touches[0].clientY - this.offsetY;
            } else if (e.touches.length === 2) {
                // Two finger pinch - zoom
                this.isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                touchStartDistance = Math.sqrt(dx * dx + dy * dy);
                touchStartScale = this.scale;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();

            if (e.touches.length === 1 && this.isDragging) {
                // Pan
                this.offsetX = e.touches[0].clientX - this.dragStartX;
                this.offsetY = e.touches[0].clientY - this.dragStartY;
                this.render();
            } else if (e.touches.length === 2) {
                // Pinch zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const scale = distance / touchStartDistance;
                this.scale = touchStartScale * scale;
                this.scale = Math.max(0.5, Math.min(3, this.scale));
                this.render();
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isDragging = false;

            // Check for tap on marker
            if (e.changedTouches.length === 1) {
                this.checkMarkerClick(e.changedTouches[0]);
            }
        }, { passive: false });

        // Handle window resize
        window.addEventListener('resize', () => {
            const width = container.clientWidth;
            this.canvas.width = width;
            this.render();
        });

        this.canvas.style.cursor = 'grab';

        // Initialize with all data showing
        this.updateHeatMap(this.layoffsData);

        this.addLog('FLAT MAP INITIALIZED');
    }

    // Convert lat/lng to canvas coordinates (Equirectangular projection)
    latLngToCanvas(lat, lng) {
        const x = (lng + 180) * (this.canvas.width / 360);
        const y = (90 - lat) * (this.canvas.height / 180);
        return { x, y };
    }

    // Draw the world map
    drawWorldMap() {
        const ctx = this.ctx;

        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context state
        ctx.save();

        // Apply pan and zoom transformations
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);

        // Draw grid lines (latitude and longitude)
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.lineWidth = 0.5;

        // Latitude lines
        for (let lat = -75; lat <= 75; lat += 15) {
            ctx.beginPath();
            for (let lng = -180; lng <= 180; lng += 5) {
                const pos = this.latLngToCanvas(lat, lng);
                if (lng === -180) {
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
            }
            ctx.stroke();
        }

        // Longitude lines
        for (let lng = -180; lng < 180; lng += 15) {
            ctx.beginPath();
            for (let lat = -90; lat <= 90; lat += 5) {
                const pos = this.latLngToCanvas(lat, lng);
                if (lat === -90) {
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
            }
            ctx.stroke();
        }

        // Draw equator (brighter)
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let lng = -180; lng <= 180; lng += 2) {
            const pos = this.latLngToCanvas(0, lng);
            if (lng === -180) {
                ctx.moveTo(pos.x, pos.y);
            } else {
                ctx.lineTo(pos.x, pos.y);
            }
        }
        ctx.stroke();

        // Draw continents
        this.drawContinents();

        // Restore context
        ctx.restore();
    }

    drawContinents() {
        const ctx = this.ctx;

        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
        ctx.lineWidth = 1;

        // Simplified but accurate continent shapes for flat map
        const continents = [
            // North America
            [[49, -125], [40, -124], [32.5, -117], [25, -112], [25, -80], [30, -80], [31, -81], [35, -76], [45, -67],
             [47, -52], [52, -55], [60, -64], [70, -70], [72, -90], [71, -105], [71, -125], [60, -135], [50, -130], [49, -125]],

            // Central America + Caribbean
            [[25, -112], [20, -105], [18, -95], [19, -88], [21, -87], [23, -82], [25, -80]],
            [[20, -87], [19.5, -72], [18, -77], [20, -78], [20, -87]],

            // South America
            [[12, -72], [10, -78], [0, -78], [-5, -81], [-15, -76], [-20, -70], [-33, -71], [-42, -73], [-56, -68],
             [-55, -67], [-53, -58], [-47, -58], [-34, -54], [-23, -43], [-5, -35], [5, -50], [11, -62], [12, -72]],

            // Europe (including Scandinavia and Mediterranean)
            [[71, 25], [70, 28], [60, 30], [60, 24], [58, 10], [56, 8], [55, 12], [53, 7], [51, 3], [48, -4], [43, -8],
             [36, -6], [36, 0], [35, 10], [36, 22], [38, 14], [41, 20], [43, 12], [45, 12], [47, 19], [49, 8], [52, 13],
             [59, 10], [63, 24], [70, 20], [71, 25]],

            // Africa
            [[36, 0], [37, 10], [32, 32], [31, 34], [20, 42], [12, 42], [10, 51], [5, 42], [-10, 40], [-18, 35], [-25, 32],
             [-34, 18], [-33, 25], [-20, 15], [-17, 15], [-15, 30], [-12, 37], [-4.5, 40], [10, 51], [11, 42], [15, 38],
             [18, 38], [30, 32], [35, 28], [36, 22], [35, 10], [36, 0]],

            // Asia (Russia to India to Southeast Asia)
            [[71, 25], [75, 50], [77, 100], [70, 180], [60, 180], [50, 157], [42, 142], [35, 136], [31, 130], [24, 120],
             [20, 110], [10, 104], [1, 104], [1, 114], [5, 120], [20, 106], [22, 95], [28, 88], [30, 80], [35, 75], [37, 68],
             [40, 60], [43, 58], [45, 48], [50, 40], [55, 50], [60, 40], [66, 40], [70, 35], [71, 25]],

            // Southeast Asia islands
            [[-6, 105], [-8, 110], [-9, 120], [-8, 125], [-3, 130], [6, 125], [8, 120], [6, 105], [-6, 105]],

            // Australia
            [[-10, 113], [-22, 114], [-35, 116], [-39, 140], [-38, 146], [-34, 150], [-28, 154], [-24, 153], [-17, 146],
             [-12, 136], [-11, 130], [-13, 125], [-15, 123], [-10, 113]],

            // New Zealand
            [[-34, 172], [-41, 174], [-47, 168], [-46, 166], [-37, 174], [-34, 172]],

            // Greenland
            [[83, -35], [83, -60], [71, -50], [70, -25], [76, -18], [81, -22], [83, -35]],

            // Madagascar
            [[-12, 43], [-15, 45], [-20, 47], [-25, 45], [-25, 43], [-20, 44], [-15, 43], [-12, 43]],

            // British Isles
            [[59, -3], [58, -6], [55, -8], [50, -5], [50, 0], [52, 2], [56, 0], [59, -3]],

            // Japan
            [[45, 142], [40, 140], [35, 135], [34, 136], [36, 141], [42, 143], [45, 142]],

            // Iceland
            [[66, -14], [66, -22], [64, -24], [63, -14], [66, -14]]
        ];

        // Draw each landmass
        continents.forEach(coords => {
            if (coords.length < 2) return;

            ctx.beginPath();
            coords.forEach(([lat, lng], index) => {
                const pos = this.latLngToCanvas(lat, lng);
                if (index === 0) {
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });
    }

    render() {
        // Draw world map
        this.drawWorldMap();

        // Draw markers
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);

        this.markers.forEach(marker => {
            const pos = this.latLngToCanvas(marker.lat, marker.lng);

            // Draw marker glow
            const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, marker.size * 2);
            gradient.addColorStop(0, marker.color);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, marker.size * 2, 0, Math.PI * 2);
            ctx.fill();

            // Draw marker
            ctx.fillStyle = marker.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, marker.size, 0, Math.PI * 2);
            ctx.fill();

            // Store screen position for click detection
            marker.screenX = pos.x * this.scale + this.offsetX;
            marker.screenY = pos.y * this.scale + this.offsetY;
        });

        ctx.restore();
    }

    checkMarkerClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Find clicked marker
        for (let i = this.markers.length - 1; i >= 0; i--) {
            const marker = this.markers[i];
            const dx = clickX - marker.screenX;
            const dy = clickY - marker.screenY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < marker.size * this.scale * 2) {
                this.showMarkerInfo(marker, event);
                break;
            }
        }
    }

    showMarkerInfo(data, event) {
        // Remove existing tooltip
        const existingTooltip = document.getElementById('marker-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'marker-tooltip';
        tooltip.className = 'marker-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-header">${data.company}</div>
            <div class="tooltip-row">
                <span class="tooltip-label">DATE:</span>
                <span class="tooltip-value">${data.date}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">LAYOFFS:</span>
                <span class="tooltip-value">${data.count.toLocaleString()}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">LOCATION:</span>
                <span class="tooltip-value">${data.location}</span>
            </div>
            <div class="tooltip-close">[CLICK TO CLOSE]</div>
        `;

        document.body.appendChild(tooltip);

        // Position tooltip near the map
        const mapContainer = document.getElementById('map-canvas-container');
        const rect = mapContainer.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - 150) + 'px';
        tooltip.style.top = (rect.top + 20) + 'px';

        // Close on click
        tooltip.addEventListener('click', () => {
            tooltip.remove();
        });

        // Auto-close after 10 seconds
        setTimeout(() => {
            if (document.getElementById('marker-tooltip')) {
                tooltip.remove();
            }
        }, 10000);

        this.addLog(`MARKER CLICKED: ${data.company} - ${data.count.toLocaleString()} layoffs`);
    }

    updateHeatMap(dataSlice) {
        // Clear existing markers
        this.markers = [];

        // Add new markers
        dataSlice.forEach(item => {
            // Determine color and size based on layoff count
            let color, size;
            if (item.count >= 10000) {
                color = 'rgba(255, 0, 0, 0.8)'; // Red for high impact
                size = 8;
            } else if (item.count >= 3000) {
                color = 'rgba(255, 255, 0, 0.8)'; // Yellow for medium impact
                size = 6;
            } else {
                color = 'rgba(0, 255, 0, 0.8)'; // Green for low impact
                size = 4;
            }

            this.markers.push({
                lat: item.lat,
                lng: item.lng,
                color: color,
                size: size,
                company: item.company,
                date: item.date,
                count: item.count,
                location: item.location
            });
        });

        // Render the map with new markers
        this.render();
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
        // Build detailed company map with all events
        const companyMap = {};
        this.layoffsData.forEach(item => {
            if (!companyMap[item.company]) {
                companyMap[item.company] = {
                    total: 0,
                    events: []
                };
            }
            companyMap[item.company].total += item.count;
            companyMap[item.company].events.push({
                date: item.date,
                count: item.count,
                location: item.location
            });
        });

        // Convert to array and sort by total count (descending)
        const companiesArray = Object.entries(companyMap)
            .map(([name, data]) => ({ name, total: data.total, events: data.events }))
            .sort((a, b) => b.total - a.total);

        // Populate the list
        const companiesList = document.getElementById('companies-list');
        companiesList.innerHTML = '';

        companiesArray.forEach(company => {
            // Create company container
            const container = document.createElement('div');
            container.className = 'company-container';

            // Create main entry (clickable)
            const entry = document.createElement('div');
            entry.className = 'company-entry';
            entry.innerHTML = `
                <span class="company-name">
                    <span class="expand-icon">▶</span> ${company.name}
                </span>
                <span class="company-count">${company.total.toLocaleString()}</span>
            `;

            // Create details section (hidden by default)
            const details = document.createElement('div');
            details.className = 'company-details';
            details.style.display = 'none';

            // Sort events by date
            company.events.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Add each event
            company.events.forEach(event => {
                const eventEntry = document.createElement('div');
                eventEntry.className = 'event-entry';
                eventEntry.innerHTML = `
                    <span class="event-date">${event.date}</span>
                    <span class="event-count">${event.count.toLocaleString()}</span>
                `;
                details.appendChild(eventEntry);
            });

            // Add click handler to toggle details
            entry.addEventListener('click', () => {
                const icon = entry.querySelector('.expand-icon');
                if (details.style.display === 'none') {
                    details.style.display = 'block';
                    icon.textContent = '▼';
                    entry.classList.add('expanded');
                } else {
                    details.style.display = 'none';
                    icon.textContent = '▶';
                    entry.classList.remove('expanded');
                }
            });

            // Add hover effect
            entry.style.cursor = 'pointer';

            container.appendChild(entry);
            container.appendChild(details);
            companiesList.appendChild(container);
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

        // Ticker speed select
        document.getElementById('ticker-speed-select').addEventListener('change', (e) => {
            const ticker = document.getElementById('ticker');
            const speed = e.target.value + 's';
            ticker.style.animationDuration = speed;
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
