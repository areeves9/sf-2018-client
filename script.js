// APPLICATION STATE
const appData = {
    prediction: {},
    incidents: [],
    riskByHourScore: [],
    riskHours: [],
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
    const month = date.getMonth();
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

function setRiskByHourScore(objectArray) {
    objectArray.map(obj => {
        appData.riskByHourScore.push(obj.risk_score);
        appData.riskHours.push(obj.hour);
    })
};

// get prediction and render two chart.js instances - risk score and risk over time
function getPrediction() {
    // API POST REQUEST TO PREDICTION SERVER
    let xhr = new XMLHttpRequest();
    xhr.open('POST', services.predictionApi);
    xhr.responseType = 'json';
    xhr.send();
    xhr.onload = function() {
        if (xhr.status != 200) {
            alert(`Error ${xhr.status}: ${xhr.statusText}`);
        } else {
            // set xhr response
            const response = xhr.response;
            console.log(response)
            // set riskbyhour array
            const riskByHour = response.riskbyhour.data;
            // update application state
            appData.prediction = response;
         


            setRiskByHourScore(riskByHour);



            // create a marker instance with hard-coded lat,lng for test purposes
            const currentLocationMarker = L.marker(
                [37.759101, -122.414791], {icon: greenIcon}).addTo(mymap);
            // get DOM object myChart
            const chart = document.getElementById("myChart");
            const riskLevelMarkup = `<h3 class="text-center">${appData.prediction.riskbyhour.data[0].risk_level} Risk</h3>`;
            const intersectionMarkup = `<h4 class="text-center">${getLocalTimeString()} </h4>
            <h6 class="text-center">${appData.prediction.intersection}</h6>`;
            // create chart instance and insert into DOM
            createChart(appData.prediction.riskbyhour.data[0].risk_score);

            createLineChart(appData.riskHours, appData.riskByHourScore)
            // POSITION PREDICTION RESPONSE MARKUP IN DOM
            chart.insertAdjacentHTML('beforebegin', riskLevelMarkup);
            chart.insertAdjacentHTML('afterend', intersectionMarkup);
            currentLocationMarker.bindPopup(
                `
                <p>Risk Level: ${response['risk_level']}</p>
                <p>Risk Score: ${response['risk_score']}</p>
                `
                );

        };
    };
}


function getVehicleData() {
    // API GET REQUEST TO CRIME INCIDENTS SERVER
    let xhr1 = new XMLHttpRequest();
    xhr1.open('GET', services.vehicleCrimeApi);
    xhr1.responseType = 'json';
    xhr1.send();
    xhr1.onload = function() {
        if (xhr1.status != 200) {
            console.log(`Error ${xhr1.status}: ${xhr1.statusText}`);
        } else {
            let response = xhr1.response;
            const { total_incidents, per_page } = response.meta;
            const vehicleIncidents = response.vehicle_incidents;
            // set application state
            appData.incidents = vehicleIncidents;
            // create cluster instance
            let markers = L.markerClusterGroup();
            // iterate through array of incident objects
            vehicleIncidents.map(item => {
                // for each incident object, add a layer to the marker cluster instance
                markers.addLayer(L.marker([item.latitude, item.longitude], {icon: redIcon}))
                .bindPopup(`
                    <p>${item.incident_subcategory}</p>`
                );
            });
            // add all the layers to the map instance
            mymap.addLayer(markers);

            const map = document.getElementById("mapid");
            const totalMarkup = `<h6 class="text-center">Showing ${per_page} of ${total_incidents} Vehicle Incidents</h6>
            <p class='text-center'><a href=''>More Incidents</a></p>`;

            map.insertAdjacentHTML('beforebegin', totalMarkup);

        };
    };
}



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


// CHARTS JS - RADIAL

function createChart(score) {
    const ctx = document.getElementById('myChart').getContext('2d');
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
                    backgroundColor: [
                        "#FF6384",
                        "#212529",
                    ],
                    data: [score, (100-score)],
                }
            ],
        },
        // Configuration options go here
        options: {
            legend: {
                display: false,
            },
            responsive: true,
            rotation: 1 * Math.PI,
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
                    label: `Risk Score By Hour (${getCurrentDate()})`,
                    borderColor: "blue",
                },
            ],
        },
        options: '',
    });
    return myLineChart.chart = myLineChart;
}


getPrediction();
getVehicleData();

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
