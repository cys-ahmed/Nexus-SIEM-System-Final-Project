const BaseNormalizer = require('./BaseNormalizer');


class LinuxAuthNormalizer extends BaseNormalizer {
    normalize(line) {
        if (!line || line.trim().length === 0) return null;

        const trimmedLine = line.trim();


        const isoPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\s]*)\s+(\S+)\s+([^:\s]+):\s*(\S.*)?$/;
        let match = trimmedLine.match(isoPattern);
        let timestampFormat = 'iso';

        if (!match) {
            const syslogPattern = /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:\s]+):\s*(\S.*)?$/;
            match = trimmedLine.match(syslogPattern);
            timestampFormat = 'syslog';
        }

        if (!match) return null;

        const [, timestamp, hostname, servicePart, message = ''] = match;

        const serviceInfo = this.parseServicePart(servicePart);

        const ips = this.extractIPs(message);

        const eventType = this.classifyEventType(message, serviceInfo.service);

        const severity = this.mapSeverity(message);

        return {
            timestamp: this.formatTimestamp(timestamp, timestampFormat),
            severity: severity,
            message: message.trim(),

            event_type: eventType,

            src_ip: ips.src_ip,
            dest_ip: ips.dest_ip,

            hostname: hostname,
            source_service: serviceInfo.service,
            source_process: serviceInfo.fullProcess,
            source_process_id: serviceInfo.pid,
            source_module: serviceInfo.module,

            ingestion_timestamp: new Date().toISOString(),

            source: serviceInfo.service,
            ip: ips.src_ip,
            pid: serviceInfo.pid,
            raw: line
        };
    }

    formatTimestamp(timestamp, format) {


        if (format === 'iso') {

            return timestamp.replace('T', ' ').substring(0, 19);
        } else {

            const months = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };

            const parts = timestamp.trim().split(/\s+/);
            if (parts.length !== 3) return timestamp;

            const [month, day, time] = parts;
            const currentYear = new Date().getFullYear();
            const monthNum = months[month] || '01';
            const dayNum = day.padStart(2, '0');

            return `${currentYear}-${monthNum}-${dayNum} ${time}`;
        }
    }
}

module.exports = LinuxAuthNormalizer;