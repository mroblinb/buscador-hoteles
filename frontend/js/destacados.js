function sanitize(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", async function () {
    var grid = document.getElementById("destacadosGrid");
    if (!grid) return;

    try {
        var response = await fetch("/api/hoteles/destacados");
        var result = await response.json();

        grid.innerHTML = "";

        if (!response.ok || !result.data) return;

        var hoy = new Date();
        var manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        var fHoy = hoy.toISOString().split("T")[0];
        var fManana = manana.toISOString().split("T")[0];

        result.data.forEach(function (hotel) {
            var img = hotel.imagen_principal ||
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='240'%3E%3Crect fill='%23eaeaea' width='360' height='240'/%3E%3Ctext fill='%23333' font-family='sans-serif' font-size='16' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ESin imagen%3C/text%3E%3C/svg%3E";

            var card = document.createElement("a");
            card.className = "destacado-card";
            card.href = "detalle.html?id=" + hotel.id +
                "&fecha_entrada=" + fHoy + "&fecha_salida=" + fManana + "&habitaciones=1";

            card.innerHTML =
                '<img src="' + img + '" alt="' + sanitize(hotel.nombre) + '" loading="lazy">' +
                '<div class="body">' +
                    '<h4>' + sanitize(hotel.nombre) + "</h4>" +
                    '<span class="ciudad">' + sanitize(hotel.ciudad) + "</span>" +
                    '<div class="precio">\u20AC' + parseFloat(hotel.precio_noche).toFixed(2) + "</div>" +
                "</div>";

            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = "";
    }
});
