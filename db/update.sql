-- Tabla de auditoria
CREATE TABLE IF NOT EXISTS auditoria_reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    reserva_id INT NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hoteles(id),
    FOREIGN KEY (reserva_id) REFERENCES reservas(id)
);

-- Trigger de auditoria
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS tr_auditoria_reservas
AFTER INSERT ON reservas
FOR EACH ROW
BEGIN
    INSERT INTO auditoria_reservas (hotel_id, reserva_id, fecha_hora)
    VALUES (NEW.hotel_id, NEW.id, NOW());
END$$
DELIMITER ;

-- Stored procedure para reservar
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS sp_realizar_reserva(
    IN p_hotel_id INT,
    IN p_nombre_cliente VARCHAR(100),
    IN p_fecha_entrada DATE,
    IN p_fecha_salida DATE,
    IN p_numero_habitaciones INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255)
)
BEGIN
    DECLARE v_total_habitaciones INT DEFAULT 0;
    DECLARE v_ocupadas INT DEFAULT 0;
    DECLARE v_disponibles INT DEFAULT 0;

    SELECT numero_habitaciones INTO v_total_habitaciones
    FROM hoteles WHERE id = p_hotel_id;

    IF v_total_habitaciones IS NULL THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Hotel no encontrado';
    ELSE
        SELECT COALESCE(SUM(numero_habitaciones), 0) INTO v_ocupadas
        FROM reservas
        WHERE hotel_id = p_hotel_id
            AND fecha_entrada < p_fecha_salida
            AND fecha_salida > p_fecha_entrada;

        SET v_disponibles = v_total_habitaciones - v_ocupadas;

        IF v_disponibles < p_numero_habitaciones THEN
            SET p_resultado = 0;
            SET p_mensaje = CONCAT('No hay suficientes habitaciones disponibles. Disponibles: ', v_disponibles);
        ELSE
            INSERT INTO reservas (hotel_id, nombre_cliente, fecha_entrada, fecha_salida, numero_habitaciones)
            VALUES (p_hotel_id, p_nombre_cliente, p_fecha_entrada, p_fecha_salida, p_numero_habitaciones);
            SET p_resultado = 1;
            SET p_mensaje = CONCAT('Reserva creada correctamente. ID: ', LAST_INSERT_ID());
        END IF;
    END IF;
END$$
DELIMITER ;

-- Fix imagenes rotas
UPDATE hoteles SET imagen_secundaria = 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop' WHERE id = 3;
UPDATE hoteles SET imagen_secundaria = 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop' WHERE id = 4;
UPDATE hoteles SET imagen_principal = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&h=400&fit=crop' WHERE id = 5;
UPDATE hoteles SET imagen_principal = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop' WHERE id = 6;
