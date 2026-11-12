import Foundation
import Capacitor
import UIKit
import Vision

/// Lector de texto con Apple Vision (en el dispositivo; no usa internet).
@objc(NativeOcrPlugin)
public class NativeOcrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeOcrPlugin"
    public let jsName = "NativeOcr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise)
    ]

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["engine": "vision"])
    }

    /// image: JPEG o PNG en base64. Devuelve líneas con texto, confianza (0-100), caja y sus palabras.
    @objc func recognize(_ call: CAPPluginCall) {
        guard let b64 = call.getString("image"),
              let data = Data(base64Encoded: b64, options: .ignoreUnknownCharacters),
              let image = UIImage(data: data),
              let cg = image.cgImage else {
            call.reject("No se pudo abrir la imagen")
            return
        }
        let width = CGFloat(cg.width), height = CGFloat(cg.height)
        // Vision usa coordenadas de 0 a 1 con el origen abajo a la izquierda: se pasan a píxeles con origen arriba.
        func box(_ r: CGRect) -> [Double] {
            return [Double(r.minX * width), Double((1 - r.maxY) * height), Double(r.maxX * width), Double((1 - r.minY) * height)]
        }
        let request = VNRecognizeTextRequest { req, err in
            if let err = err { call.reject("El lector de texto falló: " + err.localizedDescription); return }
            var lines: [[String: Any]] = []
            for obs in (req.results as? [VNRecognizedTextObservation]) ?? [] {
                guard let cand = obs.topCandidates(1).first else { continue }
                let s = cand.string
                var words: [[String: Any]] = []
                var i = s.startIndex
                while i < s.endIndex {
                    while i < s.endIndex && s[i].isWhitespace { i = s.index(after: i) }
                    if i >= s.endIndex { break }
                    var j = i
                    while j < s.endIndex && !s[j].isWhitespace { j = s.index(after: j) }
                    let rect = (try? cand.boundingBox(for: i..<j))?.boundingBox ?? obs.boundingBox
                    words.append(["text": String(s[i..<j]), "conf": Int((cand.confidence * 100).rounded()), "box": box(rect), "symbols": [] as [Any]])
                    i = j
                }
                lines.append(["text": s, "conf": Int((cand.confidence * 100).rounded()), "angle": 0, "box": box(obs.boundingBox), "words": words])
            }
            call.resolve(["engine": "vision", "width": Double(width), "height": Double(height), "lines": lines])
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false          // los lotes y códigos no deben «corregirse» como palabras
        request.recognitionLanguages = ["es-ES", "en-US"]
        DispatchQueue.global(qos: .userInitiated).async {
            do { try VNImageRequestHandler(cgImage: cg, orientation: .up, options: [:]).perform([request]) }
            catch { call.reject("El lector de texto falló: " + error.localizedDescription) }
        }
    }
}
