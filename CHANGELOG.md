# [Unreleased]

### Changed

* **BREAKING:** Complete architecture refactoring from regex-based parsing to AST-based approach
* Now uses Babel for TypeScript AST parsing and transformation
* Now uses @vue/compiler-sfc for Vue SFC parsing
* Improved accuracy and reliability of prop type inference
* Better support for complex nested types and expressions
* Enhanced comment preservation (JSDoc and inline comments)

# [1.1.0](https://github.com/arashsheyda/vue-prop-konverter/compare/v1.0.0...v1.1.0) (2025-10-14)


### Features

* update icon ([ab4a294](https://github.com/arashsheyda/vue-prop-konverter/commit/ab4a29489bf1bd11049434bb48f68deda4a1702a))

# 1.0.0 (2025-10-11)


### Bug Fixes

* **core:** enhance script detection regex for ts ([436fe22](https://github.com/arashsheyda/vue-prop-konverter/commit/436fe22efa6180b7a291055807f7544390a2254e))
* **core:** improve update scanning ([1f122dc](https://github.com/arashsheyda/vue-prop-konverter/commit/1f122dcded4bd4fda8978b6308b661497ae7e0e3))
* correctly parse nested generic types in PropType blocks ([ce20b40](https://github.com/arashsheyda/vue-prop-konverter/commit/ce20b40a0f7c143941b94c932cc73ec13495bbaa))
* improve comment extraction and prop parsing logic ([1f6a05d](https://github.com/arashsheyda/vue-prop-konverter/commit/1f6a05dd2509b95b83ff6d7dcf934c4fc4aa01e5))


### Features

* add vitest ([3369ccc](https://github.com/arashsheyda/vue-prop-konverter/commit/3369ccc8bca680e14d8d7111b78c01c9862ff120))
* enhance prop extraction to include comments ([0b8901c](https://github.com/arashsheyda/vue-prop-konverter/commit/0b8901cfa3d5e3c851e2e239d7e03fd7afd760cb))

# Changelog

All notable changes to this project will be documented in this file.
