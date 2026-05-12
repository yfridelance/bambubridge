## [1.1.0-dev.4](https://github.com/yfridelance/bambubridge/compare/v1.1.0-dev.3...v1.1.0-dev.4) (2026-05-12)

### Bug Fixes

* **frontend:** revert manualChunks to stop production white screen ([a22f9c0](https://github.com/yfridelance/bambubridge/commit/a22f9c0dc8d9bd83d63a5cca8e5a8db199e34124)), closes [#20](https://github.com/yfridelance/bambubridge/issues/20)

## [1.1.0-dev.3](https://github.com/yfridelance/bambubridge/compare/v1.1.0-dev.2...v1.1.0-dev.3) (2026-05-12)

## [1.1.0-dev.2](https://github.com/yfridelance/bambubridge/compare/v1.1.0-dev.1...v1.1.0-dev.2) (2026-05-12)

### Features

* **prints:** implement print detail page ([3ed1009](https://github.com/yfridelance/bambubridge/commit/3ed100955901c24632707a78b236a9d8f1033a99))

## [1.1.0-dev.1](https://github.com/yfridelance/bambubridge/compare/v1.0.2-dev.1...v1.1.0-dev.1) (2026-05-12)

### Features

* **spools:** implement spool detail page ([886067e](https://github.com/yfridelance/bambubridge/commit/886067eca939dd374b89395c15b5fb14e11d2637))

### Bug Fixes

* **i18n:** add missing common.view key ([7857fab](https://github.com/yfridelance/bambubridge/commit/7857fabec134d3de3d130b61bf4ec1ca55c59af1))
* **mqtt:** disconnect cleanly on SIGTERM/SIGINT ([424f12a](https://github.com/yfridelance/bambubridge/commit/424f12acbc925775a7fd532708aa70782f90fdfb))
* **spoolman:** retry transient HTTP failures with backoff ([79bde1c](https://github.com/yfridelance/bambubridge/commit/79bde1cf79b4e7866dd4b89ab71badce5e4512d0))

### Refactoring

* **db:** introduce schema migration framework ([abfd592](https://github.com/yfridelance/bambubridge/commit/abfd592bfa5643673015716063d00b23ad44386f))

## [1.0.2](https://github.com/yfridelance/bambubridge/compare/v1.0.1...v1.0.2) (2026-05-11)

### Bug Fixes

* correct /api/v1/settings/spoolman response shape ([1f30484](https://github.com/yfridelance/bambubridge/commit/1f3048474aaa0fe779a6bf831aa8d8e2eb22d732))

## [1.0.2-dev.1](https://github.com/yfridelance/bambubridge/compare/v1.0.1...v1.0.2-dev.1) (2026-05-11)

### Bug Fixes

* correct /api/v1/settings/spoolman response shape ([1f30484](https://github.com/yfridelance/bambubridge/commit/1f3048474aaa0fe779a6bf831aa8d8e2eb22d732))

## [1.0.1](https://github.com/yfridelance/bambubridge/compare/v1.0.0...v1.0.1) (2026-05-11)

### Bug Fixes

* stop SSE thread exhaustion and MQTT state oscillation ([e8b103a](https://github.com/yfridelance/bambubridge/commit/e8b103a8cb80dcd1eff607a863d7b2269bb4f5d1)), closes [#13](https://github.com/yfridelance/bambubridge/issues/13)

## 1.0.0 (2026-05-10)

### Features

* add external spool reset handler ([abc2ae2](https://github.com/yfridelance/bambubridge/commit/abc2ae26247cc242fd0ef3d359d09b1db0263415))
* **ci:** add semantic versioning with conventional commits ([c186b26](https://github.com/yfridelance/bambubridge/commit/c186b26ac507b24564430663652d103cb30295b9))
* **config:** add SPOOLMAN_API_URL with SPOOLMAN_UI_URL alias ([4bfe0ca](https://github.com/yfridelance/bambubridge/commit/4bfe0ca3a82dc2586fb1215b76e42c651c76d013))
* **docker:** add multi-stage build for React frontend ([8eeacc8](https://github.com/yfridelance/bambubridge/commit/8eeacc8c45ebf109b4b06cb0954fd5e5448a110f))
* **frontend:** improve Bambu spool linking workflow ([7d680b5](https://github.com/yfridelance/bambubridge/commit/7d680b54980d801a4a8b6c63a3ba6bd3b07289df))
* **pwa:** improve PWA configuration with proper icons ([f09eec2](https://github.com/yfridelance/bambubridge/commit/f09eec230d3c6f35145ad3fdc1ec5595fc13a878))
* rebrand to BambuBridge with new React frontend ([6d19c89](https://github.com/yfridelance/bambubridge/commit/6d19c897396e2e40145659959f92386509bb0496))

### Bug Fixes

* add timeouts to prevent 504 gateway errors ([4f21837](https://github.com/yfridelance/bambubridge/commit/4f21837626dfcbb9efe444758c17db7764162a87))
* **backend:** improve Bambu tag linking and MQTT reliability ([e1d2ccc](https://github.com/yfridelance/bambubridge/commit/e1d2ccc4e72f01541e1dd24ac3aa68e3764863a4))
* **ci:** add packages:write permission for Docker push ([9983eee](https://github.com/yfridelance/bambubridge/commit/9983eee1fa1ec8729ca29e1e0b5328df278bd411))
* **ci:** convert update-versions.sh line endings to LF ([f94d515](https://github.com/yfridelance/bambubridge/commit/f94d5152c286fa872367c396029c4530d991bc31))
* **ci:** make tests.yml reusable as workflow_call ([a7683c5](https://github.com/yfridelance/bambubridge/commit/a7683c5e64f3eff0f2923fa022b73cff3d2ccc10))
* **ci:** set correct git remote URL for forked repositories ([49e0407](https://github.com/yfridelance/bambubridge/commit/49e0407829bca76e40cf3895b1ca0cad31dfdb85))
* **ci:** use cycjimmy/semantic-release-action for proper outputs ([bc48e2e](https://github.com/yfridelance/bambubridge/commit/bc48e2ea8466461d4aaf030c09e8668fe49ccb99))
* **ci:** use dynamic repositoryUrl from GITHUB_REPOSITORY ([aac029b](https://github.com/yfridelance/bambubridge/commit/aac029bd52547666afc510c5a3105f32b9d9066c))
* **ci:** use relative path for update-versions.sh script ([5e17583](https://github.com/yfridelance/bambubridge/commit/5e17583e9686688e69cc131203b62bc7b0ef2fc5))

## [1.0.0-dev.2](https://github.com/yfridelance/bambubridge/compare/v1.0.0-dev.1...v1.0.0-dev.2) (2026-05-09)

### Bug Fixes

* **ci:** use cycjimmy/semantic-release-action for proper outputs ([bc48e2e](https://github.com/yfridelance/bambubridge/commit/bc48e2ea8466461d4aaf030c09e8668fe49ccb99))

## 1.0.0-dev.1 (2026-05-09)

### Features

* **ci:** add semantic versioning with conventional commits ([c186b26](https://github.com/yfridelance/bambubridge/commit/c186b26ac507b24564430663652d103cb30295b9))
* **config:** add SPOOLMAN_API_URL with SPOOLMAN_UI_URL alias ([4bfe0ca](https://github.com/yfridelance/bambubridge/commit/4bfe0ca3a82dc2586fb1215b76e42c651c76d013))
* **docker:** add multi-stage build for React frontend ([8eeacc8](https://github.com/yfridelance/bambubridge/commit/8eeacc8c45ebf109b4b06cb0954fd5e5448a110f))
* **frontend:** improve Bambu spool linking workflow ([7d680b5](https://github.com/yfridelance/bambubridge/commit/7d680b54980d801a4a8b6c63a3ba6bd3b07289df))
* rebrand to BambuBridge with new React frontend ([6d19c89](https://github.com/yfridelance/bambubridge/commit/6d19c897396e2e40145659959f92386509bb0496))

### Bug Fixes

* **backend:** improve Bambu tag linking and MQTT reliability ([e1d2ccc](https://github.com/yfridelance/bambubridge/commit/e1d2ccc4e72f01541e1dd24ac3aa68e3764863a4))
* **ci:** add packages:write permission for Docker push ([9983eee](https://github.com/yfridelance/bambubridge/commit/9983eee1fa1ec8729ca29e1e0b5328df278bd411))
* **ci:** convert update-versions.sh line endings to LF ([f94d515](https://github.com/yfridelance/bambubridge/commit/f94d5152c286fa872367c396029c4530d991bc31))
* **ci:** make tests.yml reusable as workflow_call ([a7683c5](https://github.com/yfridelance/bambubridge/commit/a7683c5e64f3eff0f2923fa022b73cff3d2ccc10))
* **ci:** set correct git remote URL for forked repositories ([49e0407](https://github.com/yfridelance/bambubridge/commit/49e0407829bca76e40cf3895b1ca0cad31dfdb85))
* **ci:** use dynamic repositoryUrl from GITHUB_REPOSITORY ([aac029b](https://github.com/yfridelance/bambubridge/commit/aac029bd52547666afc510c5a3105f32b9d9066c))
* **ci:** use relative path for update-versions.sh script ([5e17583](https://github.com/yfridelance/bambubridge/commit/5e17583e9686688e69cc131203b62bc7b0ef2fc5))
