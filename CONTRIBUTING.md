# Contributing to AndroBase

Thank you for your interest in contributing to AndroBase! We are committed to building an open, accessible, reliable mobile server platform.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Run the automated test suite:
   ```bash
   npm test
   ```

## Contribution Principles

- **Zero Unnecessary Native Compilations**: The core server must run on 32-bit ARMv7 Termux installations without requiring native C++ compilers (`node-gyp`).
- **Memory Consciousness**: Always consider the Android Low Memory Killer. Keep heap allocations bounded and avoid memory-hungry buffers.
- **Fail Safe**: File operations and database writes must be atomic (temp file write followed by atomic rename).
- **Security First**: Never bypass input sanitization, path traversal checks, or rate limiting.

## Submitting Pull Requests

1. Create a feature branch: `git checkout -b feat/your-feature-name`.
2. Ensure all tests pass: `npm test`.
3. Ensure no TypeScript compilation errors: `npm run lint`.
4. Open a pull request against the `main` branch with a clear description of the tested devices and Android versions.
