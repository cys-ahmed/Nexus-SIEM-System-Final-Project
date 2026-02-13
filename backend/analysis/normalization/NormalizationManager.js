const fs = require('node:fs');
const path = require('node:path');

class NormalizationManager {
    constructor() {
        this.normalizers = new Map();
    }

    
    getNormalizer(logType, deviceType) {
        
        const safeLogType = (logType || 'unknown').toLowerCase().replaceAll(/[^a-z0-9]/g, '');
        const safeDeviceType = (deviceType || 'unknown').toLowerCase().replaceAll(/[^a-z0-9]/g, '');

        const key = `${safeDeviceType}_${safeLogType}`;

        if (this.normalizers.has(key)) {
            return this.normalizers.get(key);
        }

        
        const normalizerPath = path.join(__dirname, `${key}.js`);

        try {
            if (fs.existsSync(normalizerPath)) {
                const NormalizerClass = require(normalizerPath);
                const instance = new NormalizerClass();
                this.normalizers.set(key, instance);
                console.log(`Normalizer loaded: ${key}`);
                return instance;
            } else {
                console.warn(`Normalizer default: ${key}`);
                
                
                
                
                return null;
            }
        } catch (error) {
            console.error(`Load normalizer failed: ${key}`, error);
            return null;
        }
    }
}

module.exports = new NormalizationManager();