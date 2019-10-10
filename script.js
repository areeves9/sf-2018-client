// APPLICATION STATE
const appData = {
    prediction: {},
    incidents: [],
};

const metaData = {
    totalIncidents: null,
};

const myChart = {
    chart: null,
};

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
            let response = xhr.response;
            appData.prediction = response;
            console.log(appData.prediction.riskbyhour.data[0].risk_score)
            const date = new Date();
            const localTime = date.toLocaleTimeString('en-us');
            // create a marker instance with hard-coded lat,lng for test purposes
            const currentLocationMarker = L.marker(
                [37.759101, -122.414791], {icon: greenIcon}).addTo(mymap);

            createChart(appData.prediction.riskbyhour.data[0].risk_score);

            const chart = document.getElementById("myChart");
            const riskMarkup = `<h3 class="text-center">${appData.prediction.riskbyhour.data[0].risk_level} Risk</h3>
            <h1 class="text-center">${appData.prediction.riskbyhour.data[0].risk_score}</h1>
            <h4 class="text-center">${localTime} </h4>
            <h6 class="text-center">${appData.prediction.intersection}</h6>`;

            chart.insertAdjacentHTML('beforebegin', riskMarkup);
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
            // const newArr = [...vehicleIncidents];
            // const newArr1 = [...vehicleIncidents];
            // const min = newArr.reduce((a, b) => {
            //     return a.incident_datetime < b.incident_datetime ? a.incident_datetime : b.incident_datetime;
            // });
            // const max = newArr1.reduce((a, b) => {
            //     return a.incident_datetime > b.incident_datetime ? a.incident_datetime : b.incident_datetime;
            // });
            // console.log(min, max);
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


// CHARTS JS
var ctx = document.getElementById('myChart').getContext('2d');

function createChart(score) {
    var chart = new Chart(ctx, {
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
