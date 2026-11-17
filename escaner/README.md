# Escáner de documentos

Aplicación web pequeña, en un solo archivo (`index.html`) y sin dependencias, para escanear documentos con la cámara del celular o desde imágenes, y obtenerlos en buena calidad.

## Qué hace

1. **Tomar foto o subir imágenes** (varias a la vez). La foto se toma con la cámara nativa del teléfono, a resolución completa.
2. **Detecta los bordes de la hoja** automáticamente; se pueden ajustar las cuatro esquinas arrastrándolas (con lupa para mayor precisión).
3. **Corrige la perspectiva** (homografía con interpolación bilineal) hasta 3508 px en el lado largo (A4 a 300 ppp).
4. **Mejora la imagen**: quita sombras e iluminación irregular, deja el papel blanco, aumenta el contraste y enfoca el texto. Filtros: *Mejorado* (color), *Grises*, *Blanco y negro* (umbral adaptativo con bordes suaves) y *Original*.
5. **Exporta** un PDF de varias páginas (A4, Carta, Oficio o tamaño original), JPG por página, o lo comparte desde el celular.

Todo se procesa en el navegador: las imágenes no se envían a ningún servidor.

## Uso

Abra `index.html` en el navegador. Para usar la cámara del celular, sirva la carpeta por HTTPS (por ejemplo, GitHub Pages, Netlify o Render como sitio estático) o, en local:

```bash
cd escaner && python3 -m http.server 8080   # http://localhost:8080
```

Consejos para mejores resultados: hoja sobre una superficie oscura, buena luz y la cámara lo más paralela posible al papel.
