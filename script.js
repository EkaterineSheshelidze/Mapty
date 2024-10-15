"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const deleteAll = document.querySelector(".deleteAll");
const sortByDistance = document.querySelector(".sort-by-distance");
const sortByDate = document.querySelector(".sort-by-date");
const errorMessage = document.querySelector(".error");
const errorBtn = document.querySelector(".error-btn");
const zoomoutBtn = document.querySelector(".zoomout");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////////////////////
// Application architecture

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();

    // Get data form local storage
    this._getLocalStorage();

    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    containerWorkouts.addEventListener("click", this._deleteWorkout.bind(this));
    deleteAll.addEventListener("click", this._deleteAllWorkouts.bind(this));
    sortByDistance.addEventListener("click", this._sortByDistance.bind(this));
    sortByDate.addEventListener("click", this._sortByDate.bind(this));
    errorBtn.addEventListener("click", function () {
      errorMessage.style.display = "none";
    });
    zoomoutBtn.addEventListener("click", this._zoomout.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),

      function () {
        alert("Could not get your position");
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    // showing current location
    this.#map = L.map("map").setView(coords, 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // form appearing
    this.#map.on("click", this._showForm.bind(this));
    this.#workouts.forEach((w) => {
      this._renderWorkoutMarker(w);
    });

    // var latlngs = [
    //   [45.51, -122.68],
    //   [37.77, -122.43],
    //   [34.04, -118.2],
    // ];

    // var polyline = L.polyline(latlngs, { color: "red" }).addTo(this.#map);

    // // zoom the map to the polyline
    // this.#map.fitBounds(polyline.getBounds());
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        errorMessage.style.display = "block";
      } else workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create cycling object
    if (type === "cycling") {
      const elevationGain = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevationGain) ||
        !allPositive(distance, duration)
      ) {
        errorMessage.style.display = "block";
      } else
        workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as market
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? `🏃‍♂️` : `🚴‍♂️`} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}
          <div classs="icons">
              <ion-icon
                class="edit"
                name="pencil-outline"
                style="margin-right: 9px"
              ></ion-icon>
              <ion-icon class="delete" name="trash-outline"></ion-icon>
            </div>
          </h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? `🏃‍♂️` : `🚴‍♂️`
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === "running")
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    if (workout.type === "cycling")
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> `;

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    const workout = this.#workouts.find((w) => w.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  } // use local storige only for small amounts of data

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts")); // bc we convert objects to strings and then strings to objects,
    // we lost a prototype chain
    if (!data) return;

    let workouts = [];

    data.forEach(function (d) {
      if (d.type === "running") {
        workouts.push(new Running(d.coords, d.distance, d.duration, d.cadence));
      }
      if (d.type === "cycling") {
        workouts.push(
          new Cycling(d.coords, d.distance, d.duration, d.elevationGain)
        );
      }
    });

    this.#workouts = workouts;

    this.#workouts.forEach((w) => {
      this._renderWorkout(w);
    });
  }

  // _editWorkout() {}
  _deleteWorkout(e) {
    if (e.target.classList.contains("delete")) {
      const workoutEl = e.target.closest(".workout");
      const workout = this.#workouts.find((w) => w.id === workoutEl.dataset.id);

      let items = JSON.parse(localStorage.getItem("workouts"));
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === workout.id) {
          items.splice(i, 1);
        }
      }

      localStorage.removeItem("workouts");
      localStorage.setItem("workouts", JSON.stringify(items));
      // this._getLocalStorage();
      location.reload();
    }
  }

  _sortByDistance() {
    this.#workouts.sort(function (a, b) {
      return a.distance - b.distance;
    });
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    location.reload();
  }

  _sortByDate() {
    this.#workouts.sort(function (a, b) {
      return new Date(a.date) - new Date(b.date);
    });
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    location.reload();
  }

  _deleteAllWorkouts() {
    this.reset();
  }
  _zoomout() {
    let markers = [];
    this.#workouts.forEach(function (i) {
      markers.push(i.coords);
    });

    var bounds = L.latLngBounds(markers);
    this.#map.fitBounds(bounds);
  }
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
