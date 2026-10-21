document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("searchForm");

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("fecha_entrada").setAttribute("min", today);
    document.getElementById("fecha_salida").setAttribute("min", today);

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const ciudad = document.getElementById("ciudad").value.trim();
        const fecha_entrada = document.getElementById("fecha_entrada").value;
        const fecha_salida = document.getElementById("fecha_salida").value;
        const habitaciones = document.getElementById("habitaciones").value;

        if (!ciudad || !fecha_entrada || !fecha_salida || !habitaciones) {
            alert("Todos los campos son obligatorios.");
            return;
        }

        if (fecha_salida <= fecha_entrada) {
            alert("La fecha de salida debe ser posterior a la de entrada.");
            return;
        }

        const params = new URLSearchParams({
            ciudad: encodeURIComponent(ciudad),
            fecha_entrada,
            fecha_salida,
            habitaciones
        });

        window.location.href = "resultados.html?" + params.toString();
    });
});
