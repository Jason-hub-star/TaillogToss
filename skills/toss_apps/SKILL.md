---
name: toss_apps
description: Comprehensive guide for developing and integrating "Apps in Toss" (Mini-apps within the Toss app).
---

# Toss Apps Skill

This skill provides comprehensive knowledge for developing, integrating, and launching "Apps in Toss" (Mini-apps). It covers frameworks, Toss Design System (TDS), security (mTLS), S2S APIs, and AI integration.

## 1. Service Overview & Process

Apps in Toss run within the Toss application, leveraging its massive traffic.

### Service Open Process
1.  **Agreement & Contract**: Sign partnership agreement with Toss.
2.  **Registration**: Register app in [Toss Developers Console](https://developers-apps-in-toss.toss.im/).
3.  **Development**: Choose Web (WebView), React Native, or Unity.
4.  **QA & Review**: Test in Sandbox app and request formal review.
5.  **Launch**: Once approved, the app is launched within Toss.

## 2. Development Frameworks & SDKs

### Implementations
- **Web (WebView)**: Uses `@apps-in-toss/web-framework`. Mandatory **TDS WebView** for non-game apps.
- **React Native**: Uses `@apps-in-toss/react-native-framework` with file-based routing.
- **Game Engine**: Unity/Cocos support via plugins.

### JavaScript SDK (`AppsInToss` object)
The `AppsInToss` SDK (likely available globally or via the framework) provides:
- **Routing**: Internal navigation and query parameter handling.
- **System Control**: Controlling the native back button behavior and app lifecycle.
- **Standard APIs**: Standard Web APIs (`window.open`, etc.) are generally supported within the WebView context.

### Design Tools
- **Toss AppBuilder (Deus)**: Build screens using TDS components. Supports branding and prototyping.
- **Figma**: Official component library for design consistency.

## 3. Toss Design System (TDS)

### Foundation
- **Colors (v5)**: Perceptually uniform color space. Uses hierarchy tokens for dark/light mode consistency.
- **Typography**: Dynamic sizing and line height tokens (accessibility-friendly).

### Key Components
- **Layout**: `Top`, `BottomCTA`, `Bottom Info`, `ListHeader`, `ListRow`, `Board Row`.
- **Input**: `TextField`, `SplitTextField`, `TextArea`, `Checkbox`, `Switch`, `Keypad` (Alphabet, Secure, Number).
- **Feedback**: `Skeleton` (patterns: `topList`, `cardOnly`), `Badge`, `Bubble`, `Overlays`.
- **Media**: `Asset` (Icons, Images, Videos, Lottie).

### Utilities & Hooks
- **Overlay Extension**: `useDialog`, `useToast`, `useBottomSheet`.
- **System**: `useVisualViewport` for viewport management.

## 4. Backend & Security (mTLS)

- **Requirement**: All S2S communication **must** use mTLS.
- **Certificates**: Issued via the Developers Console.
- **Network**: Allow Toss Inbound/Outbound IP ranges in your firewall.

## 5. S2S API & Authentication

### Toss Login (OAuth2)
- **Profile Endpoint**: `GET /api-partner/v1/apps-in-toss/user/oauth2/login-me`
- **Authorization**: `Bearer {AccessToken}`
- **Note**: User profile fields may be null based on consent.

### Core Features
- **In-App Payment (IAP)**: Consumable/Non-consumable. Refunds follow OS policies.
- **Smart Message**: Push (OS) and Notification (Bell). Titles max 13 chars, body max 20 chars.
- **Promotion**: Toss Points integration via S2S APIs.
- **Game Center**: Global leaderboards and player profiles.

## 6. AI & LLM Integration

### MCP Server Support
Apps in Toss provides an **MCP (Model Context Protocol)** server for Cursor and Claude Code.
- **Benefits**: AI refers to SDK docs directly, detects API errors, and generates accurate code.

### Search & Installation
- **docs-search**: Semantic search based on the comprehensive `llms-full.txt` index.
- **Codex**: Install via `$skill-installer` using repo `toss/apps-in-toss-skills`.
- **Claude Code**: Install from marketplace.

## 7. Testing & Launch Checklist
- **Sandbox App**: Mandatory for local/TDS testing.
- **QR Test**: Use `intoss-private://` scheme for private bundle testing.
- **UX Writing**: Review mandatory [UX Writing Guide](https://developers-apps-in-toss.toss.im/design/ux-writing.html) to pass inspection.
