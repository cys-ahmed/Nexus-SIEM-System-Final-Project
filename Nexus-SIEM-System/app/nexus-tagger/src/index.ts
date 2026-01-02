import { Plugin } from 'vite';

interface NexusConfig {
    nexusTagger: {
        version: string;
        description: string;
        settings: {
            enabled: boolean;
            mode: string;
            logLevel: string;
            autoTag: boolean;
            securityMode: boolean;
        };
        components: Record<string, {
            tag: string;
            category: string;
            priority: string;
            monitoring: boolean;
        }>;
        security: {
            encryptTags: boolean;
            auditLog: boolean;
            complianceMode: string;
            dataRetention: string;
        };
        monitoring: {
            performance: boolean;
            errors: boolean;
            userInteractions: boolean;
            securityEvents: boolean;
        };
    };
}

declare function nexusTagger(configPath?: string): Plugin;

export { nexusTagger, type NexusConfig };
