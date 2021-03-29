'use strict';

let map, mapEvent;

class Workout {
    date = new Date();
    id = (Date.now() + ' ').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';

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
    type = 'cycling';

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

const run1 = new Running([39, -12], 5.2, 24, 178);
const cycling1 = new Cycling([39, -12], 27, 95, 523);

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const clr_btn = document.querySelector('.glow');

//event handler for clearing the workouts
clr_btn.addEventListener('click', reset);

//clear function workouts
function reset() {
    localStorage.removeItem('workouts');
    location.reload();
}

//App controller
class App {
    #map;
    #mapZoomLevel = 16;
    #mapEvent;
    #workouts = [];

    constructor() {
        //getting user's position
        this._getPosition();
        //get data from local storage
        this._getLocalStorage();
        //attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevatioField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                function () {
                    alert('Could not get your position');
                }
            );
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;

        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        //custom marker
        const greenIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        //user's current marking
        L.marker(coords, { icon: greenIcon }).addTo(this.#map)
            .bindPopup('Your Current Position!')
            .openPopup();

        //area around user's position
        L.circle(coords, {
            color: '#081c15',
            fillColor: '#ade8f4',
            fillOpacity: 0.4,
            radius: 200
        }).addTo(this.#map);

        //Handling clicks on map
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        //Empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevatioField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    }

    _newWorkout(e) {
        const validInputs = (...inputs) =>
            inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) =>
            inputs.every(inp => inp > 0);

        e.preventDefault();
        //get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        //If workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            //check if data is valid
            if (
                !validInputs(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            )
                return alert('Inputs have to be positive!');

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        //If workout cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            //check if data is valid
            if (!validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration))
                return alert('Inputs have to be positive!');

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        //Add new object to workout array
        this.#workouts.push(workout);

        //Render workout on map as marker
        this._renderWorkoutMarker(workout);

        //Render workout om list
        this._renderWorkout(workout);

        //Hide form + Clear input fields
        this._hideForm();

        //set local storage for workouts
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
                    className: `${workout.type}-popup`
                })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id='${workout.id}'>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        `;

        if (workout.type === 'running')
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
      </li>
        `;

        if (workout.type === 'cycling')
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
        </li>
        `;

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    // reset() {
    //     localStorage.removeItem('workouts');
    //     location.reload();
    // }
}

const app = new App();