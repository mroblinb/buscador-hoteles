CREATE TABLE IF NOT EXISTS hoteles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ciudad VARCHAR(50) NOT NULL,
    descripcion TEXT,
    precio_noche DECIMAL(10,2) NOT NULL,
    numero_habitaciones INT NOT NULL,
    imagen_principal VARCHAR(255),
    imagen_secundaria VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    nombre_cliente VARCHAR(100) NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    numero_habitaciones INT NOT NULL,
    FOREIGN KEY (hotel_id) REFERENCES hoteles(id)
);

CREATE TABLE IF NOT EXISTS auditoria_reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    reserva_id INT NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hoteles(id),
    FOREIGN KEY (reserva_id) REFERENCES reservas(id)
);

DELIMITER $$

CREATE TRIGGER IF NOT EXISTS tr_auditoria_reservas
AFTER INSERT ON reservas
FOR EACH ROW
BEGIN
    INSERT INTO auditoria_reservas (hotel_id, reserva_id, fecha_hora)
    VALUES (NEW.hotel_id, NEW.id, NOW());
END$$

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

INSERT INTO hoteles (nombre, ciudad, descripcion, precio_noche, numero_habitaciones, imagen_principal, imagen_secundaria) VALUES
('Hotel Central Palace', 'Madrid', 'Elegante hotel ubicado en pleno centro de Madrid, cerca de la Puerta del Sol y la Gran Via. Disfruta de habitaciones amplias y un servicio excepcional.', 120.00, 10, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop'),
('Barcelona Beach Resort', 'Barcelona', 'Hotel frente al mar con vistas espectaculares al Mediterraneo. Piscina infinita, spa y gastronomia de primer nivel.', 150.00, 8, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop'),
('Seville Garden Hotel', 'Sevilla', 'Encantador hotel con jardines andaluces en el corazon de Santa Cruz. Aire acondicionado, piscina y patio tipico sevillano.', 95.00, 5, 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop'),
('Valencia Marina Inn', 'Valencia', 'Moderno hotel en la Ciudad de las Artes y las Ciencias. Habitaciones minimalistas con terraza y vistas al puerto.', 110.00, 12, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop'),
('Granada Alhambra View', 'Granada', 'Hotel con vistas privilegiadas a la Alhambra. Banos de marmol, restaurante gourmet y hamman tradicional.', 130.00, 6, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop'),
('Bilbao Guggenheim Hotel', 'Bilbao', 'Hotel de diseno junto al Museo Guggenheim. Arquitectura vanguardista, restaurante estrella Michelin y vistas al Nervion.', 140.00, 7, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1558403194-611308249627?w=800&h=600&fit=crop');
