
class BaseNormalizer {
    
    classifyEventType(message, service) {
        const lower = message.toLowerCase();
        const serviceLower = service.toLowerCase();

        
        if (lower.includes('authentication') ||
            lower.includes('login') ||
            lower.includes('accepted') ||
            lower.includes('denied') ||
            lower.includes('invalid user') ||
            serviceLower.includes('sshd') ||
            serviceLower.includes('auth')) {
            return 'authentication';
        }

        
        if (lower.includes('session opened') ||
            lower.includes('session closed') ||
            lower.includes('new session')) {
            return 'session';
        }

        
        if (lower.includes('connection') ||
            lower.includes('rhost') ||
            lower.includes('network')) {
            return 'network';
        }

        
        if (lower.includes('error') ||
            lower.includes('failed') ||
            lower.includes('failure')) {
            return 'error';
        }

        
        return 'system';
    }

    
    extractIPs(message) {
        const result = {
            src_ip: null,
            dest_ip: null
        };

        
        const rhostMatch = message.match(/rhost=([0-9.]+)/);
        if (rhostMatch) {
            result.src_ip = rhostMatch[1];
        }

        
        const fromMatch = message.match(/from\s+([0-9.]+)/i);
        if (fromMatch && !result.src_ip) {
            result.src_ip = fromMatch[1];
        }

        
        const toMatch = message.match(/to\s+([0-9.]+)/i);
        if (toMatch) {
            result.dest_ip = toMatch[1];
        }

        
        if (!result.src_ip && !result.dest_ip) {
            const ipMatch = message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
            if (ipMatch) {
                result.src_ip = ipMatch[0];
            }
        }

        return result;
    }

    
    mapSeverity(message) {
        const lower = message.toLowerCase();

        
        if (lower.includes('error') ||
            lower.includes('failed') ||
            lower.includes('failure') ||
            lower.includes('denied') ||
            lower.includes('invalid') ||
            lower.includes('alert') ||
            lower.includes('critical') ||
            lower.includes('fatal')) {
            return 'ERROR';
        }

        
        if (lower.includes('warn') ||
            lower.includes('warning') ||
            lower.includes('timeout')) {
            return 'WARNING';
        }

        
        return 'INFO';
    }

    
    parseServicePart(servicePart) {
        
        const match = servicePart.match(/^([^([]+)(?:\(([^)]+)\))?(?:\[(\d+)\])?$/);

        if (!match) {
            return {
                service: servicePart.trim(),
                module: '',
                pid: 0,
                fullProcess: servicePart.trim()
            };
        }

        const service = match[1].trim();
        const module = match[2] ? match[2].trim() : '';
        const pid = match[3] ? Number.parseInt(match[3], 10) : 0;

        
        const fullProcess = pid > 0 ? `${service}[${pid}]` : service;

        return {
            service,
            module,
            pid,
            fullProcess
        };
    }

    
    isValidIP(str) {
        if (!str) return false;
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipv4Regex.test(str)) return false;
        const parts = str.split('.');
        return parts.every(part => Number.parseInt(part, 10) >= 0 && Number.parseInt(part, 10) <= 255);
    }
}

module.exports = BaseNormalizer;
