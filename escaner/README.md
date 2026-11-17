# Escáner de documentos

Aplicación web pequeña, en un solo archivo (`index.html`) y sin dependencias, para escanear documentos con la cámara del celular o desde imágenes, y obtenerlos en buena calidad.

## Qué hace

1. **Tomar foto o subir imágenes** (varias a la vez). La foto se toma con la cámara nativa del teléfono, a resolución completa.
2. **Detecta los bordes de la hoja** automáticamente; se pueden ajustar las cuatro esquinas arrastrándolas (con lupa para mayor precisión).
3. **Corrige la perspectiva** (homografía con interpolación bilineal) hasta 3508 px en el lado largo (A4 a 300 ppp).
4. **Mejora la imagen**: quita sombras e iluminación irregular, deja el papel blanco, aumenta el contraste y enfoca el texto. Filtros: *Mejorado* (color), *Grises*, *Blanco y negro* (umbral adaptativo con bordes suaves) y *Original*.
5. **Poca luz** (🌙): aclara fotos oscuras, corrige el color y quita el ruido sin borrar los bordes (filtro guiado + reducción de ruido de color).
6. **4K**: lleva la imagen a 3840 px en el lado largo con escalado por pasos y enfoque. Ojo: el escalado no inventa detalle que la cámara no captó; mejora la presentación y la nitidez aparente.
7. **Borrar con pincel** (✏️ Borrar / texto): se sombrea lo que se quiere quitar y la zona se rellena con el fondo que la rodea, incluido el grano de la foto. Tiene deshacer y zoom con dos dedos.
8. **Agregar texto que imita las letras cercanas**: al tocar un renglón se miden el tamaño, el color, el grosor, el desenfoque y la línea base de las letras de alrededor, y el texto nuevo se pone con esos mismos valores. El tipo de letra se elige de una lista (Times, Arial, Calibri, máquina de escribir, etc.).
9. **Exporta** un PDF de varias páginas (A4, Carta, Oficio o tamaño original), JPG por página, o lo comparte desde el celular. Se elige el peso (alta calidad 300 ppp, equilibrado 200 ppp o liviano 150 ppp) y, con la casilla «No pasar de 30 MB», si el PDF se pasa se reduce la resolución y la compresión de las imágenes hasta quedar por debajo.

Todo se procesa en el navegador: las imágenes no se envían a ningún servidor.

## Uso

Abra `index.html` en el navegador. Para usar la cámara del celular, sirva la carpeta por HTTPS (por ejemplo, GitHub Pages, Netlify o Render como sitio estático) o, en local:

```bash
cd escaner && python3 -m http.server 8080   # http://localhost:8080
```

Consejos para mejores resultados: hoja sobre una superficie oscura, buena luz y la cámara lo más paralela posible al papel.
