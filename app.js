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

        // Add latitude/longitude grid lines
        this.addGraticule();

        // Add continent outlines
        this.addContinents();

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x00ff00, 0.5);
        this.scene.add(ambientLight);

        // Store markers group
        this.markersGroup = new THREE.Group();
        this.scene.add(this.markersGroup);

        // Raycaster for click detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Mouse controls
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.rotation = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.dragStartTime = 0;
        this.lastDragTime = 0;

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragStartTime = Date.now();
            this.lastDragTime = Date.now();
            this.velocity = { x: 0, y: 0 };
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const currentTime = Date.now();
                const deltaTime = currentTime - this.lastDragTime;

                const deltaX = e.clientX - this.previousMousePosition.x;
                const deltaY = e.clientY - this.previousMousePosition.y;

                this.rotation.y += deltaX * 0.005;
                this.rotation.x += deltaY * 0.005;

                // Calculate velocity for momentum
                if (deltaTime > 0) {
                    this.velocity.x = deltaY * 0.005 / (deltaTime / 16);
                    this.velocity.y = deltaX * 0.005 / (deltaTime / 16);
                }

                // Limit vertical rotation
                this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));

                this.previousMousePosition = { x: e.clientX, y: e.clientY };
                this.lastDragTime = currentTime;
            }
        });

        this.renderer.domElement.addEventListener('mouseup', (e) => {
            const clickDuration = Date.now() - this.dragStartTime;

            // If it was a quick click (not a drag), check for marker clicks
            if (clickDuration < 200 && Math.abs(this.velocity.x) < 0.01 && Math.abs(this.velocity.y) < 0.01) {
                this.checkMarkerClick(e);
            }

            this.isDragging = false;
        });

        this.renderer.domElement.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.velocity = { x: 0, y: 0 };
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

        // Touch controls for mobile
        this.touchStartDistance = 0;
        this.touchStartZoom = 0;

        this.renderer.domElement.addEventListener('touchstart', (e) => {
            e.preventDefault();

            if (e.touches.length === 1) {
                // Single touch - rotation
                this.isDragging = true;
                this.dragStartTime = Date.now();
                this.lastDragTime = Date.now();
                this.velocity = { x: 0, y: 0 };
                this.previousMousePosition = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            } else if (e.touches.length === 2) {
                // Two finger pinch - zoom
                this.isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);
                this.touchStartZoom = this.camera.position.z;
            }
        }, { passive: false });

        this.renderer.domElement.addEventListener('touchmove', (e) => {
            e.preventDefault();

            if (e.touches.length === 1 && this.isDragging) {
                // Single touch rotation
                const currentTime = Date.now();
                const deltaTime = currentTime - this.lastDragTime;

                const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
                const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

                this.rotation.y += deltaX * 0.005;
                this.rotation.x += deltaY * 0.005;

                // Calculate velocity for momentum
                if (deltaTime > 0) {
                    this.velocity.x = deltaY * 0.005 / (deltaTime / 16);
                    this.velocity.y = deltaX * 0.005 / (deltaTime / 16);
                }

                // Limit vertical rotation
                this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));

                this.previousMousePosition = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
                this.lastDragTime = currentTime;
            } else if (e.touches.length === 2) {
                // Pinch to zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const scale = this.touchStartDistance / distance;
                const newZoom = this.touchStartZoom * scale;
                this.camera.position.z = Math.max(150, Math.min(500, newZoom));
            }
        }, { passive: false });

        this.renderer.domElement.addEventListener('touchend', (e) => {
            e.preventDefault();

            const touchDuration = Date.now() - this.dragStartTime;

            // If it was a quick tap (not a drag), check for marker taps
            if (e.changedTouches.length === 1 && touchDuration < 200 &&
                Math.abs(this.velocity.x) < 0.01 && Math.abs(this.velocity.y) < 0.01) {
                this.checkMarkerClick(e.changedTouches[0]);
            }

            this.isDragging = false;

            // Reset if no touches left
            if (e.touches.length === 0) {
                this.touchStartDistance = 0;
            }
        }, { passive: false });

        // Initialize with all data showing
        this.updateHeatMap(this.layoffsData);

        // Start animation loop
        this.animate();

        this.addLog('3D GLOBE INITIALIZED');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Apply momentum when not dragging
        if (!this.isDragging) {
            // Apply velocity to rotation
            this.rotation.x += this.velocity.x;
            this.rotation.y += this.velocity.y;

            // Apply damping (friction) to velocity
            this.velocity.x *= 0.95;
            this.velocity.y *= 0.95;

            // Stop velocity when it gets very small
            if (Math.abs(this.velocity.x) < 0.0001) this.velocity.x = 0;
            if (Math.abs(this.velocity.y) < 0.0001) this.velocity.y = 0;

            // Limit vertical rotation
            this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));
        }

        // Apply rotation
        this.globe.rotation.x = this.rotation.x;
        this.globe.rotation.y = this.rotation.y;
        this.markersGroup.rotation.x = this.rotation.x;
        this.markersGroup.rotation.y = this.rotation.y;

        this.renderer.render(this.scene, this.camera);
    }

    checkMarkerClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check for intersections with markers
        const intersects = this.raycaster.intersectObjects(this.markersGroup.children, true);

        if (intersects.length > 0) {
            const clickedMarker = intersects[0].object;
            if (clickedMarker.userData && clickedMarker.userData.company) {
                this.showMarkerInfo(clickedMarker.userData, event);
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

        // Position tooltip near the globe
        const globeContainer = document.getElementById('globe-container');
        const rect = globeContainer.getBoundingClientRect();
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

    // Convert lat/lng to 3D coordinates on sphere
    latLngToVector3(lat, lng, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = (radius * Math.sin(phi) * Math.sin(theta));
        const y = (radius * Math.cos(phi));

        return new THREE.Vector3(x, y, z);
    }

    addGraticule() {
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2
        });

        // Add latitude lines
        for (let lat = -75; lat <= 75; lat += 15) {
            const points = [];
            for (let lng = -180; lng <= 180; lng += 5) {
                points.push(this.latLngToVector3(lat, lng, 100.5));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.globe.add(line);
        }

        // Add longitude lines
        for (let lng = -180; lng < 180; lng += 15) {
            const points = [];
            for (let lat = -90; lat <= 90; lat += 5) {
                points.push(this.latLngToVector3(lat, lng, 100.5));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.globe.add(line);
        }

        // Add equator (brighter)
        const equatorMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.4
        });
        const equatorPoints = [];
        for (let lng = -180; lng <= 180; lng += 2) {
            equatorPoints.push(this.latLngToVector3(0, lng, 100.5));
        }
        const equatorGeometry = new THREE.BufferGeometry().setFromPoints(equatorPoints);
        const equator = new THREE.Line(equatorGeometry, equatorMaterial);
        this.globe.add(equator);
    }

    addContinents() {
        const continentMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        });

        // Detailed continent outlines with many more points for realistic shapes
        const continents = {
            // North America - detailed coastline
            northAmerica: [
                [71, -156], [70, -150], [69, -145], [68, -141], [66, -138], [64, -137],
                [62, -136], [60, -135], [58, -134], [56, -133], [54, -132], [52, -131],
                [51, -130], [49, -128], [48, -127], [46, -125], [45, -124], [44, -124],
                [42, -124], [40, -124], [38, -123], [37, -122], [36, -121], [35, -120],
                [34, -119], [33, -118], [32, -117], [31, -115], [30, -112], [29, -110],
                [28, -108], [27, -106], [26, -104], [26, -102], [26, -100], [26, -98],
                [27, -97], [28, -96], [29, -95], [30, -94], [31, -92], [32, -90],
                [33, -89], [34, -87], [35, -85], [36, -83], [37, -81], [38, -80],
                [39, -78], [40, -76], [41, -75], [42, -74], [43, -72], [44, -71],
                [45, -70], [46, -69], [47, -68], [48, -67], [49, -66], [50, -65],
                [51, -64], [52, -63], [53, -62], [54, -61], [55, -62], [56, -63],
                [57, -64], [58, -66], [59, -68], [60, -70], [61, -73], [62, -76],
                [63, -79], [64, -83], [65, -87], [66, -91], [67, -95], [68, -100],
                [69, -105], [70, -110], [70, -115], [70, -120], [70, -125], [70, -130],
                [70, -135], [70, -140], [70, -145], [71, -151], [71, -156]
            ],

            // South America - detailed coastline
            southAmerica: [
                [12, -72], [11, -73], [10, -75], [9, -76], [8, -77], [7, -78],
                [6, -78], [5, -78], [4, -77], [3, -76], [2, -75], [1, -74],
                [0, -73], [-1, -72], [-2, -71], [-3, -70], [-4, -70], [-5, -70],
                [-6, -71], [-7, -72], [-8, -73], [-9, -74], [-10, -75], [-11, -75],
                [-12, -76], [-13, -76], [-14, -76], [-15, -75], [-16, -74], [-17, -73],
                [-18, -72], [-19, -71], [-20, -70], [-21, -70], [-22, -70], [-23, -70],
                [-24, -70], [-25, -70], [-26, -70], [-27, -71], [-28, -71], [-29, -71],
                [-30, -71], [-31, -71], [-32, -71], [-33, -71], [-34, -71], [-35, -71],
                [-36, -72], [-37, -73], [-38, -73], [-39, -73], [-40, -73], [-41, -73],
                [-42, -72], [-43, -71], [-44, -70], [-45, -69], [-46, -68], [-47, -67],
                [-48, -66], [-49, -67], [-50, -68], [-51, -69], [-52, -69], [-53, -69],
                [-54, -68], [-55, -68], [-55, -67], [-54, -66], [-53, -65], [-52, -64],
                [-51, -63], [-49, -62], [-47, -61], [-45, -60], [-43, -59], [-41, -58],
                [-39, -57], [-37, -56], [-35, -55], [-33, -54], [-31, -53], [-29, -52],
                [-27, -51], [-25, -50], [-23, -49], [-21, -48], [-19, -47], [-17, -46],
                [-15, -45], [-13, -45], [-11, -45], [-9, -45], [-7, -46], [-5, -47],
                [-3, -48], [-1, -49], [1, -50], [3, -51], [5, -53], [7, -55],
                [8, -57], [9, -59], [10, -62], [11, -65], [11, -68], [12, -70], [12, -72]
            ],

            // Europe - detailed coastline
            europe: [
                [71, 25], [70, 22], [69, 20], [68, 18], [67, 16], [66, 15], [65, 13],
                [64, 12], [63, 11], [62, 10], [61, 9], [60, 8], [59, 7], [58, 6],
                [57, 5], [56, 4], [55, 4], [54, 3], [53, 3], [52, 3], [51, 2],
                [50, 1], [49, 0], [48, 0], [47, 1], [46, 2], [45, 3], [44, 4],
                [43, 6], [42, 8], [41, 9], [40, 10], [39, 11], [38, 11], [37, 11],
                [36, 12], [36, 14], [37, 16], [38, 18], [39, 20], [40, 22], [41, 24],
                [42, 26], [43, 28], [44, 29], [45, 30], [46, 31], [47, 32], [48, 32],
                [49, 32], [50, 31], [51, 30], [52, 29], [53, 28], [54, 27], [55, 26],
                [56, 26], [57, 27], [58, 28], [59, 29], [60, 30], [61, 31], [62, 32],
                [63, 33], [64, 34], [65, 35], [66, 35], [67, 34], [68, 33], [69, 31],
                [70, 29], [71, 27], [71, 25]
            ],

            // Africa - detailed coastline
            africa: [
                [37, 10], [36, 11], [35, 12], [34, 13], [33, 14], [32, 15], [31, 16],
                [30, 17], [29, 18], [28, 19], [27, 20], [26, 22], [25, 24], [24, 26],
                [23, 28], [22, 30], [21, 32], [20, 34], [19, 36], [18, 37], [17, 38],
                [16, 39], [15, 40], [14, 41], [13, 41], [12, 42], [11, 42], [10, 42],
                [9, 42], [8, 42], [7, 42], [6, 42], [5, 42], [4, 41], [3, 41],
                [2, 41], [1, 41], [0, 41], [-1, 41], [-2, 41], [-3, 41], [-4, 41],
                [-5, 40], [-6, 40], [-7, 40], [-8, 40], [-9, 40], [-10, 40], [-11, 40],
                [-12, 39], [-13, 39], [-14, 38], [-15, 37], [-16, 36], [-17, 36], [-18, 35],
                [-19, 35], [-20, 35], [-21, 35], [-22, 35], [-23, 34], [-24, 34], [-25, 33],
                [-26, 32], [-27, 31], [-28, 30], [-29, 29], [-30, 28], [-31, 27], [-32, 26],
                [-33, 25], [-34, 24], [-34, 23], [-34, 22], [-34, 21], [-34, 20], [-33, 19],
                [-32, 18], [-31, 17], [-30, 16], [-29, 15], [-28, 15], [-27, 15], [-26, 15],
                [-25, 15], [-24, 15], [-23, 15], [-22, 15], [-21, 15], [-20, 15], [-19, 16],
                [-18, 16], [-17, 16], [-16, 17], [-15, 17], [-14, 17], [-13, 18], [-12, 18],
                [-11, 18], [-10, 18], [-9, 18], [-8, 18], [-7, 19], [-6, 19], [-5, 19],
                [-4, 19], [-3, 20], [-2, 20], [-1, 21], [0, 21], [1, 22], [2, 22],
                [3, 23], [4, 23], [5, 24], [6, 24], [7, 24], [8, 24], [9, 24],
                [10, 24], [11, 25], [12, 25], [13, 25], [14, 25], [15, 25], [16, 25],
                [17, 25], [18, 25], [19, 25], [20, 25], [21, 24], [22, 24], [23, 23],
                [24, 23], [25, 22], [26, 22], [27, 21], [28, 20], [29, 19], [30, 18],
                [31, 17], [32, 15], [33, 14], [34, 13], [35, 12], [36, 11], [37, 10]
            ],

            // Asia - detailed coastline
            asia: [
                [71, 60], [70, 65], [70, 70], [70, 75], [70, 80], [70, 85], [70, 90],
                [69, 95], [69, 100], [68, 105], [67, 110], [66, 114], [65, 118], [64, 122],
                [63, 126], [62, 129], [61, 132], [60, 135], [59, 137], [58, 139], [57, 141],
                [56, 142], [55, 143], [54, 144], [53, 144], [52, 145], [51, 145], [50, 145],
                [49, 145], [48, 144], [47, 143], [46, 142], [45, 141], [44, 140], [43, 139],
                [42, 139], [41, 139], [40, 139], [39, 138], [38, 137], [37, 136], [36, 135],
                [35, 134], [34, 132], [33, 130], [32, 128], [31, 126], [30, 124], [29, 122],
                [28, 120], [27, 118], [26, 115], [25, 112], [24, 109], [24, 106], [24, 103],
                [24, 100], [24, 97], [24, 94], [25, 91], [26, 88], [27, 86], [28, 84],
                [29, 82], [30, 80], [31, 78], [32, 76], [33, 74], [34, 72], [35, 70],
                [36, 68], [37, 66], [38, 65], [39, 63], [40, 62], [41, 61], [42, 60],
                [43, 59], [44, 58], [45, 57], [46, 56], [47, 55], [48, 54], [49, 53],
                [50, 52], [51, 51], [52, 51], [53, 51], [54, 52], [55, 53], [56, 54],
                [57, 55], [58, 56], [59, 57], [60, 58], [61, 58], [62, 59], [63, 59],
                [64, 59], [65, 59], [66, 59], [67, 59], [68, 59], [69, 59], [70, 59],
                [71, 60]
            ],

            // Australia - detailed coastline
            australia: [
                [-10, 115], [-11, 117], [-12, 119], [-13, 121], [-14, 123], [-15, 125],
                [-16, 127], [-17, 128], [-18, 129], [-19, 130], [-20, 131], [-21, 132],
                [-22, 133], [-23, 134], [-24, 135], [-25, 136], [-26, 137], [-27, 138],
                [-28, 139], [-29, 140], [-30, 141], [-31, 142], [-32, 143], [-33, 144],
                [-34, 145], [-35, 146], [-36, 147], [-37, 148], [-38, 148], [-39, 149],
                [-40, 149], [-41, 149], [-42, 149], [-43, 148], [-44, 148], [-43, 147],
                [-42, 146], [-41, 146], [-40, 146], [-39, 147], [-38, 148], [-37, 149],
                [-36, 150], [-35, 151], [-34, 152], [-33, 152], [-32, 152], [-31, 152],
                [-30, 152], [-29, 152], [-28, 152], [-27, 152], [-26, 151], [-25, 151],
                [-24, 151], [-23, 151], [-22, 151], [-21, 150], [-20, 150], [-19, 149],
                [-18, 149], [-17, 148], [-16, 147], [-15, 146], [-14, 145], [-13, 143],
                [-12, 142], [-11, 140], [-11, 138], [-11, 136], [-11, 134], [-11, 132],
                [-11, 130], [-11, 128], [-11, 126], [-11, 124], [-11, 122], [-11, 120],
                [-11, 118], [-10, 116], [-10, 115]
            ]
        };

        // Draw each continent
        Object.values(continents).forEach(coords => {
            const points = coords.map(([lat, lng]) => this.latLngToVector3(lat, lng, 100.8));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.LineLoop(geometry, continentMaterial);
            this.globe.add(line);
        });
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
