import { Plugin } from 'vite';

interface ComponentConfig {
    componentTagger: {
        version: string;
        description: string;
        settings: {
            enabled: boolean;
            mode: string;
            generateTailwindConfig: boolean;
            watchFiles: boolean;
            logLevel: string;
        };
        tailwind: {
            inputFile: string;
            outputFile: string;
            intermediateFile: string;
            bundle: boolean;
            format: string;
        };
        components: {
            autoTag: boolean;
            tagPrefix: string;
            categories: Record<string, {
                color: string;
                priority: string;
                components: string[];
            }>;
        };
        security: {
            auditLog: boolean;
            encryptConfig: boolean;
            complianceMode: string;
        };
        monitoring: {
            performance: boolean;
            errors: boolean;
            fileChanges: boolean;
        };
    };
}

declare function componentTagger(configPath?: string): Plugin;

export { componentTagger, type ComponentConfig };
