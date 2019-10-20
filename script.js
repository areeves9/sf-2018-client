// LEAFLET JS MAP INSTANCE
const mymap = L.map('mapid', {
    attributionControl: false,
    center: [37.759101, -122.414791],
    zoom: 16,
    zoomControl: true,
    dragging: true,
    doubleClickZoom: false,
    scrollWheelZoom: false,
    touchZoom: true,
});

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
}).addTo(mymap);

// MARKER STYLE OBJECTS
const greenIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

// create a marker instance with hard-coded lat,lng for test purposes
const currentLocationMarker = L.marker(
    [37.759101, -122.414791], {icon: greenIcon});


// APPLICATION STATE
const appState = {
    prediction: {},
    incidents: [],
    incidentsApiPage: 1,
    incidentMarkers: [],
    isLoading: false,
    riskByHourScore: [],
    riskHours: [],
    totalIncidents: null
};

const myChart = {
    chart: null,
};

const myLineChart = {
    chart: null,
}

const radius = 300;

const userGeolocation = {
    latitude: '37.759101',
    longitude: '-122.414791'
};

const services = {
    predictionApi: `https://sf-vehthft-riskmodel.herokuapp.com/?Latitude=${userGeolocation.latitude}&Longitude=${userGeolocation.longitude}`,
    vehicleCrimeApi: `https://sfcrime-api.herokuapp.com/vehicles/lat/${userGeolocation.latitude}/lng/${userGeolocation.longitude}/${radius}/`,
};


// EVENT LISTENERS
const button = document.getElementById("ajaxbtn")
button.addEventListener('click', () => {
    getVehicleIncidents(appState.incidentsApiPage);
})


// APPLICATION METHODS
function getLocalTimeString() {
    const date = new Date();
    const localTime = date.toLocaleTimeString('en-us');
    return localTime;
};

function getCurrentDate() {
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
};

function setRiskByHourScore(objectArray) {
    return objectArray.map(obj => {
        appState.riskByHourScore.push(obj.risk_score);
        appState.riskHours.push(obj.hour);
    })
};

function createXHRequest(method, url) {
    // API GET REQUEST TO CRIME INCIDENTS SERVER
    const xhr = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
        // listen for completed request, then process
        xhr.onreadystatechange = () => {
            // Only run if the request is complete
            if (xhr.readyState !== 4) return;
            // Process the response
			if (xhr.status >= 200 && xhr.status < 300) {
				// If successful
				resolve(xhr);
			} else {
				// If failed
				reject({
					status: xhr.status,
					statusText: xhr.statusText
				});
            };
        };
        // HTTP request
        xhr.open(method, url);
        // set response to JSON data type
        xhr.responseType = 'json';
        // send HTTP request
        xhr.send();
    });
};

const spinner = `<span class="spinner spinner-grow"></span>`;


// get vehicle incidents from db, passing in page number
function getVehicleIncidents(page) {
    // display spinner overlay in map box
    document.getElementById("overlay").style.display = 'block';
    // spinner next to button
    document.getElementById("ajaxbtn").innerHTML += spinner;
    // API GET REQUEST TO CRIME INCIDENTS SERVER
    createXHRequest('GET',  services.vehicleCrimeApi + `?page=${page}`)
        .then((xhr) => {
            const jsonResponse = xhr.response;
            // Update state - merge with spread operator if appState.incidents has objects
            if (appState.incidents.length > 0) {
                appState.incidents = [...appState.incidents, ...jsonResponse.vehicle_incidents];
            } else {
                appState.incidents = jsonResponse.vehicle_incidents;
            };
            // hide spinner now that response has been obtained
            document.getElementById("overlay").style.display = 'none';
            // createIncidentMarkers returns a clustergroup, makers added to map
            mymap.addLayer(createIncidentMarkers(appState.incidents));
            // markup added over map
            document.querySelector(".map-header").innerHTML = `
                Showing ${appState.incidents.length} of ${jsonResponse.meta.total_incidents} Incidents`;
            // remove spinner from button
            document.getElementById("ajaxbtn").lastChild.remove();
            return jsonResponse;
        })
        .then((jsonResponse) => {
            // check if all incidents have been added to application state
            (appState.incidents.length === jsonResponse.meta.total_incidents) ?
            document.getElementById("overlay-btn").style.display = 'none' :  
            document.getElementById("overlay-btn").style.display = 'block';
            return appState.incidentsApiPage++;
        })
        .catch((error) => {
            console.log("Something is wrong", error);
        });
};

// get prediction and render two chart.js instances - risk score and risk over time
// BREAK THIS INTO FUNCTIONS
function getPrediction() {
    appState.isLoading = true;
    const parentDiv = document.getElementById("myChart").parentNode;
    const loading = `<div class="text-center">
        <div class="spinner-grow" style="width: 3rem; height: 3rem;" role="status">
        <span class="sr-only">Loading...</span></div>
        </div>`
    parentDiv.innerHTML += loading;
    createXHRequest('POST', services.predictionApi)
    .then((xhr) => {
        // loading();
        const jsonResponse = xhr.response;
        return appState.prediction = jsonResponse;
    })
    .then(() => {
        const { riskbyhour } = appState.prediction;
        setRiskByHourScore(riskbyhour.data);
        createLineChart(appState.riskHours, appState.riskByHourScore);        
    })
    .then(() => {
        const parentDiv = document.getElementById("myChart").parentNode;
        const lastChild = parentDiv.lastChild;
        lastChild.innerHTML = '';

        // take intersection string and TitleCase it  
        let intersection = appState.prediction.intersection;
        intersection = intersection.toLowerCase()
            .split(' ')
            .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');

        // const parentDiv = document.getElementById("myChart").parentNode;
        // create chart instance and insert into DOM
        createChart(appState.prediction.riskbyhour.data[0].risk_score);
        const riskLevelMarkup = `<h3 class="text-center">${appState.prediction.riskbyhour.data[0].risk_level} Risk</h3>`;
        const intersectionMarkup = `<h3 class="text-center">${intersection}</h3>`


        const chart = document.getElementById("myChart");
        chart.insertAdjacentHTML('beforebegin', riskLevelMarkup);
        chart.insertAdjacentHTML('afterend', intersectionMarkup);
    })
    .then(() => {
        const { risk_level, risk_score } = appState.prediction.riskbyhour.data[0];
        
        currentLocationMarker.addTo(mymap);
        currentLocationMarker.bindPopup(
            `
            <p>Risk Level: ${risk_level}</p>
            <p>Risk Score: ${risk_score}</p>
            `
        );

        return risk_level, risk_score;
    })
    .catch((error) => {
        console.log("Something is wrong", error);
    });
};


// create the markers
function createIncidentMarkers(incidents) {
    // create cluster instance
    const markers = L.markerClusterGroup();
    const incidentMarkers = [];
    // iterate through array of incident objects
    incidents.map(item => {
        // for each incident object, add a layer to the marker cluster instance
        markers.addLayer(L.marker([item.latitude, item.longitude], {icon: redIcon}))
        .bindPopup(`<ul>
            <li>${item.incident_subcategory}</li>
            <li>${item.incident_description}</li>
            <li>${item.incident_date}</li>
        </ul>`
        );
        incidentMarkers.push(markers)
    });
    appState.incidentMarkers = incidentMarkers;
    return markers;
};

// CHARTS JS - RADIAL
function createChart(score) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const chart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'radialGauge',
        // The data for our dataset
        data: {
            labels: [
                "Risk Score"
            ],
            datasets: [
                {
                    backgroundColor: "#343a40",
                    data: [score],
                }
            ],
        },
        // Configuration options go here
        options: {
            centerPercentage: 80,
            centerArea: {
                fontSize: '60px',
            },
            legend: {
                display: false,
            },
            responsive: true,
            rotation: -Math.PI / 2,
            trackColor: '#E0E0E0',
            tooltips: {
                enabled: false,
            },
            circumference: 1 * Math.PI
        }
    });
    return myChart.chart = chart;
};

// CHARTS JS - LINE
function createLineChart(hours, riskScores) {
    const newHours = hours.map((hour) => {
        return (hour > 12 && hour != 12) ? (hour - 12).toString() + `:00 PM` : hour.toString() + `:00 AM`;
    });
    console.log(newHours)
    const ctx = document.getElementById('myLineChart').getContext('2d');
    const myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: newHours,
            datasets: [
                {
                    data: riskScores,
                    label: "Risk Score",
                    borderColor: "white",
                    backgroundColor: "#343a40",
                    pointRadius: 0,
                },
            ],
        },
        options: {
            legend: {
                display: false,
            },
            scales: {
                xAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10,
                        fontColor: 'white',
                    },
                    gridLines: {
                        drawOnChartArea: false
                    }
                }],
                yAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 4,
                        fontColor: 'white',
                    },
                    gridLines: {
                        drawOnChartArea: false
                    }
                }]
            },
            title: {
                display: true,
                text: `Risk Score By Hour (${getCurrentDate()})`,
                fontSize: 22,
                fontColor: 'white',
              }
        },
    });
    // ctx.style.backgroundColor = 'rgba(255,0,0,255)';

    return myLineChart.chart = myLineChart;
};

getPrediction();
getVehicleIncidents(appState.incidentsApiPage);

// GEOLOCATION API - Conditional, then set global userGeoLocation object with position.coords.lat/lng
// if ("geolocation" in navigator) {
    /* geolocation is available */
//     navigator.geolocation.getCurrentPosition(function(position) {
//         console.log(position.coords.latitude, position.coords.longitude);
//       });
//   } else {
    /* geolocation IS NOT available */
//     console.log("unavailable")
//   }
