package com.farmaetiqueta.nativeocr;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

/** Lector de texto con Google ML Kit (modelo incluido en la app; no usa internet). */
@CapacitorPlugin(name = "NativeOcr")
public class NativeOcrPlugin extends Plugin {
    private TextRecognizer recognizer;

    private static JSArray box(Rect r) {
        JSArray a = new JSArray();
        if (r == null) return a;
        a.put(r.left); a.put(r.top); a.put(r.right); a.put(r.bottom);
        return a;
    }

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        r.put("engine", "mlkit");
        call.resolve(r);
    }

    /** image: JPEG o PNG en base64. Devuelve líneas con texto, confianza (0-100), ángulo, caja y sus palabras y caracteres. */
    @PluginMethod
    public void recognize(final PluginCall call) {
        String b64 = call.getString("image");
        if (b64 == null || b64.isEmpty()) { call.reject("Falta la imagen"); return; }
        final Bitmap bmp;
        try {
            byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
            bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Throwable e) { call.reject("No se pudo abrir la imagen: " + e.getMessage()); return; }
        if (bmp == null) { call.reject("No se pudo abrir la imagen"); return; }
        if (recognizer == null) recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        recognizer.process(InputImage.fromBitmap(bmp, 0))
            .addOnSuccessListener(text -> {
                try {
                    JSArray lines = new JSArray();
                    for (Text.TextBlock block : text.getTextBlocks()) {
                        for (Text.Line line : block.getLines()) {
                            JSObject jl = new JSObject();
                            jl.put("text", line.getText());
                            jl.put("conf", Math.round(line.getConfidence() * 100));
                            jl.put("angle", line.getAngle());
                            jl.put("box", box(line.getBoundingBox()));
                            JSArray words = new JSArray();
                            for (Text.Element el : line.getElements()) {
                                JSObject jw = new JSObject();
                                jw.put("text", el.getText());
                                jw.put("conf", Math.round(el.getConfidence() * 100));
                                jw.put("box", box(el.getBoundingBox()));
                                JSArray syms = new JSArray();
                                for (Text.Symbol s : el.getSymbols()) {
                                    JSObject js = new JSObject();
                                    js.put("text", s.getText());
                                    js.put("conf", Math.round(s.getConfidence() * 100));
                                    js.put("box", box(s.getBoundingBox()));
                                    syms.put(js);
                                }
                                jw.put("symbols", syms);
                                words.put(jw);
                            }
                            jl.put("words", words);
                            lines.put(jl);
                        }
                    }
                    JSObject out = new JSObject();
                    out.put("engine", "mlkit");
                    out.put("width", bmp.getWidth());
                    out.put("height", bmp.getHeight());
                    out.put("lines", lines);
                    call.resolve(out);
                } catch (Throwable e) { call.reject("Error al leer el resultado: " + e.getMessage()); }
                finally { bmp.recycle(); }
            })
            .addOnFailureListener(e -> { bmp.recycle(); call.reject("El lector de texto falló: " + e.getMessage()); });
    }
}
