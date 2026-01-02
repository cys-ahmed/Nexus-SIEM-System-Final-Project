import { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import { walk } from 'estree-walker';
import type { Node } from 'estree-walker';

interface ComponentConfig {
    tag: string;
    category: string;
    priority: string;
    monitoring: boolean;
}

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
        components: Record<string, ComponentConfig>;
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

function prependTags(s: MagicString, config: NexusConfig, componentConfig: ComponentConfig) {
    const tagComment = `/* nexus-tagger: ${componentConfig.tag} | category: ${componentConfig.category} | priority: ${componentConfig.priority} */\n`;
    s.prepend(tagComment);

    if (config.nexusTagger.settings.securityMode) {
        const securityComment = `/* security-monitoring: ${componentConfig.monitoring ? 'enabled' : 'disabled'} */\n`;
        s.prepend(securityComment);
    }
}

function processNode(node: Node, s: MagicString, config: NexusConfig): boolean {
    if (node.type !== 'ExportDefaultDeclaration' || node.declaration.type !== 'FunctionDeclaration') {
        return false;
    }

    const functionName = node.declaration.id?.name;
    if (!functionName) {
        return false;
    }

    const componentConfig = Object.values(config.nexusTagger.components).find(
        comp => comp.tag.includes(functionName.toLowerCase())
    );

    if (componentConfig) {
        prependTags(s, config, componentConfig);
        return true;
    }

    return false;
}

export function nexusTagger(configPath?: string): Plugin {
    const defaultConfigPath = join(process.cwd(), 'app/nexus-tagger/config/nexus-config.json');
    const configFile = configPath || defaultConfigPath;

    let config: NexusConfig;

    try {
        const configContent = readFileSync(configFile, 'utf-8');
        config = JSON.parse(configContent);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[nexus-tagger] Could not load config from ${configFile}: ${message}, using defaults`);
        config = {
            nexusTagger: {
                version: '1.0.0',
                description: 'Default SIEM System Component Tagger',
                settings: {
                    enabled: true,
                    mode: 'development',
                    logLevel: 'info',
                    autoTag: true,
                    securityMode: true
                },
                components: {},
                security: {
                    encryptTags: false,
                    auditLog: true,
                    complianceMode: 'SOC2',
                    dataRetention: '90d'
                },
                monitoring: {
                    performance: true,
                    errors: true,
                    userInteractions: true,
                    securityEvents: true
                }
            }
        };
    }

    return {
        name: 'nexus-tagger',
        version: '1.0.0',

        transform(code, id) {
            if (!config.nexusTagger.settings.enabled) {
                return null;
            }


            if (!id.includes('.tsx') && !id.includes('.jsx')) {
                return null;
            }

            try {
                const ast = parse(code, {
                    sourceType: 'module',
                    plugins: ['jsx', 'typescript', 'decorators-legacy']
                });

                const s = new MagicString(code);
                let hasChanges = false;

                walk(ast.program as unknown as Node, {
                    enter(node: Node) {
                        if (processNode(node, s, config)) {
                            hasChanges = true;
                        }
                    }
                });

                if (hasChanges) {
                    return {
                        code: s.toString(),
                        map: s.generateMap({ hires: true })
                    };
                }
            } catch (error) {
                console.warn(`[nexus-tagger] Error processing ${id}:`, error);
            }

            return null;
        },

        buildStart() {
            if (config.nexusTagger.settings.logLevel === 'info') {
                console.log(`[nexus-tagger] Initialized with ${Object.keys(config.nexusTagger.components).length} components configured`);
            }
        }
    };
}
