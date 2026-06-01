require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'KtsSecureReader'
  s.version        = package['version']  
  s.summary        = 'Reads iOS security-scoped file URIs from share-sheet handoff'
  s.description    = 'Reads iOS security-scoped file URIs from share-sheet handoff'
  s.license        = { :type => 'MIT' }
  s.author         = { 'KTS Alfa' => 'support@newly.app' }
  s.homepage       = 'https://github.com'
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.4'
  s.source         = { :git => '', :tag => package['version'] }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
