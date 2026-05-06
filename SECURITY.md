# Security & Privacy Policy

This document outlines our security commitments as required by the **FTC Safeguard Rules**, **GLBA (Gramm-Leach-Bliley Act)**, and general best-in-class security practices.

## Reporting a Vulnerability

If you believe you have discovered a security vulnerability in this project, please **do not open a public issue**. Instead, report it immediately to our security team via email at:

**DB3app@gmail.com**

Please include the following details in your report:
- A clear description of the vulnerability.
- Steps to reproduce the issue.
- Potential impact.

We strive to respond to all reports within 48 business hours.

## Policy Commitments

### Data Encryption & Protection (AES-256)
All sensitive data at rest is encrypted using AES-256 standard encryption. Data in transit is protected via mandatory TLS 1.3 or higher protocols.

### FTC Safeguard & GLBA Alignment
We maintain strict compliance with FTC Safeguard Rules and GLBA data privacy standards. We treat all personal financial information with the highest degree of confidentiality, ensuring non-public personal information (NPI) is never exposed beyond authorized processes.

### Authentication & Access Control
- **Mandatory MFA:** Multi-Factor Authentication is required for all administrative and privileged access to the infrastructure.
- **Strict RBAC:** Role-Based Access Control is enforced at the application level. Access is granted based on the principle of least privilege.
- **Automated Session Timeouts:** To prevent unauthorized access, all active user sessions are automatically terminated after 15 minutes of inactivity.

### Security Testing & API Protocols
- **API Protocols:** All API communications are strictly authenticated via OAuth2/OpenID Connect. No public endpoints exist for sensitive operations.
- **Security Testing:** We conduct automated vulnerability scanning (SAST/DAST) in our CI/CD pipeline on every commit.

### Data Usage Disclosures
We are committed to full transparency regarding data. We only collect data necessary to provide our services. We do not sell user data to third parties. Please refer to our [Privacy Policy] for detailed information on what data we collect and how we use it.

## Versions Supported

To ensure maximum security, we only support the following versions of our platform. Older versions may lack critical security patches and are not supported.

| Version | Supported | Notes |
| :--- | :--- | :--- |
| `1.x` | Yes | Latest Stable |
| `0.x` | No | End-of-Life |

We strongly encourage you to always upgrade to the latest stable version to benefit from all security enhancements.
