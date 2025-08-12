# [1.2.0](https://github.com/bkosm/medusa-notification-ses/compare/v1.1.0...v1.2.0) (2025-08-12)


### Bug Fixes

* kiro: initialize repository ([912b47e](https://github.com/bkosm/medusa-notification-ses/commit/912b47e70208148c29096f29026bdc225f076a89))


### Features

* ci: convert Claude workflows to manual triggers ([7a54e51](https://github.com/bkosm/medusa-notification-ses/commit/7a54e516b9b1bc1dae20f77b9b2888a45ac2fdda))

# [1.1.0](https://github.com/bkosm/medusa-notification-ses/compare/v1.0.1...v1.1.0) (2025-07-16)


### Bug Fixes

* *: better error handling in templates ([e734380](https://github.com/bkosm/medusa-notification-ses/commit/e734380c4c3fb741a86f85ef1ce5b266678d6db3))
* adapter: tidy ([b76a673](https://github.com/bkosm/medusa-notification-ses/commit/b76a673ca72a6ccc37b93e828e771efe409a6e8a))
* docs: one more update ([ad1c5be](https://github.com/bkosm/medusa-notification-ses/commit/ad1c5beccb1f9dd958a67ec9914745b72a363fb5))
* docs: update once more ([d558e5b](https://github.com/bkosm/medusa-notification-ses/commit/d558e5b0555725701f2c77a374098ee8ddf3d5a4))
* s3: throw on undefined response body ([422d45b](https://github.com/bkosm/medusa-notification-ses/commit/422d45baca147f8beb10a2d0e96f95183d753141))
* s3templates: cleanup the interface ([dfc362b](https://github.com/bkosm/medusa-notification-ses/commit/dfc362b4ef297d1c29dc6e896c79fe9e7f574747))
* sandbox: cleanup ([3f5a60a](https://github.com/bkosm/medusa-notification-ses/commit/3f5a60a83dc5cca970ccc4d993661217920799c2))
* update documentation ([9a2fa33](https://github.com/bkosm/medusa-notification-ses/commit/9a2fa33f0d0677b276c5b98816b1e5746c2f23c3))


### Features

* *: rearrange template providers into subpackage ([d4274e0](https://github.com/bkosm/medusa-notification-ses/commit/d4274e0cf0eea5fcb06ce5973699f63d50b31d9e))
* expose everything by default ([580a294](https://github.com/bkosm/medusa-notification-ses/commit/580a294422399cecfb916cbd2d8aece0ef3447d9))
* implement an s3 provider ([03f088c](https://github.com/bkosm/medusa-notification-ses/commit/03f088ce823230e24aa45d7a30d32cdee3f9f588))
* templates: init time validation of config ([b89404f](https://github.com/bkosm/medusa-notification-ses/commit/b89404f85fe15be2b57e2a745e3aa0ff1e89abe9))

## [1.0.1](https://github.com/bkosm/medusa-notification-ses/compare/v1.0.0...v1.0.1) (2025-07-15)


### Bug Fixes

* ses: auth config via options ([7035d25](https://github.com/bkosm/medusa-notification-ses/commit/7035d258373294354054fb596e4796631a03160f))

# 1.0.0 (2025-06-25)


### Bug Fixes

* .github: claude review skip condition ([b1390fa](https://github.com/bkosm/medusa-notification-ses/commit/b1390faf86bb439e316650df2d6ba8d6ef0ef9e3))
* .github: write permissions for main workflow ([8c78575](https://github.com/bkosm/medusa-notification-ses/commit/8c7857576e55fe54fa3185163559e3e0bebfd7ac))
* adapter: nodemailerConfig.from is typewise required ([3b09807](https://github.com/bkosm/medusa-notification-ses/commit/3b09807f97d79b1d112b0ea9d1af4d4a67d55167))
* example: package is linked instead of installed ([5f79d25](https://github.com/bkosm/medusa-notification-ses/commit/5f79d2586ab74769613304672537c6edff682ef0))
* example: rebuild lockfile ([c5f61d9](https://github.com/bkosm/medusa-notification-ses/commit/c5f61d90f5b06fe26f2d07ff0fa96d32075a5042))
* readme: explain status and fix examples ([6132f88](https://github.com/bkosm/medusa-notification-ses/commit/6132f88a2458e4d1def965ba5ea5548fa596b999))


### Features

* .github: setup workflows ([92e49ee](https://github.com/bkosm/medusa-notification-ses/commit/92e49ee61773c40bf4c3eefc845f202774b0f22b))
* *: email templates support ([6852855](https://github.com/bkosm/medusa-notification-ses/commit/68528554be7905b4fd02d44989e1ae01e757c93b))
* *: init ([37c34d4](https://github.com/bkosm/medusa-notification-ses/commit/37c34d444921926a9c919e40fc3a714778260592))
* *: SES sandbox support ([ad22008](https://github.com/bkosm/medusa-notification-ses/commit/ad2200830203ef0cefd65f663c401de2d6967c4d))
* example: showcase templates ([1e485d1](https://github.com/bkosm/medusa-notification-ses/commit/1e485d1627494aeb1523e22df0d30e2ec2592819))
* examples: full app example with the provider ([ffa1e33](https://github.com/bkosm/medusa-notification-ses/commit/ffa1e33ff06dc8728b36c390786d127a811fb62f))
* sandbox: option to skip verification checks ([4cf3e39](https://github.com/bkosm/medusa-notification-ses/commit/4cf3e398d4c684529728550e8b2ea7f4fa397903))

## [0.2.3](https://github.com/bkosm/medusa-notification-ses/compare/v0.2.2...v0.2.3) (2025-06-23)


### Bug Fixes

* examples: moving forward to a working version ([78db377](https://github.com/bkosm/medusa-notification-ses/commit/78db377428f15bd6b6509c423d04a8c717ad15eb))
* justfile: tag fixing recipe ([1d5680f](https://github.com/bkosm/medusa-notification-ses/commit/1d5680f67b8897d58728f171e8a32d438dd4e537))
* package: default aws credentials provider ([591ddd6](https://github.com/bkosm/medusa-notification-ses/commit/591ddd66ae425c2bcfe816525342d2db626c9a44))

## [0.2.2](https://github.com/bkosm/medusa-notification-ses/compare/v0.2.1...v0.2.2) (2025-06-23)


### Bug Fixes

* package: fix nodemailer ses v3 setup ([c39681b](https://github.com/bkosm/medusa-notification-ses/commit/c39681ba72d5fb67e3aa0fd5b246b5baafcd7992))

## [0.2.1](https://github.com/bkosm/medusa-notification-ses/compare/v0.2.0...v0.2.1) (2025-06-23)


### Bug Fixes

* examples: try to make it work ([2b3041b](https://github.com/bkosm/medusa-notification-ses/commit/2b3041b2b5271e9d4612f5404ade56dab00b04c4))

# [0.2.0](https://github.com/bkosm/medusa-notification-ses/compare/v0.1.0...v0.2.0) (2025-06-19)


### Features

* *: email templates support ([6852855](https://github.com/bkosm/medusa-notification-ses/commit/68528554be7905b4fd02d44989e1ae01e757c93b))
* *: SES sandbox support ([ad22008](https://github.com/bkosm/medusa-notification-ses/commit/ad2200830203ef0cefd65f663c401de2d6967c4d))
* examples: full app example with the provider ([1ee69d5](https://github.com/bkosm/medusa-notification-ses/commit/1ee69d5da163e8cfd3f57988497a5fdf22574295))
* package: set up for release ([599870d](https://github.com/bkosm/medusa-notification-ses/commit/599870d8e352c19087541249738b2213248b8b64))
