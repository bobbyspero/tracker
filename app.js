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
        // Initialize Three.js scene
        const container = document.getElementById('globe-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.z = 300;

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        container.appendChild(this.renderer.domElement);

        // Create globe
        const globeGeometry = new THREE.SphereGeometry(100, 64, 64);

        // Create wireframe material with terminal green color
        const globeMaterial = new THREE.MeshBasicMaterial({
            color: 0x003300,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });

        this.globe = new THREE.Mesh(globeGeometry, globeMaterial);
        this.scene.add(this.globe);

        // Add subtle green glow around globe
        const glowGeometry = new THREE.SphereGeometry(101, 64, 64);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.05,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.scene.add(glow);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x00ff00, 0.5);
        this.scene.add(ambientLight);

        // Store markers group
        this.markersGroup = new THREE.Group();
        this.scene.add(this.markersGroup);

        // Mouse controls
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.rotation = { x: 0, y: 0 };

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.previousMousePosition.x;
                const deltaY = e.clientY - this.previousMousePosition.y;

                this.rotation.y += deltaX * 0.005;
                this.rotation.x += deltaY * 0.005;

                // Limit vertical rotation
                this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));

                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.renderer.domElement.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Zoom with mouse wheel
        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY * 0.1;
            this.camera.position.z = Math.max(150, Math.min(500, this.camera.position.z + delta));
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });

        // Initialize with all data showing
        this.updateHeatMap(this.layoffsData);

        // Start animation loop
        this.animate();

        this.addLog('3D GLOBE INITIALIZED');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Apply rotation
        this.globe.rotation.x = this.rotation.x;
        this.globe.rotation.y = this.rotation.y;
        this.markersGroup.rotation.x = this.rotation.x;
        this.markersGroup.rotation.y = this.rotation.y;

        // Auto-rotate slowly when not dragging
        if (!this.isDragging) {
            this.rotation.y += 0.001;
        }

        this.renderer.render(this.scene, this.camera);
    }

    // Convert lat/lng to 3D coordinates on sphere
    latLngToVector3(lat, lng, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = (radius * Math.sin(phi) * Math.sin(theta));
        const y = (radius * Math.cos(phi));

        return new THREE.Vector3(x, y, z);
    }

    updateHeatMap(dataSlice) {
        // Clear existing markers
        while (this.markersGroup.children.length > 0) {
            this.markersGroup.remove(this.markersGroup.children[0]);
        }

        // Add new markers
        dataSlice.forEach(item => {
            // Determine color and size based on layoff count
            let color, size;
            if (item.count >= 10000) {
                color = 0xff0000; // Red for high impact
                size = 3;
            } else if (item.count >= 3000) {
                color = 0xffff00; // Yellow for medium impact
                size = 2;
            } else {
                color = 0x00ff00; // Green for low impact
                size = 1.5;
            }

            // Create marker geometry
            const markerGeometry = new THREE.SphereGeometry(size, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });

            const marker = new THREE.Mesh(markerGeometry, markerMaterial);

            // Position marker on globe surface
            const position = this.latLngToVector3(item.lat, item.lng, 100);
            marker.position.copy(position);

            // Add glow effect
            const glowGeometry = new THREE.SphereGeometry(size + 0.5, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.3,
                side: THREE.BackSide
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(position);

            // Store data for potential tooltips/interaction
            marker.userData = {
                company: item.company,
                date: item.date,
                count: item.count,
                location: item.location
            };

            this.markersGroup.add(marker);
            this.markersGroup.add(glow);
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
