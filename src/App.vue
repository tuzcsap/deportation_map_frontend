<template>
  <div id="map" />
  <div class="q-pa-md bg-grey-10 text-white">
    <q-slider v-model="year" @change="changeYearListener" :min="1918" :max="1953" :step="1" snap label label-always
      color="red-10" id="slider" />
  </div>
</template>

<script setup>
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from 'axios';
import { onMounted } from "vue";
import { ref } from "vue";

import { useFetch } from '@vueuse/core'
import length from '@turf/length'
import along from '@turf/along'

import { geoJSON } from "./assets/ussr_subset_geo";

const locationCoords = ref(null);
const exileCoords = ref(null);

// const API_URL = "http://127.0.0.1:8000"
const API_URL = "http://109.234.39.83:8000"

const year = ref(1937)
const geoJSONSource = ref(geoJSON[0])

let m;

// const url = ref(`${API_URL}/locations/filter?year=${yearTest.value}`)
// const testLocations = ref(null)
// const { data } = useFetch(url, { refetch: true })


const fetchLocations = (year) => {
  axios.get(`${API_URL}/cases/filter?year=${year}`)
    .then((response) => {
      const homes = response.data.map((res) => ({
        type: res.home.type,
        geometry: res.home.geometry,
        properties: { exile_lon: res.exile.geometry.coordinates[0], exile_lat: res.exile.geometry.coordinates[1], ...res.home.properties }
      }))
      // const exiles = response.data.map((res) => res.exile)
      const exiles = response.data.map((res) => ({
        type: res.exile.type,
        geometry: res.exile.geometry,
        properties: { home_lon: res.home.geometry.coordinates[0], home_lat: res.home.geometry.coordinates[1], ...res.exile.properties }
      }))
      locationCoords.value = homes
      exileCoords.value = exiles
    })
  // response.data.map(case => case.home)
}


// homeCoords = await makeGetRequest
fetchLocations(1937)
// console.log('home', homeCoords)

// hardcoded mapping for geojsons
const changeYearListener = (year) => {
  console.log('year changed', year)

  fetchLocations(year)
  m.getSource("locations").setData({
    type: "FeatureCollection",
    features:
      locationCoords.value
  })
  m.getSource("exiles").setData({
    type: "FeatureCollection",
    features:
      exileCoords.value
  })


  // change USSR borders geoJSON
  let mapBordersId

  if (year < 1920) {
    mapBordersId = 0
  } else if (year < 1921) {
    mapBordersId = 2
  } else if (year < 1940) {
    mapBordersId = 4
  } else if (year < 1945) {
    mapBordersId = 7
  } else {
    mapBordersId = 9
  }

  console.log(geoJSON[mapBordersId])
  m.getSource("ussr").setData(geoJSON[mapBordersId])
}

const calculateArcCoords = (origin, destination, route, steps = 300) => {
  const lineDistance = length(route.features[0]);
  const arc = [];
  for (let i = 0; i < lineDistance; i += lineDistance / steps) {
    const segment = along(route.features[0], i);
    arc.push(segment.geometry.coordinates);
  }
  return arc
}

const generateArcSource = (origin, destination, steps = 300) => {
  const route = {
    'type': 'FeatureCollection',
    'features': [
      {
        'type': 'Feature',
        'geometry': {
          'type': 'LineString',
          'coordinates': [origin, destination]
        }
      }
    ]
  }
  // calculate coords for arc
  const arc = calculateArcCoords(origin, destination, route, steps)
  // Update the route with calculated arc coordinates
  route.features[0].geometry.coordinates = arc;
  return route
}


onMounted(() => {
  // const route = generateArcSource(origin, destination)
  mapboxgl.accessToken = "pk.eyJ1IjoibWlraGFpbG1pYXppbiIsImEiOiJjbDNyNWNqOWcxYmg1M2NsMjBpMXE1Y3Z0In0.EKt0NQQJRISdpG0ah6evCw";
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mikhailmiazin/cl3py6jqo002b16lap9gjy04z",
    zoom: 4,
    center: [37.6156, 55.7522]
  });

  // get map handle
  m = map;

  map.on("load", () => {
    // Here we want to load a layer
    map.addSource("ussr", {
      type: "geojson",
      data:
        geoJSONSource.value,
    });
    map.addLayer({
      id: "ussr-fill",
      type: "fill",
      source: "ussr",
      paint: {
        "fill-color": "#D8421C",
        "fill-opacity": 0.4
      },
    });
    // homes source
    map.addSource("locations", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: locationCoords.value
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'locations',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          100,
          30,
          750,
          40
        ]
      }
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'locations',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    map.addLayer({
      id: 'unclustered-points',
      type: 'circle',
      source: 'locations',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    map.addSource("exiles", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: exileCoords.value
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });
    map.addLayer({
      id: 'exile-clusters',
      type: 'circle',
      source: 'exiles',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'red',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          100,
          30,
          750,
          40
        ]
      }
    });

    map.addLayer({
      id: 'exile-cluster-count',
      type: 'symbol',
      source: 'exiles',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    map.addLayer({
      id: 'exile-unclustered-points',
      type: 'circle',
      source: 'exiles',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': 'red',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

  });
  // inspect a cluster on click
  map.on('click', 'clusters', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['clusters']
    });
    const clusterId = features[0].properties.cluster_id;
    map.getSource('locations').getClusterExpansionZoom(
      clusterId,
      (err, zoom) => {
        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom
        });
      }
    );
  });

  map.on('click', 'exile-clusters', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['exile-clusters']
    });
    const clusterId = features[0].properties.cluster_id;
    map.getSource('exiles').getClusterExpansionZoom(
      clusterId,
      (err, zoom) => {
        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom
        });
      }
    );
  });

  // show popup
  map.on('click', 'unclustered-points', (e) => {
    // Copy coordinates array.
    const coordinates = e.features[0].geometry.coordinates.slice();
    const destination = [e.features[0].properties.exile_lon, e.features[0].properties.exile_lat]
    const description = e.features[0].properties.description;
    const name = e.features[0].properties.name;
    const year = e.features[0].year

    new mapboxgl.Popup()
      .setLngLat(coordinates)
      .setHTML(description)
      .addTo(map);

    console.log(`coords: ${coordinates}, dest: ${destination}`)
    const route = generateArcSource(coordinates, destination)

    if (map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')

      map.addSource('route', {
        type: 'geojson',
        data: route
      });
      map.addLayer({
        id: 'route',
        source: 'route',
        type: 'line',
        paint: {
          'line-width': 2,
          'line-color': '#007cbf'
        }
      })
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: route
      });
      map.addLayer({
        id: 'route',
        source: 'route',
        type: 'line',
        paint: {
          'line-width': 4,
          'line-color': '#007cbf'
        }
      })
    }
    // map.on('click', 'route', (e) => {
    //   map.removeLayer('route')
    //   map.removeSource('route')
    // })
  });
  map.on('click', 'exile-unclustered-points', (e) => {
    // Copy coordinates array.
    const coordinates = e.features[0].geometry.coordinates.slice();
    const destination = [e.features[0].properties.home_lon, e.features[0].properties.home_lat]
    const description = e.features[0].properties.description;
    const name = e.features[0].properties.name;
    const year = e.features[0].year

    new mapboxgl.Popup()
      .setLngLat(coordinates)
      .setHTML(`<p>${name}<p/><p>${description}</p>`)
      .addTo(map);

    console.log(`coords: ${coordinates}, dest: ${destination}`)
    const route = generateArcSource(coordinates, destination)

    if (map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')

      map.addSource('route', {
        type: 'geojson',
        data: route
      });
      map.addLayer({
        id: 'route',
        source: 'route',
        type: 'line',
        paint: {
          'line-width': 2,
          'line-color': '#007cbf'
        }
      })
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: route
      });
      map.addLayer({
        id: 'route',
        source: 'route',
        type: 'line',
        paint: {
          'line-width': 4,
          'line-color': '#007cbf'
        }
      })
    }
  });
  map.on('click', 'route', (e) => {
      map.removeLayer('route')
      map.removeSource('route')
    })
});
</script>

<style>
#map {
  height: 95vh;
}

#slider {
  height: 5vh;
}
</style>
