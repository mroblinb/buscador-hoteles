-- Exportar datos de reservas (casa → clase o al revés)
-- Ejecutar después de docker-compose up --build

SET FOREIGN_KEY_CHECKS = 0;

-- Aquí van todos los inserts si quieres pasar unos datos de un lado a otro.
INSERT INTO reservas (id, hotel_id, nombre_cliente, fecha_entrada, fecha_salida, numero_habitaciones) VALUES (1, 1, 'Cliente de Ejemplo', '2026-05-21', '2026-05-28', 1);

INSERT INTO auditoria_reservas (id, hotel_id, reserva_id, fecha_hora) VALUES (1, 1, 1, '2026-05-20 18:36:01');

SET FOREIGN_KEY_CHECKS = 1;
