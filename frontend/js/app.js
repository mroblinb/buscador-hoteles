document.getElementById('btnConectar').onclick = async () => {
    const div = document.getElementById('mensaje');
    div.innerText = "Conectando...";
    
    try {
        const response = await fetch('/api/test-db');
        const data = await response.json();
        div.innerText = data.message;
        div.style.color = data.status === 'success' ? 'green' : 'red';
    } catch (error) {
        div.innerText = "Error al contactar con el servidor";
        div.style.color = 'red';
    }
};