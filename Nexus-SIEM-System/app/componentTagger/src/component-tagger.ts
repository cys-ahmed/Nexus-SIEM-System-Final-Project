import { Plugin } from 'vite';
import fs from 'node:fs/promises';
import path, { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import * as esbuild from 'esbuild';
import resolveConfig from 'tailwindcss/resolveConfig.js';

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

function findProjectRoot(startPath = process.cwd()): string {
    try {
        let currentPath = startPath;
        let count = 0;
        while (currentPath !== path.parse(currentPath).root && count < 20) {
            if (existsSync(path.join(currentPath, 'package.json'))) {
                return currentPath;
            }
            currentPath = path.dirname(currentPath);
            count++;
        }
        return process.cwd();
    } catch (error) {
        // Handle error gracefully, or rethrow if critical. For finding project root, falling back to cwd is acceptable.
        console.error('Error finding project root:', error);
        return process.cwd();
    }
}

export function componentTagger(configPath?: string): Plugin {
    const defaultConfigPath = join(process.cwd(), 'app/componentTagger/config/component-config.json');
    const configFile = configPath || defaultConfigPath;

    let config: ComponentConfig;

    try {
        const configContent = readFileSync(configFile, 'utf-8');
        config = JSON.parse(configContent);
    } catch {
        console.warn(`[component-tagger] Could not load config from ${configFile}, using defaults`);
        config = {
            componentTagger: {
                version: '1.0.0',
                description: 'Default SIEM System Component Tagger',
                settings: {
                    enabled: true,
                    mode: 'development',
                    generateTailwindConfig: true,
                    watchFiles: true,
                    logLevel: 'info'
                },
                tailwind: {
                    inputFile: './tailwind.config.ts',
                    outputFile: './src/tailwind.config.siem.json',
                    intermediateFile: './.siem.tailwind.config.js',
                    bundle: true,
                    format: 'esm'
                },
                components: {
                    autoTag: true,
                    tagPrefix: 'siem-',
                    categories: {}
                },
                security: {
                    auditLog: true,
                    encryptConfig: false,
                    complianceMode: 'SOC2'
                },
                monitoring: {
                    performance: true,
                    errors: true,
                    fileChanges: true
                }
            }
        };
    }

    const projectRoot = findProjectRoot();
    const tailwindInputFile = path.resolve(projectRoot, config.componentTagger.tailwind.inputFile);
    const tailwindJsonOutfile = path.resolve(projectRoot, config.componentTagger.tailwind.outputFile);
    const tailwindIntermediateFile = path.resolve(projectRoot, config.componentTagger.tailwind.intermediateFile);
    const isDevelopment = config.componentTagger.settings.mode === 'development';

    async function generateConfig(): Promise<void> {
        if (!config.componentTagger.settings.generateTailwindConfig) {
            return;
        }

        try {
            await esbuild.build({
                entryPoints: [tailwindInputFile],
                outfile: tailwindIntermediateFile,
                bundle: config.componentTagger.tailwind.bundle,
                format: config.componentTagger.tailwind.format as 'esm',
                banner: {
                    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
                }
            });

            const userConfig = await import(
                tailwindIntermediateFile + '?update=' + Date.now()
            );

            if (!userConfig || !userConfig.default) {
                throw new Error('Invalid Tailwind config structure: default export missing');
            }

            const resolvedConfig = resolveConfig(userConfig.default);

            const siemConfig = {
                ...resolvedConfig,
                siem: {
                    componentTagger: config.componentTagger,
                    generatedAt: new Date().toISOString(),
                    version: config.componentTagger.version
                }
            };

            await fs.writeFile(tailwindJsonOutfile, JSON.stringify(siemConfig, null, 2));

            await fs.unlink(tailwindIntermediateFile).catch(() => {
                // Ignore cleanup errors
            });

            if (config.componentTagger.settings.logLevel === 'info') {
                console.log(`[component-tagger] Generated Tailwind config: ${tailwindJsonOutfile}`);
            }
        } catch (error: unknown) {
            // Add context to the error but don't log it here if we are rethrowing to buildStart
            // However, buildStart logs a generic message.
            // Let's log the specific error here and throw a generic one, or just throw and let buildStart log.
            // Given the previous code logged everywhere, let's clean it up to log once effectively.

            // We'll throw it up to buildStart to log.
            // But we might want to attach context.
            if (error instanceof Error) {
                error.message = `[component-tagger] Failed to generate config: ${error.message}`;
            }
            throw error;
        }
    }

    return {
        name: 'vite-plugin-component-tagger',
        version: '1.0.0',
        enforce: 'pre',

        async buildStart() {
            if (!config.componentTagger.settings.enabled || !isDevelopment) {
                return;
            }

            try {
                await generateConfig();
            } catch (error) {
                console.error('[component-tagger] Error generating tailwind.config.siem.json:', error);
            }
        },

        configureServer(server) {
            if (!config.componentTagger.settings.enabled || !isDevelopment || !config.componentTagger.settings.watchFiles) {
                return;
            }

            try {
                server.watcher.add(tailwindInputFile);
                server.watcher.on('change', async (changedPath) => {
                    if (path.normalize(changedPath) === path.normalize(tailwindInputFile)) {
                        if (config.componentTagger.settings.logLevel === 'info') {
                            console.log('[component-tagger] Tailwind config changed, regenerating...');
                        }
                        await generateConfig();
                    }
                });
            } catch (error) {
                console.error('[component-tagger] Error adding watcher:', error);
            }
        }
    };
}
