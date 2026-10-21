function sanitize(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", async function () {
    var params = new URLSearchParams(window.location.search);
    var ciudad = params.get("ciudad");
    var fecha_entrada = params.get("fecha_entrada");
    var fecha_salida = params.get("fecha_salida");
    var habitaciones = params.get("habitaciones");

    if (!ciudad || !fecha_entrada || !fecha_salida || !habitaciones) {
        window.location.href = "/";
        return;
    }

    document.getElementById("tituloResultados").textContent =
        "Hoteles en " + sanitize(ciudad);

    var loading = document.getElementById("loading");
    var hotelGrid = document.getElementById("hotelGrid");
    var noResults = document.getElementById("noResults");
    var errorContainer = document.getElementById("errorContainer");
    var contador = document.getElementById("contador");

    try {
        var response = await fetch(
            "/api/hoteles?" + new URLSearchParams({
                ciudad: ciudad,
                fecha_entrada: fecha_entrada,
                fecha_salida: fecha_salida,
                habitaciones: habitaciones
            }).toString()
        );
        var result = await response.json();

        loading.style.display = "none";

        if (!response.ok) {
            errorContainer.style.display = "block";
            errorContainer.innerHTML =
                '<div class="alert alert-error">' + sanitize(result.message) + "</div>";
            return;
        }

        var hoteles = result.data;

        if (!hoteles || hoteles.length === 0) {
            noResults.style.display = "block";
            contador.textContent = "0 resultados";
            return;
        }

        contador.textContent =
            hoteles.length + " resultado" + (hoteles.length !== 1 ? "s" : "");

        hoteles.forEach(function (hotel) {
            var card = document.createElement("a");
            card.className = "hotel-card";
            card.href =
                "detalle.html?id=" + hotel.id +
                "&fecha_entrada=" + encodeURIComponent(fecha_entrada) +
                "&fecha_salida=" + encodeURIComponent(fecha_salida) +
                "&habitaciones=" + encodeURIComponent(habitaciones);

            var img = hotel.imagen_principal ||
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect fill='%23eaeaea' width='600' height='400'/%3E%3Ctext fill='%23333' font-family='sans-serif' font-size='20' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ESin imagen%3C/text%3E%3C/svg%3E";

            var disponibles = hotel.habitaciones_disponibles !== undefined
                ? hotel.habitaciones_disponibles
                : hotel.numero_habitaciones;

            card.innerHTML =
                '<div class="image-wrapper">' +
                    '<img src="' + img + '" alt="' + sanitize(hotel.nombre) + '" loading="lazy">' +
                    '<span class="badge-ciudad">📍 ' + sanitize(hotel.ciudad) + "</span>" +
                    '<span class="badge-disponibles">' + disponibles + " libres</span>" +
                "</div>" +
                '<div class="hotel-card-body">' +
                    '<h3>' + sanitize(hotel.nombre) + "</h3>" +
                    '<p class="descripcion">' + sanitize(hotel.descripcion || "") + "</p>" +
                    '<p class="precio">€' + parseFloat(hotel.precio_noche).toFixed(2) +
                    ' <small>por noche</small></p>' +
                "</div>";

            hotelGrid.appendChild(card);
        });
    } catch (error) {
        loading.style.display = "none";
        errorContainer.style.display = "block";
        errorContainer.innerHTML =
            '<div class="alert alert-error">Error al conectar con el servidor</div>';
    }
});
