// Copyright 2016 Google Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//      http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


(function() {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };

  const APIXU_API_KEY = keyManager.getApiKey(); //Add a file called apiKey.js and implement your own keyManager

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function() {
    // Add the newly selected city
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    
    // TODO init the app.selectedCities array here
    if(!app.selectedCities){
      app.selectedCities=[];
    }

    app.getForecast(key, label);
    // TODO push the selected city to the array and save here
    app.selectedCities.push({key,label});
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function(data) {
    var dataLastUpdated = new Date(data.created);
    let currentDay = data.forecast.forecastday[0];
    var sunrise = currentDay.astro.sunrise;
    var sunset = currentDay.astro.sunset;
    var current = data.current;
    var humidity = currentDay.day.avghumidity;
    var wind = currentDay.day.avgvis_miles;

    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.card-last-updated');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    cardLastUpdatedElem.textContent = data.created;

    card.querySelector('.description').textContent = current.condition.text;
    card.querySelector('.date').textContent = data.created;
    card.querySelector('.current .icon').classList.add(app.getIconClass(current.condition.code));
    card.querySelector('.current .temperature .value').textContent =
      Math.round(current.temp_f);
    card.querySelector('.current .sunrise').textContent = sunrise;
    card.querySelector('.current .sunset').textContent = sunset;
    card.querySelector('.current .humidity').textContent =
      Math.round(humidity) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(current.wind_mph);
    card.querySelector('.current .wind .direction').textContent = current.wind_dir;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    let forecastArr = data.forecast.forecastday;
    for (var i = 0; i < 7 && i < forecastArr.length; i++) {
      var nextDay = nextDays[i];
      var daily = forecastArr[i].day;
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(app.getIconClass(daily.condition.code));
        nextDay.querySelector('.icon').title = daily.condition.text;
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.maxtemp_f);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.mintemp_f);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  /*
   * Gets a forecast for a specific city and updates the card with the data.
   * getForecast() first checks if the weather data is in the cache. If so,
   * then it gets that data and populates the card with the cached data.
   * Then, getForecast() goes to the network for fresh data. If the network
   * request goes through, then the card gets updated a second time with the
   * freshest data.
   */
  app.getForecast = function(key, label) {
    if(!label)
      label = key.replace(/-/,", ");
    var url = 'http://api.apixu.com/v1/forecast.json?key=' +APIXU_API_KEY+'&q='+
              label+'&days=7';
    // TODO add cache logic here

    // Fetch the latest data.
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          let results = JSON.parse(request.response);
          
          results.key = results.location.name+"-"+results.location.region;
          results.label = results.location.name+", "+results.location.region;;
          results.created = results.current.last_updated;
          app.updateForecastCard(results);
        }
      } else {
        // Return the initial weather forecast since no data is available.
        app.updateForecastCard(initialWeatherForecast);
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  // TODO add saveSelectedCities function here
  app.saveSelectedCities = function(){
    let selectedCities = JSON.stringify(app.selectedCities);
    localStorage.selectedCities = selectedCities;
  }

  app.getIconClass = function(weatherCode) {
    // Weather codes: http://www.apixu.com/doc/Apixu_weather_conditions.json
    weatherCode = parseInt(weatherCode);
    switch (weatherCode) {
      
      case 1000: // sunny
        return 'clear-day';
      case 1243: // tornado
      case 1195: // tropical storm
      case 1276: // hurricane
      case 1246: // mixed rain and sleet
      case 1192: // freezing drizzle
      case 1087: // drizzle
      case 1171: // freezing rain
      case 1189: // showers
      case 1186: // showers
      case 1201: // hail
      case 1207: // mixed rain and hail
      case 1240: // scattered showers
      case 1063: // scattered showers
      case 1072: // scattered showers
      case 1150: // scattered showers
      case 1153: // scattered showers
      case 1168: // scattered showers
      case 1180: // scattered showers
      case 1183: // scattered showers
      case 1198: // scattered showers
      
        return 'rain';
      case 1273: // severe thunderstorms
      case 1276: // thunderstorms
      case 1087: // thunderstorms
        return 'thunderstorms';
      case 1282: // mixed rain and snow
      case 1279: // mixed snow and sleet
      case 1261: // snow flurries
      case 1258: // light snow showers
      case 1255: // snow
      case 1252: // sleet
      case 1249: // heavy snow
      case 1225: // scattered snow showers
      case 1237: // heavy snow
      case 1222: // snow showers
      case 1219: // snow showers
      case 1216: // snow showers
      case 1213: // snow showers
      case 1210: // snow showers
      case 1207: // snow showers
      case 1204: // snow showers
      case 1114: // snow showers
      case 1066: // snow showers
      case 1117: // snow showers
      case 1069: // snow showers
      
        return 'snow';
      case 1135: // blowing snow
      case 1147: // dust
      case 1030:
        return 'fog';
      case 24: // windy
      case 23: // blustery
        return 'windy';
      case 1003: // cloudy
      case 1006: // mostly cloudy (night)
      case 1009: // mostly cloudy (day)
        return 'cloudy';
      case 29: // partly cloudy (night)
      case 30: // partly cloudy (day)
      case 44: // partly cloudy
        return 'partly-cloudy-day';
    }
  };

  /*
   * Fake weather data that is presented when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
  var initialWeatherForecast = {
    "key":"Cincinnati-Ohio",
    "label":"Cincinnati, Ohio",
    "created":"2019-03-21 22:45",
    "location": {
        "name": "Cincinnati",
        "region": "Ohio",
        "country": "United States of America",
        "lat": 39.16,
        "lon": -84.46,
        "tz_id": "America/New_York",
        "localtime_epoch": 1553223672,
        "localtime": "2019-03-21 23:01"
    },
    "current": {
        "last_updated_epoch": 1553222709,
        "last_updated": "2019-03-21 22:45",
        "temp_c": 6.1,
        "temp_f": 43.0,
        "is_day": 0,
        "condition": {
            "text": "Partly cloudy",
            "icon": "//cdn.apixu.com/weather/64x64/night/116.png",
            "code": 1003
        },
        "wind_mph": 5.6,
        "wind_kph": 9.0,
        "wind_degree": 240,
        "wind_dir": "WSW",
        "pressure_mb": 1015.0,
        "pressure_in": 30.5,
        "precip_mm": 0.6,
        "precip_in": 0.02,
        "humidity": 79,
        "cloud": 50,
        "feelslike_c": 4.2,
        "feelslike_f": 39.5,
        "vis_km": 16.0,
        "vis_miles": 9.0,
        "uv": 0.0,
        "gust_mph": 12.1,
        "gust_kph": 19.4
    },
    "forecast": {
        "forecastday": [
            {
                "date": "2019-03-21",
                "date_epoch": 1553126400,
                "day": {
                    "maxtemp_c": 10.2,
                    "maxtemp_f": 50.4,
                    "mintemp_c": 6.2,
                    "mintemp_f": 43.2,
                    "avgtemp_c": 7.8,
                    "avgtemp_f": 46.0,
                    "maxwind_mph": 11.6,
                    "maxwind_kph": 18.7,
                    "totalprecip_mm": 7.4,
                    "totalprecip_in": 0.29,
                    "avgvis_km": 13.4,
                    "avgvis_miles": 8.0,
                    "avghumidity": 79.0,
                    "condition": {
                        "text": "Light rain shower",
                        "icon": "//cdn.apixu.com/weather/64x64/day/353.png",
                        "code": 1240
                    },
                    "uv": 3.3
                },
                "astro": {
                    "sunrise": "07:40 AM",
                    "sunset": "07:51 PM",
                    "moonrise": "08:46 PM",
                    "moonset": "08:20 AM"
                }
            },
            {
                "date": "2019-03-22",
                "date_epoch": 1553212800,
                "day": {
                    "maxtemp_c": 8.9,
                    "maxtemp_f": 48.0,
                    "mintemp_c": 2.4,
                    "mintemp_f": 36.3,
                    "avgtemp_c": 5.4,
                    "avgtemp_f": 41.7,
                    "maxwind_mph": 15.4,
                    "maxwind_kph": 24.8,
                    "totalprecip_mm": 0.1,
                    "totalprecip_in": 0.0,
                    "avgvis_km": 18.7,
                    "avgvis_miles": 11.0,
                    "avghumidity": 65.0,
                    "condition": {
                        "text": "Patchy rain possible",
                        "icon": "//cdn.apixu.com/weather/64x64/day/176.png",
                        "code": 1063
                    },
                    "uv": 3.4
                },
                "astro": {
                    "sunrise": "07:39 AM",
                    "sunset": "07:52 PM",
                    "moonrise": "09:57 PM",
                    "moonset": "08:54 AM"
                }
            },
            {
                "date": "2019-03-23",
                "date_epoch": 1553299200,
                "day": {
                    "maxtemp_c": 15.2,
                    "maxtemp_f": 59.4,
                    "mintemp_c": 0.7,
                    "mintemp_f": 33.3,
                    "avgtemp_c": 6.7,
                    "avgtemp_f": 44.1,
                    "maxwind_mph": 6.5,
                    "maxwind_kph": 10.4,
                    "totalprecip_mm": 0.0,
                    "totalprecip_in": 0.0,
                    "avgvis_km": 20.0,
                    "avgvis_miles": 12.0,
                    "avghumidity": 47.0,
                    "condition": {
                        "text": "Partly cloudy",
                        "icon": "//cdn.apixu.com/weather/64x64/day/116.png",
                        "code": 1003
                    },
                    "uv": 5.3
                },
                "astro": {
                    "sunrise": "07:37 AM",
                    "sunset": "07:53 PM",
                    "moonrise": "11:07 PM",
                    "moonset": "09:28 AM"
                }
            },
            {
                "date": "2019-03-24",
                "date_epoch": 1553385600,
                "day": {
                    "maxtemp_c": 13.3,
                    "maxtemp_f": 55.9,
                    "mintemp_c": 2.5,
                    "mintemp_f": 36.5,
                    "avgtemp_c": 7.6,
                    "avgtemp_f": 45.7,
                    "maxwind_mph": 9.2,
                    "maxwind_kph": 14.8,
                    "totalprecip_mm": 0.6,
                    "totalprecip_in": 0.02,
                    "avgvis_km": 18.9,
                    "avgvis_miles": 11.0,
                    "avghumidity": 60.0,
                    "condition": {
                        "text": "Moderate rain at times",
                        "icon": "//cdn.apixu.com/weather/64x64/day/299.png",
                        "code": 1186
                    },
                    "uv": 4.8
                },
                "astro": {
                    "sunrise": "07:36 AM",
                    "sunset": "07:54 PM",
                    "moonrise": "No moonrise",
                    "moonset": "10:03 AM"
                }
            },
            {
                "date": "2019-03-25",
                "date_epoch": 1553472000,
                "day": {
                    "maxtemp_c": 9.9,
                    "maxtemp_f": 49.8,
                    "mintemp_c": 0.3,
                    "mintemp_f": 32.5,
                    "avgtemp_c": 6.9,
                    "avgtemp_f": 44.4,
                    "maxwind_mph": 15.7,
                    "maxwind_kph": 25.2,
                    "totalprecip_mm": 23.8,
                    "totalprecip_in": 0.94,
                    "avgvis_km": 14.3,
                    "avgvis_miles": 8.0,
                    "avghumidity": 83.0,
                    "condition": {
                        "text": "Mist",
                        "icon": "//cdn.apixu.com/weather/64x64/day/143.png",
                        "code": 1030
                    },
                    "uv": 1.4
                },
                "astro": {
                    "sunrise": "07:34 AM",
                    "sunset": "07:55 PM",
                    "moonrise": "12:13 AM",
                    "moonset": "10:41 AM"
                }
            },
            {
                "date": "2019-03-26",
                "date_epoch": 1553558400,
                "day": {
                    "maxtemp_c": 8.1,
                    "maxtemp_f": 46.6,
                    "mintemp_c": -2.2,
                    "mintemp_f": 28.0,
                    "avgtemp_c": 2.0,
                    "avgtemp_f": 35.6,
                    "maxwind_mph": 11.6,
                    "maxwind_kph": 18.7,
                    "totalprecip_mm": 0.0,
                    "totalprecip_in": 0.0,
                    "avgvis_km": 20.0,
                    "avgvis_miles": 12.0,
                    "avghumidity": 47.0,
                    "condition": {
                        "text": "Partly cloudy",
                        "icon": "//cdn.apixu.com/weather/64x64/day/116.png",
                        "code": 1003
                    },
                    "uv": 0.1
                },
                "astro": {
                    "sunrise": "07:32 AM",
                    "sunset": "07:56 PM",
                    "moonrise": "01:17 AM",
                    "moonset": "11:23 AM"
                }
            },
            {
                "date": "2019-03-27",
                "date_epoch": 1553644800,
                "day": {
                    "maxtemp_c": 14.3,
                    "maxtemp_f": 57.7,
                    "mintemp_c": -0.5,
                    "mintemp_f": 31.1,
                    "avgtemp_c": 6.6,
                    "avgtemp_f": 43.9,
                    "maxwind_mph": 6.3,
                    "maxwind_kph": 10.1,
                    "totalprecip_mm": 0.0,
                    "totalprecip_in": 0.0,
                    "avgvis_km": 20.0,
                    "avgvis_miles": 12.0,
                    "avghumidity": 45.0,
                    "condition": {
                        "text": "Partly cloudy",
                        "icon": "//cdn.apixu.com/weather/64x64/day/116.png",
                        "code": 1003
                    },
                    "uv": 3.0
                },
                "astro": {
                    "sunrise": "07:31 AM",
                    "sunset": "07:57 PM",
                    "moonrise": "02:16 AM",
                    "moonset": "12:07 PM"
                }
            }
        ]
    }
}
  // TODO uncomment line below to test app with fake data
  // app.updateForecastCard(initialWeatherForecast);

  // TODO add startup code here
  app.selectedCities = localStorage.selectedCities;
  if(app.selectedCities){
    app.selectedCities = JSON.parse(app.selectedCities);
    app.selectedCities.forEach(city =>{
      app.getForecast(city.key,city.label);
    });
  }else{
    app.updateForecastCard(initialWeatherForecast);
    app.selectedCities = [
      {key: initialWeatherForecast.key,label:initialWeatherForecast.label}
    ];
    app.saveSelectedCities();
  }

  // TODO add service worker code here
})();
