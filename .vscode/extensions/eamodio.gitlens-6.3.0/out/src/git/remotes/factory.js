'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const bitbucket_1 = require("./bitbucket");
const bitbucket_server_1 = require("./bitbucket-server");
const configuration_1 = require("../../configuration");
const custom_1 = require("./custom");
const github_1 = require("./github");
const gitlab_1 = require("./gitlab");
const logger_1 = require("../../logger");
const provider_1 = require("./provider");
exports.RemoteProvider = provider_1.RemoteProvider;
const visualStudio_1 = require("./visualStudio");
const defaultProviderMap = new Map([
    ['bitbucket.org', (domain, path) => new bitbucket_1.BitbucketService(domain, path)],
    ['github.com', (domain, path) => new github_1.GitHubService(domain, path)],
    ['gitlab.com', (domain, path) => new gitlab_1.GitLabService(domain, path)],
    ['visualstudio.com', (domain, path) => new visualStudio_1.VisualStudioService(domain, path)]
]);
class RemoteProviderFactory {
    static factory(providerMap) {
        return (domain, path) => this.create(providerMap, domain, path);
    }
    static create(providerMap, domain, path) {
        try {
            let key = domain.toLowerCase();
            if (key.endsWith('visualstudio.com')) {
                key = 'visualstudio.com';
            }
            const creator = providerMap.get(key);
            if (creator === undefined)
                return undefined;
            return creator(domain, path);
        }
        catch (ex) {
            logger_1.Logger.error(ex, 'RemoteProviderFactory');
            return undefined;
        }
    }
    static createMap(cfg) {
        const providerMap = new Map(defaultProviderMap);
        if (cfg != null && cfg.length > 0) {
            for (const rc of cfg) {
                const provider = this.getCustomProvider(rc);
                if (provider === undefined)
                    continue;
                providerMap.set(rc.domain.toLowerCase(), provider);
            }
        }
        return providerMap;
    }
    static getCustomProvider(cfg) {
        switch (cfg.type) {
            case configuration_1.CustomRemoteType.Bitbucket: return (domain, path) => new bitbucket_1.BitbucketService(domain, path, cfg.protocol, cfg.name, true);
            case configuration_1.CustomRemoteType.BitbucketServer: return (domain, path) => new bitbucket_server_1.BitbucketServerService(domain, path, cfg.protocol, cfg.name, true);
            case configuration_1.CustomRemoteType.Custom: return (domain, path) => new custom_1.CustomService(domain, path, cfg.urls, cfg.protocol, cfg.name);
            case configuration_1.CustomRemoteType.GitHub: return (domain, path) => new github_1.GitHubService(domain, path, cfg.protocol, cfg.name, true);
            case configuration_1.CustomRemoteType.GitLab: return (domain, path) => new gitlab_1.GitLabService(domain, path, cfg.protocol, cfg.name, true);
        }
        return undefined;
    }
}
exports.RemoteProviderFactory = RemoteProviderFactory;
//# sourceMappingURL=factory.js.map