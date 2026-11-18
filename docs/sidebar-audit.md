# Sidebar audit

## Existing application inventory

Authenticated routes are rendered through the App Router route group at `frontend/src/app/(dashboard)`. Those route files mount `LiveAppShell`, which chooses the page view by pathname and uses the shared `AppLayout` and `AppSidebar`.

| Page | Route | Existing backend integration |
| --- | --- | --- |
| Dashboard | `/dashboard` | `GET /api/dashboard` |
| My Diary | `/my-diary` | Diary list, read, create, update, and archive APIs |
| Memo chatbot landing page | `/ai-diary` | `POST /api/ai/conversations/messages` |
| Writing Modes | `/writing-modes` | `POST /api/diary/writing-modes/process` |
| Beneficiaries | `/beneficiaries` | List and create beneficiary APIs |
| Access Policies | `/legacy-policy` | List, create, and validation policy APIs; validation currently reports unavailable until the Prolog compiler is connected |
| Letter of Wishes | `/letter-of-wishes` | Read and update APIs |
| Activity Logs | `/activity-logs` | Owner-scoped activity log API |
| Settings | `/settings` | Profile and preferences APIs |

The previous sidebar exposed Dashboard as “Home,” exposed activity logs as “Memory Timeline,” and omitted the existing Beneficiaries and Writing Modes pages. The `saved-information` route is another entry-list view and is not a separate feature. The `vault` route has no separate vault UI. Neither is listed in the sidebar to avoid duplicate destinations.

## Final sidebar

- **Main menu:** Dashboard, My Diary, Writing Modes
- **Personal management:** Beneficiaries, Access Policies, Letter of Wishes
- **System:** Activity Logs
- **Footer:** Settings, Sign out

## Not listed

- **Media Library:** The database has a `MediaAsset` model and diary responses include attachment metadata, but there is no media browsing/upload API or standalone media page. A library needs backend storage operations and owner-authorized media retrieval before it can be a functional destination.
- **Notifications:** There is no notification model, API, or page.
- **Separate Legacy Settings:** Existing legacy functionality is represented by Access Policies. There is no distinct release-condition settings page or verified release-event workflow. Inactivity alone must not release content.

These are backend/product gaps, not frontend-only placeholders. They are intentionally not shown as clickable sidebar links.

## Floating AI assistant

The AI assistant is mounted by the authenticated dashboard layout and no longer occupies a sidebar slot. The existing `/ai-diary` route remains as a landing page that opens the floating panel. The panel uses the existing authenticated `POST /api/ai/conversations/messages` endpoint. The endpoint currently persists messages but always returns a fixed no-authorized-information response with no citations; it does not retrieve diary entries or invoke an AI provider. The UI states this limitation and does not show fabricated availability, suggestions, or sources. The endpoint also has no conversation-history retrieval API, so the panel supports starting a new conversation but cannot browse older ones.

## Files in this change

- `frontend/src/components/app-sidebar.tsx`: grouped route-backed navigation and active state.
- `frontend/src/components/floating-assistant.tsx`: authenticated floating chat interface reusing the existing AI endpoint.
- `frontend/src/components/auth-provider.tsx`: persistent authenticated mount for the floating assistant.
- `frontend/src/styles/futuristic.css`: section heading and collapsed-sidebar styling using the existing CSS tokens.
- `docs/sidebar-audit.md`: route inventory, audit findings, and unsupported destinations.
