import 'materialize-css/dist/css/materialize.min.css'
import 'materialize-css/dist/js/materialize.min.js'

var $ = require("jquery");

require("leaflet_css");
require("geosearch_css");
const countries_geojson = require("countries_geojson");

import L from 'leaflet';

import {
    GeoSearchControl,
} from 'leaflet-geosearch';

import {
    OpenStreetMapProvider,
} from 'leaflet-geosearch_custom';

const provider = new OpenStreetMapProvider();

const searchControl = new GeoSearchControl({
  provider: provider,                               // required
  showMarker: false,                                   // optional: true|false  - default true
  showPopup: false,                                   // optional: true|false  - default false
  marker: {                                           // optional: L.Marker    - default L.Icon.Default
    icon: new L.Icon.Default(),
    draggable: false,
  },
  popupFormat: ({ query, result }) => result.label,   // optional: function    - default returns result label
  maxMarkers: 1,                                      // optional: number      - default 1
  retainZoomLevel: true,                             // optional: true|false  - default false
  animateZoom: true,                                  // optional: true|false  - default true
  autoClose: true,                                   // optional: true|false  - default false
  searchLabel: 'Enter place',                       // optional: string      - default 'Enter address'
  keepResult: false,                                   // optional: true|false  - default false
  autoComplete: true,             // optional: true|false  - default true
  autoCompleteDelay: 250,         // optional: number      - default 250
});

const DEFAULT_CENTER = [30,0];
const DEFAULT_ZOOM = 2;
const BOUNDS_OFFEST = 1;
var lat_bounds = [];
var long_bounds = [];

var markerLayer = new L.featureGroup();

var overlayMarkers = {
    "Markers": markerLayer
};

// initialize the map on the "map" div with a given center and zoom
var map = L.map('map', {
    layers: [markerLayer]
}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1IjoiZ2xociIsImEiOiJjanY5bWJzOWcxMzJsNDNzMWppb2pjODljIn0.wSf7rLO1Fl-GNK35Nb1CbA'
}).addTo(map);

var layerControl = L.control.layers();
layerControl.addOverlay(markerLayer,"markers");
layerControl.addTo(map);

var filledStyle = {
    fillColor: "red",
    weight: 1,
    opacity: 1,
    color: 'white',
//    dashArray: '3',
    fillOpacity: 0.5
};

var noStyle = {
    opacity: 0,
    fillOpacity: 0
};

var countries_layers = [];
L.geoJSON(countries_geojson, {
    onEachFeature: myOnEachFeature,
    style: noStyle
}).addTo(map);

function myOnEachFeature(feature, featureLayer) {
    countries_layers[feature.properties.ADMIN] = featureLayer;
}


function fillCountry(data) {
    let country = data.country;
    if(country in countries_layers) {
        countries_layers[country].setStyle(filledStyle);
    }
}

map.addControl(searchControl);

map.on('geosearch/showlocation', resultSelected);

function resultSelected(result) {
    console.log(result);
    let coords = L.point([parseFloat(result.location.raw.lat), parseFloat(result.location.raw.lon)]);

    let city_like = [   result.location.raw.address.city,
                        result.location.raw.address.town,
                        result.location.raw.address.village,
                        result.location.raw.address.city_district,
                        result.location.raw.address.hamlet,
                        result.location.raw.address.county,
                        result.location.raw.address.region,
                        ''  ];
    let city = city_like.filter(Boolean)[0];

    var data = {
            'label': result.location.label,
            'coords': coords,
            'city': city,
            'country': result.location.raw.address.country,
            'country_id': normalizePlaceName(result.location.raw.address.country),
            'city_id': normalizePlaceName(result.location.raw.address.city)
           }
    console.log("Result selected: ", data);
    addPlaceToList(data);
    addMarker(data);
    sendCity(data);
}
var markers = {};

function addMarker(data) {
    let latlon = L.latLng(data.coords.x,data.coords.y);
    let marker = L.marker(latlon);
    markers[data.label] = marker;
    marker.on('mouseover',function(ev) {
      $('#'+data.country_id + '> #'+data.city_id).css({'font-weight':'bold'});
    });
    marker.on('mouseout',function(ev) {
      $('#'+data.country_id + '> #'+data.city_id).css({'font-weight':'normal'});
    });
    markerLayer.addLayer(marker);
    updateView(data);
    fillCountry(data);
}

function updateView(data) {
    if (!lat_bounds.length) {
        lat_bounds = [
                        data.coords.x - BOUNDS_OFFEST,
                        data.coords.x + BOUNDS_OFFEST
                     ];
//        console.log('Latitude bounds: ', lat_bounds);
    }
    else {
        lat_bounds = [
                        Math.min(data.coords.x,lat_bounds[0]) - BOUNDS_OFFEST,
                        Math.max(data.coords.x,lat_bounds[1]) + BOUNDS_OFFEST
                     ];
    }
    if (!long_bounds.length) {
        long_bounds = [data.coords.y - 1, data.coords.y + 1];
//        console.log('Longitude bounds: ', long_bounds);
    }
    else {
        long_bounds = [
                        Math.min(data.coords.y,long_bounds[0]) - BOUNDS_OFFEST,
                        Math.max(data.coords.y,long_bounds[1]) + BOUNDS_OFFEST
                     ];
    }

    if (Object.keys(markers).length > 1) {
        map.fitBounds([
            [lat_bounds[0], long_bounds[1]],
            [lat_bounds[1], long_bounds[0]]
        ]);
    }
}

var country_icons = {
    'france': 'https://cdn.pixabay.com/photo/2016/01/22/16/42/eiffel-tower-1156146_640.jpg',
    'united-kingdom': 'https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg?cs=srgb&dl=aerial-view-ancient-architecture-672532.jpg&fm=jpg?dl&fit=crop&crop=entropy&w=640&h=427',
    'romania': 'https://cdn.pixabay.com/photo/2014/10/09/23/19/peles-482667_640.jpg',
    'netherlands': 'https://images.pexels.com/photos/462264/pexels-photo-462264.jpeg?cs=srgb&dl=apartment-architecture-buildings-462264.jpg&fm=jpg?dl&fit=crop&crop=entropy&w=640&h=426',
    'egypt': 'https://cdn.pixabay.com/photo/2017/03/20/14/33/pyramids-2159286_640.jpg'
}

function normalizePlaceName(name) {
    return name.replace(/\W+/g, '-').toLowerCase();
}
function addPlaceToList(data) {
    let country_lowercase = normalizePlaceName(data.country);
    let city_lowercase = normalizePlaceName(data.city);

    // country isn't listed yet
    if(!$("#"+country_lowercase).length) {
        let img = '<img src="'+ country_icons[data.country_id] +'" alt="" class="circle">';
        let title = '<span class="title myplaces_country"><b>' + data.country + '</b></span>';
        $('#myplaces_ul').append('<li class="collection-item avatar" id="'+ data.country_id + '">' + img + title + '</li>');

        socket.emit('newcountryimg',{'country':data.country,'img':country_icons[data.country_id]});
    }
    // add city
    $("#"+country_lowercase).append('<p id="'+data.city_id+'">' + data.city + '</p>');
}

import io from 'socket.io-client';

const roomName = window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
console.log('user:',username);
var socket = io({
    query: {
        roomName: username,
    },
    transports: ['websocket'],
    upgrade: false
});

function sendCity(city) {
    socket.emit('newplace',city);
}

socket.on('message', function(data) {
    console.log(data);
})

socket.on('newplace', function(data) {
    console.log('New place from backend: ', data);
    data.coords = L.point(data.coords);
    addMarker(data);
})

$("#markers-switch").on("change",function() {
    var status = $(this).prop('checked');


});
