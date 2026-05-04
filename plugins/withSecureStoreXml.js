const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withSecureStoreXml = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      fs.mkdirSync(xmlDir, { recursive: true });

      const backupRulesPath = path.join(xmlDir, 'secure_store_backup_rules.xml');
      fs.writeFileSync(
        backupRulesPath,
        `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <exclude domain="sharedpref" path="FlutterSecureStorage"/>
</full-backup-content>
`
      );

      const dataExtractionRulesPath = path.join(xmlDir, 'secure_store_data_extraction_rules.xml');
      fs.writeFileSync(
        dataExtractionRulesPath,
        `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="sharedpref" path="FlutterSecureStorage"/>
    </cloud-backup>
    <device-transfer>
        <exclude domain="sharedpref" path="FlutterSecureStorage"/>
    </device-transfer>
</data-extraction-rules>
`
      );

      return config;
    },
  ]);
};

module.exports = withSecureStoreXml;
