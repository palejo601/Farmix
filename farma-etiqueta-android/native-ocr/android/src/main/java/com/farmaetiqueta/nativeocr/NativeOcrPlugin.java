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
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

/** Lector de texto con Google ML Kit (modelo incluido en la app; no usa internet). */
@CapacitorPlugin(name = "NativeOcr")
public class NativeOcrPlugin extends Plugin {
    private TextRecognizer recognizer;
    private BarcodeScanner scanner;

    private static JSArray box(Rect r) {
        JSArray a = new JSArray();
        if (r == null) return a;
        a.put(r.left); a.put(r.top); a.put(r.right); a.put(r.bottom);
        return a;
    }

    private static String fmt(int f) {
        switch (f) {
            case Barcode.FORMAT_EAN_13: return "EAN-13";
            case Barcode.FORMAT_EAN_8: return "EAN-8";
            case Barcode.FORMAT_UPC_A: return "UPC-A";
            case Barcode.FORMAT_UPC_E: return "UPC-E";
            case Barcode.FORMAT_CODE_128: return "Code 128";
            case Barcode.FORMAT_CODE_39: return "Code 39";
            case Barcode.FORMAT_ITF: return "ITF";
            case Barcode.FORMAT_QR_CODE: return "QR";
            case Barcode.FORMAT_DATA_MATRIX: return "DataMatrix";
            default: return "Otro";
        }
    }

    /** image: JPEG/PNG en base64. Devuelve los códigos encontrados: [{value, format, box}]. */
    @PluginMethod
    public void barcodes(final PluginCall call) {
        String b64 = call.getString("image");
        if (b64 == null || b64.isEmpty()) { call.reject("Falta la imagen"); return; }
        final Bitmap bmp;
        try { byte[] bytes = Base64.decode(b64, Base64.DEFAULT); bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length); }
        catch (Throwable e) { call.reject("No se pudo abrir la imagen: " + e.getMessage()); return; }
        if (bmp == null) { call.reject("No se pudo abrir la imagen"); return; }
        if (scanner == null) scanner = BarcodeScanning.getClient(new BarcodeScannerOptions.Builder().setBarcodeFormats(
            Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E, Barcode.FORMAT_CODE_128,
            Barcode.FORMAT_CODE_39, Barcode.FORMAT_ITF, Barcode.FORMAT_QR_CODE, Barcode.FORMAT_DATA_MATRIX).build());
        scanner.process(InputImage.fromBitmap(bmp, 0))
            .addOnSuccessListener(list -> {
                JSArray codes = new JSArray();
                for (Barcode bc : list) {
                    String v = bc.getRawValue(); if (v == null || v.isEmpty()) continue;
                    JSObject o = new JSObject(); o.put("value", v); o.put("format", fmt(bc.getFormat())); o.put("box", box(bc.getBoundingBox()));
                    codes.put(o);
                }
                JSObject out = new JSObject(); out.put("codes", codes); bmp.recycle(); call.resolve(out);
            })
            .addOnFailureListener(e -> { bmp.recycle(); call.reject("El lector de códigos falló: " + e.getMessage()); });
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
