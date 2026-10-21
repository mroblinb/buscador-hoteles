import os
import logging
from datetime import date, datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


def get_db_config():
    return {
        "host": os.getenv("DB_HOST", "db"),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASS", "root"),
        "database": os.getenv("DB_NAME", "bd1"),
    }


def get_db():
    return mysql.connector.connect(**get_db_config())


def sanitize_html(text):
    if not text:
        return ""
    return (text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
                .replace("'", "&#x27;"))


@app.errorhandler(404)
def not_found(e):
    return jsonify({"status": "error", "message": "Recurso no encontrado"}), 404


@app.errorhandler(500)
def server_error(e):
    logger.error("Error interno: %s", e)
    return jsonify({"status": "error", "message": "Error interno del servidor"}), 500


@app.get("/health")
def health():
    return jsonify({"status": "ok"}), 200


@app.get("/api/test-db")
def test_db():
    connection = None
    try:
        connection = get_db()
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        return jsonify({"status": "success", "message": "Conexion a base de datos exitosa"}), 200
    except mysql.connector.Error as exc:
        logger.error("Error de conexion BD: %s", exc)
        return jsonify({"status": "error", "message": f"Error de conexion: {exc}"}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.get("/api/hoteles/destacados")
def hoteles_destacados():
    connection = None
    try:
        connection = get_db()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, nombre, ciudad, precio_noche, imagen_principal, numero_habitaciones "
            "FROM hoteles ORDER BY nombre LIMIT 6"
        )
        hoteles = cursor.fetchall()
        return jsonify({"status": "success", "data": hoteles}), 200
    except mysql.connector.Error as exc:
        logger.error("Error BD al obtener destacados: %s", exc)
        return jsonify({"status": "error", "message": f"Error de base de datos: {exc}"}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.get("/api/hoteles")
def buscar_hoteles():
    ciudad = request.args.get("ciudad", "").strip()
    habitaciones_str = request.args.get("habitaciones", "1").strip()
    fecha_entrada = request.args.get("fecha_entrada", "").strip()
    fecha_salida = request.args.get("fecha_salida", "").strip()

    if not all([ciudad, fecha_entrada, fecha_salida, habitaciones_str]):
        return jsonify({"status": "error", "message": "Todos los campos son obligatorios"}), 400

    try:
        habitaciones = int(habitaciones_str)
        fecha_entrada_dt = datetime.strptime(fecha_entrada, "%Y-%m-%d").date()
        fecha_salida_dt = datetime.strptime(fecha_salida, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"status": "error", "message": "Formato de datos invalido"}), 400

    if fecha_salida_dt <= fecha_entrada_dt:
        return jsonify({"status": "error", "message": "La fecha de salida debe ser posterior a la de entrada"}), 400

    if fecha_entrada_dt < date.today():
        return jsonify({"status": "error", "message": "La fecha de entrada no puede ser anterior a hoy"}), 400

    if habitaciones <= 0:
        return jsonify({"status": "error", "message": "El numero de habitaciones debe ser mayor a 0"}), 400

    connection = None
    try:
        connection = get_db()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT h.*,
                (h.numero_habitaciones - COALESCE(r.booked, 0)) as habitaciones_disponibles
            FROM hoteles h
            LEFT JOIN (
                SELECT hotel_id, SUM(numero_habitaciones) as booked
                FROM reservas
                WHERE fecha_entrada < %s AND fecha_salida > %s
                GROUP BY hotel_id
            ) r ON h.id = r.hotel_id
            WHERE h.ciudad LIKE %s
                AND (h.numero_habitaciones - COALESCE(r.booked, 0)) >= %s
        """
        cursor.execute(query, (fecha_salida, fecha_entrada, f"%{ciudad}%", habitaciones))
        hoteles = cursor.fetchall()

        return jsonify({"status": "success", "data": hoteles}), 200

    except mysql.connector.Error as exc:
        logger.error("Error BD al buscar hoteles: %s", exc)
        return jsonify({"status": "error", "message": f"Error de base de datos: {exc}"}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.get("/api/hoteles/<int:hotel_id>")
def detalle_hotel(hotel_id):
    fecha_entrada = request.args.get("fecha_entrada")
    fecha_salida = request.args.get("fecha_salida")

    connection = None
    try:
        connection = get_db()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM hoteles WHERE id = %s", (hotel_id,))
        hotel = cursor.fetchone()

        if not hotel:
            return jsonify({"status": "error", "message": "Hotel no encontrado"}), 404

        if not fecha_entrada or not fecha_salida:
            fecha_entrada = str(date.today())
            fecha_salida = str(date.today() + timedelta(days=1))

        cursor.execute(
            """
            SELECT COALESCE(SUM(numero_habitaciones), 0) as booked
            FROM reservas
            WHERE hotel_id = %s AND fecha_entrada < %s AND fecha_salida > %s
            """,
            (hotel_id, fecha_salida, fecha_entrada)
        )
        result = cursor.fetchone()
        hotel["habitaciones_ocupadas"] = result["booked"]
        hotel["habitaciones_disponibles"] = hotel["numero_habitaciones"] - result["booked"]

        return jsonify({"status": "success", "data": hotel}), 200

    except mysql.connector.Error as exc:
        logger.error("Error BD al obtener hotel %s: %s", hotel_id, exc)
        return jsonify({"status": "error", "message": f"Error de base de datos: {exc}"}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.post("/api/reservas")
def crear_reserva():
    data = request.get_json()

    required = ["hotel_id", "nombre_cliente", "fecha_entrada", "fecha_salida", "numero_habitaciones"]
    for field in required:
        if field not in data or not data[field]:
            return jsonify({"status": "error", "message": f"El campo {field} es obligatorio"}), 400

    try:
        hotel_id = int(data["hotel_id"])
        habitaciones = int(data["numero_habitaciones"])
        fecha_entrada = data["fecha_entrada"].strip()
        fecha_salida = data["fecha_salida"].strip()
        nombre_cliente = data["nombre_cliente"].strip()

        fecha_entrada_dt = datetime.strptime(fecha_entrada, "%Y-%m-%d").date()
        fecha_salida_dt = datetime.strptime(fecha_salida, "%Y-%m-%d").date()
    except (ValueError, AttributeError):
        return jsonify({"status": "error", "message": "Formato de datos invalido"}), 400

    if fecha_salida_dt <= fecha_entrada_dt:
        return jsonify({"status": "error", "message": "La fecha de salida debe ser posterior a la de entrada"}), 400

    if fecha_entrada_dt < date.today():
        return jsonify({"status": "error", "message": "La fecha de entrada no puede ser anterior a hoy"}), 400

    if habitaciones <= 0:
        return jsonify({"status": "error", "message": "El numero de habitaciones debe ser mayor a 0"}), 400

    if len(nombre_cliente) > 100:
        return jsonify({"status": "error", "message": "El nombre del cliente no puede exceder 100 caracteres"}), 400

    connection = None
    try:
        connection = get_db()
        cursor = connection.cursor()

        cursor.execute(
            "CALL sp_realizar_reserva(%s, %s, %s, %s, %s, @p_res, @p_msg)",
            (hotel_id, nombre_cliente, fecha_entrada, fecha_salida, habitaciones)
        )
        cursor.execute("SELECT @p_res, @p_msg")
        row = cursor.fetchone()
        p_resultado = row[0] if row else None
        p_mensaje = row[1] if row else "Error desconocido"

        if p_resultado == 1:
            import re
            match = re.search(r'ID:\s*(\d+)', str(p_mensaje))
            reserva_id = int(match.group(1)) if match else None
            connection.commit()
            return jsonify({
                "status": "success",
                "message": "Reserva creada correctamente",
                "data": {"id": reserva_id}
            }), 201
        else:
            connection.rollback()
            return jsonify({"status": "error", "message": p_mensaje}), 400

    except mysql.connector.Error as exc:
        if connection:
            connection.rollback()
        logger.error("Error BD al crear reserva: %s", exc)
        return jsonify({"status": "error", "message": f"Error de base de datos: {exc}"}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
