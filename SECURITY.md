# Security Policy

## Supported Versions

| Version | Supported |
|:---|:---:|
| 1.0.x | :white_check_mark: |
| < 1.0 | :x: |

## Reporting a Vulnerability

If you discover a security vulnerability within AndroBase, please report it responsibly:

- **Do NOT create a public GitHub issue.**
- Email the security team at `security@androbase.org` or contact the repository maintainers through GitHub Security Advisories.
- Please include:
  - Description of the vulnerability.
  - Steps to reproduce or proof-of-concept payload.
  - Affected device architecture or Android version.
  - Potential impact on the host smartphone.

We will acknowledge receipt within 48 hours and work with you on a coordinated disclosure timeline.

## Special Guidance for Android Environments

- AndroBase runs as an unprivileged user in the Termux application sandbox (`u0_a...`).
- We advise users never to run AndroBase as root (`su`) or expose the raw database port directly to public networks.
- Plain HTTP over public Wi-Fi exposes credentials in transit. Use trusted private home Wi-Fi, mobile Wi-Fi hotspot mode, or SSH tunnels.
