function sanitize(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", async function () {
    var params = new URLSearchParams(window.location.search);
    var hotelId = params.get("id");
    var fechaEntrada = params.get("fecha_entrada");
    var fechaSalida = params.get("fecha_salida");
    var habitaciones = params.get("habitaciones");

    if (!hotelId) {
        window.location.href = "/";
        return;
    }

    var loading = document.getElementById("loading");
    var detalleContent = document.getElementById("detalleContent");
    var errorContainer = document.getElementById("errorContainer");

    var precioNoche = 0;
    var disponibles = 0;
    var today = new Date().toISOString().split("T")[0];

    var form = document.getElementById("reservaForm");
    var inputNombre = document.getElementById("nombre_cliente");
    var inputEntrada = document.getElementById("fecha_entrada");
    var inputSalida = document.getElementById("fecha_salida");
    var inputHabitaciones = document.getElementById("numero_habitaciones");

    var resPrecioNoche = document.getElementById("resPrecioNoche");
    var resNoches = document.getElementById("resNoches");
    var resHabitaciones = document.getElementById("resHabitaciones");
    var resTotal = document.getElementById("resTotal");
    var alertContainer = document.getElementById("reservaAlert");
    var btnReservar = document.getElementById("btnReservar");

    var errorNombre = document.getElementById("errorNombre");
    var errorEntrada = document.getElementById("errorEntrada");
    var errorSalida = document.getElementById("errorSalida");
    var errorHabitaciones = document.getElementById("errorHabitaciones");

    inputEntrada.setAttribute("min", today);
    inputSalida.setAttribute("min", today);

    if (fechaEntrada) inputEntrada.value = fechaEntrada;
    if (fechaSalida) inputSalida.value = fechaSalida;
    if (habitaciones) inputHabitaciones.value = habitaciones;

    async function cargarHotel() {
        try {
            var queryFechaEntrada = inputEntrada.value || fechaEntrada || today;
            var queryFechaSalida = inputSalida.value || fechaSalida || today;

            var url = "/api/hoteles/" + encodeURIComponent(hotelId) +
                "?fecha_entrada=" + encodeURIComponent(queryFechaEntrada) +
                "&fecha_salida=" + encodeURIComponent(queryFechaSalida);

            var response = await fetch(url);
            var result = await response.json();

            loading.style.display = "none";

            if (!response.ok) {
                errorContainer.style.display = "block";
                errorContainer.innerHTML =
                    '<div class="alert alert-error">' + sanitize(result.message) + "</div>";
                return false;
            }

            var hotel = result.data;
            precioNoche = parseFloat(hotel.precio_noche);
            disponibles = hotel.habitaciones_disponibles !== undefined
                ? hotel.habitaciones_disponibles
                : hotel.numero_habitaciones;

            document.getElementById("hotelImagen").src = hotel.imagen_secundaria ||
                hotel.imagen_principal ||
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23eaeaea' width='800' height='600'/%3E%3Ctext fill='%23333' font-family='sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ESin imagen%3C/text%3E%3C/svg%3E";
            document.getElementById("hotelImagen").alt = sanitize(hotel.nombre);
            document.getElementById("hotelNombre").textContent = sanitize(hotel.nombre);
            document.getElementById("hotelCiudad").textContent = sanitize(hotel.ciudad);
            document.getElementById("hotelDescripcion").textContent = sanitize(hotel.descripcion);
            document.getElementById("hotelPrecio").textContent = "\u20AC" + precioNoche.toFixed(2);
            document.getElementById("hotelHabitaciones").textContent = hotel.numero_habitaciones;
            document.getElementById("hotelDisponibles").textContent = disponibles;

            detalleContent.style.display = "block";
            return true;

        } catch (error) {
            loading.style.display = "none";
            errorContainer.style.display = "block";
            errorContainer.innerHTML =
                '<div class="alert alert-error">Error al conectar con el servidor</div>';
            return false;
        }
    }

    var ok = await cargarHotel();
    if (!ok) return;

    function ocultarErrores() {
        [errorNombre, errorEntrada, errorSalida, errorHabitaciones].forEach(function (el) {
            el.classList.remove("visible");
        });
        [inputNombre, inputEntrada, inputSalida, inputHabitaciones].forEach(function (el) {
            el.classList.remove("error");
        });
    }

    function marcarError(input, errorEl) {
        input.classList.add("error");
        errorEl.classList.add("visible");
    }

    function actualizarResumen() {
        var entrada = inputEntrada.value;
        var salida = inputSalida.value;
        var habs = parseInt(inputHabitaciones.value) || 0;

        resPrecioNoche.textContent = "\u20AC" + precioNoche.toFixed(2);
        resHabitaciones.textContent = habs || "0";

        if (entrada && salida && habs > 0) {
            var d1 = new Date(entrada + "T00:00:00");
            var d2 = new Date(salida + "T00:00:00");
            var diffTime = d2 - d1;
            var noches = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

            resNoches.textContent = noches;
            var total = precioNoche * noches * habs;
            resTotal.textContent = "\u20AC" + total.toFixed(2);
        } else {
            resNoches.textContent = "0";
            resTotal.textContent = "\u20AC0";
        }
    }

    inputEntrada.addEventListener("change", function () {
        actualizarResumen();
        cargarHotel();
    });
    inputSalida.addEventListener("change", function () {
        actualizarResumen();
        cargarHotel();
    });
    inputHabitaciones.addEventListener("input", actualizarResumen);

    actualizarResumen();

    function validarFormulario() {
        ocultarErrores();
        var valido = true;

        var nombre = inputNombre.value.trim();
        if (!nombre) {
            marcarError(inputNombre, errorNombre);
            valido = false;
        }

        var entrada = inputEntrada.value;
        if (!entrada) {
            marcarError(inputEntrada, errorEntrada);
            valido = false;
        }

        var salida = inputSalida.value;
        if (!salida) {
            marcarError(inputSalida, errorSalida);
            valido = false;
        }

        var habs = parseInt(inputHabitaciones.value);
        if (!habs || habs < 1) {
            marcarError(inputHabitaciones, errorHabitaciones);
            valido = false;
        }

        return valido;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        alertContainer.innerHTML = "";
        ocultarErrores();

        if (!validarFormulario()) return;

        var nombre = inputNombre.value.trim();
        var entrada = inputEntrada.value;
        var salida = inputSalida.value;
        var habs = parseInt(inputHabitaciones.value);

        if (salida <= entrada) {
            alertContainer.innerHTML =
                '<div class="alert alert-error">La fecha de salida debe ser posterior a la de entrada.</div>';
            return;
        }

        if (entrada < today) {
            alertContainer.innerHTML =
                '<div class="alert alert-error">La fecha de entrada no puede ser anterior a hoy.</div>';
            return;
        }

        if (habs > disponibles) {
            alertContainer.innerHTML =
                '<div class="alert alert-error">Solo hay ' + disponibles +
                ' habitaciones disponibles para estas fechas.</div>';
            return;
        }

        btnReservar.disabled = true;
        btnReservar.textContent = "Reservando...";

        try {
            var response = await fetch("/api/reservas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hotel_id: parseInt(hotelId),
                    nombre_cliente: nombre,
                    fecha_entrada: entrada,
                    fecha_salida: salida,
                    numero_habitaciones: habs
                })
            });

            var result = await response.json();

            if (response.ok) {
                var nuevaUrl = "detalle.html?id=" + hotelId +
                    "&fecha_entrada=" + encodeURIComponent(entrada) +
                    "&fecha_salida=" + encodeURIComponent(salida) +
                    "&habitaciones=" + habs;
                window.history.replaceState(null, "", nuevaUrl);

                alertContainer.innerHTML =
                    '<div class="alert alert-success">\u00a1Reserva confirmada! ID: #' +
                    sanitize(String(result.data.id)) + "</div>";
                inputEntrada.value = entrada;
                inputSalida.value = salida;
                inputHabitaciones.value = habs;
                form.reset();
                inputEntrada.value = entrada;
                inputSalida.value = salida;
                inputHabitaciones.value = habs;
                actualizarResumen();
                await cargarHotel();
            } else {
                alertContainer.innerHTML =
                    '<div class="alert alert-error">' + sanitize(result.message) + "</div>";
            }
        } catch (error) {
            alertContainer.innerHTML =
                '<div class="alert alert-error">Error al conectar con el servidor.</div>';
        } finally {
            btnReservar.disabled = false;
            btnReservar.textContent = "Confirmar reserva";
        }
    });
});
