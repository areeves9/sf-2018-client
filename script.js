// LEAFLET JS MAP INSTANCE
const mymap = L.map('mapid', {
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


// APPLICATION STATE
const appState = {
    currentPageVehicleCrimeAPI: null,
    prediction: {},
    incidents: [],
    incidentMarkers: [],
    isLoading: false,
    riskByHourScore: [],
    riskHours: [],
    totalIncidents: null
};

const metaData = {
    totalIncidents: null,
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


// APPLICATION METHODS
function getLocalTimeString() {
    const date = new Date();
    const localTime = date.toLocaleTimeString('en-us');
    return localTime;
}

function getCurrentDate() {
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
}

function setRiskByHourScore(objectArray) {
    objectArray.map(obj => {
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


// get prediction and render two chart.js instances - risk score and risk over time
function getPrediction() {
    // HTTP POST REQUEST TO PREDICTION API SERVER
    createXHRequest('POST', services.predictionApi)
    .then((xhr) => {
        jsonResponse = xhr.response;
        const riskByHour = jsonResponse.riskbyhour.data;
        
        // update application state
        appState.prediction = jsonResponse;
        setRiskByHourScore(riskByHour);
        
        // create a marker instance with hard-coded lat,lng for test purposes
        const currentLocationMarker = L.marker(
            [37.759101, -122.414791], {icon: greenIcon})
            .addTo(mymap);
        
            // get DOM object myChart
        const chart = document.getElementById("myChart");
        const riskLevelMarkup = `<h3 class="text-center">${appState.prediction.riskbyhour.data[0].risk_level} Risk</h3>`;
        const intersectionMarkup = `<h4 class="text-center">${getLocalTimeString()} </h4>
        <h6 class="text-center">${appState.prediction.intersection}</h6>`;
        
        // create chart instance and insert into DOM
        createChart(appState.prediction.riskbyhour.data[0].risk_score);
        createLineChart(appState.riskHours, appState.riskByHourScore)
        
        // POSITION PREDICTION RESPONSE MARKUP IN DOM
        chart.insertAdjacentHTML('beforebegin', riskLevelMarkup);
        chart.insertAdjacentHTML('afterend', intersectionMarkup);
        currentLocationMarker.bindPopup(
            `
            <p>Risk Level: ${jsonResponse['risk_level']}</p>
            <p>Risk Score: ${jsonResponse['risk_score']}</p>
            `
            );
    })
    .catch((error) => {
        console.log("Something is wrong", error);
    });
};

function renderMapAdjacentHTML(totalIncidents) {
    const totalMarkup = `<div class="col">
    <h6 class="text-center">Showing ${appState.incidents.length} of ${totalIncidents} Incidents</h6>
     <button style="display:block;" class="mx-auto mb-2 btn btn-secondary" onclick="getNextVehicleIncidents()">More Incidents</button>
    </div>`;
    if (appState.incidents.length > 0) {
        document.getElementById("mapid").previousSibling.remove();
        document.getElementById("mapid").insertAdjacentHTML('beforebegin', totalMarkup);
    } else {
        document.getElementById("mapid").insertAdjacentHTML('beforebegin', totalMarkup);
    }
};


function getVehicleIncidents() {
    // API GET REQUEST TO CRIME INCIDENTS SERVER
    createXHRequest('GET', services.vehicleCrimeApi)
        .then((xhr) => {
            jsonResponse = xhr.response;
            // extract data from JSON
            const { current_page, total_incidents } = jsonResponse.meta;
            const vehicleIncidents = jsonResponse.vehicle_incidents;
            // update application state
            appState.currentPageVehicleCrimeAPI = current_page;
            appState.incidents = vehicleIncidents;
            appState.totalIncidents = total_incidents;
            // instantiate leaflet.js object with markers
            mymap.addLayer(createIncidentMarkers(appState.incidents));
            // renderHTML();
            renderMapAdjacentHTML(appState.totalIncidents);
        })
        .catch((error) => {
            console.log("Something is wrong", error);
        });
};


function getNextVehicleIncidents() {
    // clear previous markers from the map
    appState.incidentMarkers.clearLayers();
    // request to next page of incident objects
    createXHRequest('GET', services.vehicleCrimeApi + `?page=${appState.currentPageVehicleCrimeAPI + 1}`)
        .then((xhr) => {
            jsonResponse = xhr.response;
            // extract data from JSON
            const { current_page, total_incidents } = jsonResponse.meta;
            // update application state
            appState.currentPageVehicleCrimeAPI = current_page;
            appState.incidents = [...appState.incidents, ...jsonResponse.vehicle_incidents];
            appState.totalIncidents = total_incidents;
             // add markers to map instance
            mymap.addLayer(createIncidentMarkers(appState.incidents));
            renderMapAdjacentHTML(appState.totalIncidents);
        })
        .catch((error) => {
            console.log("Something is wrong", error);
        });
}

// take state obj prop incidents arr of objs
// and iterate through each obj creating a maker
// for the map and binding a popup, update 
// app state with  markerCluseterGroup instance 'markers' 
function createIncidentMarkers(incidents) {
    // create cluster instance
    const markers = L.markerClusterGroup();
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
    });
    return appState.incidentMarkers = markers;
}


// CHARTS JS - RADIAL
function createChart(score) {
    const ctx = document.getElementById('myChart').getContext('2d');
    // const gradientStroke = ctx.createLinearGradient(200, 0, 100, 0);
    // gradientStroke.addColorStop(0.55, "#8fd71c");
    // gradientStroke.addColorStop(1, "#ff1414");
    // instantiate chart.js object
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
                    backgroundColor: "#ff1414",
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
    const ctx = document.getElementById('myLineChart').getContext('2d');

    const myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    data: riskScores,
                    label: "Risk Score",
                    borderColor: "blue",
                    backgroundColor: "white",
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
                    gridLines: {
                        drawOnChartArea: false
                    }
                }],
                yAxes: [{
                    gridLines: {
                        drawOnChartArea: false
                    }
                }]
            },
            title: {
                display: true,
                text: `Risk Score By Hour (${getCurrentDate()})`,
              }
        },
    });
    return myLineChart.chart = myLineChart;
}


getPrediction();
getVehicleIncidents();

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
