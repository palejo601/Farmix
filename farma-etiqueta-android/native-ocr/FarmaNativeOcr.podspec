Pod::Spec.new do |s|
  s.name = 'FarmaNativeOcr'
  s.version = '1.0.0'
  s.summary = 'Lector de texto nativo (Apple Vision) para FARMA-ETIQUETA'
  s.license = 'MIT'
  s.homepage = 'https://github.com/palejo601/Farmix'
  s.author = 'FARMA-ETIQUETA'
  s.source = { :git => 'https://github.com/palejo601/Farmix.git', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.frameworks = 'Vision'
  s.swift_version = '5.1'
end
