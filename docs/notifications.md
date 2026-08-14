# Notifications & Alerts System Documentation — ResQAI Platform

## 1. Executive Summary & Purpose

The **ResQAI Notifications & Alerts System** provides centralized, real-time, operator-focused in-app operational alerting. It evaluates emergency events against strict rule conditions and deduplication constraints to surface actionable alerts to control-room operators without alert fatigue or duplicate notification storms.

---

## 2. Architecture & Data Flow

```
Operational Events (Incident Creation, Priority Escalation, Resource Offline, Reallocation)
                                       │
                                       ▼
                         src/engines/notificationRules.ts
                                       │
                                       ▼
                        src/engines/notificationEngine.ts
                        (Deduplication Key Evaluation)
                                       │
                                       ▼
                         src/services/notifications.ts
                         (Supabase Persistence & Store)
                                       │
                                       ▼
                       src/hooks/useNotificationRealtime.ts
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
  NotificationBell              NotificationToast              AlertsHistoryPage
 (Top-bar Bell & Panel)       (In-app Toast Overlay)             (/alerts Route)
```

---

## 3. Severity Levels & Notification Types

### 3.1 Severity Levels
- **`CRITICAL`**: Requires immediate operator attention and explicit human acknowledgment (`[ACKNOWLEDGE]`). Surfaces strong toast alert.
- **`WARNING`**: Important operational event (e.g. response delays, fleet capacity reduction). Surfaces warning toast overlay.
- **`INFO`**: Informational operational log (e.g. unit returned to service). Silent update in notification panel.
- **`SUCCESS`**: Action completion notification.

### 3.2 Notification Types
| Notification Type | Severity | Trigger Condition | Action Label | Route |
| :--- | :--- | :--- | :--- | :--- |
| `CRITICAL_INCIDENT` | `CRITICAL` | New P1 emergency logged | `OPEN INCIDENT` | `/incidents/:id` |
| `HIGH_PRIORITY_INCIDENT` | `WARNING` | New High-priority emergency logged | `REVIEW` | `/incidents/:id` |
| `NO_RESOURCE_AVAILABLE` | `CRITICAL` | Phase 8 allocation returns no available unit | `REVIEW ALLOCATION` | `/incidents/:id` |
| `REALLOCATION_REQUIRED` | `CRITICAL` / `WARNING` | Phase 9 engine recommends dynamic reassignment | `REVIEW REALLOCATION` | `/reallocation` |
| `RESOURCE_OFFLINE` | `CRITICAL` / `WARNING` | Unit goes OFFLINE (CRITICAL if actively assigned) | `INSPECT UNIT` | `/resources/:id` |
| `INCIDENT_WAITING` | `WARNING` / `CRITICAL` | Incident waiting $>10\text{ min}$ without dispatch | `DISPATCH UNIT` | `/incidents/:id` |
| `RESOURCE_AVAILABLE` | `INFO` | Offline unit returns to service | `VIEW UNIT` | `/resources/:id` |
| `INCIDENT_ESCALATED` | `CRITICAL` / `WARNING` | Priority score escalates | `INSPECT` | `/incidents/:id` |

---

## 4. Deduplication Logic

To prevent alert fatigue and duplicate notifications during burst events:
- Every notification rule calculates a unique **deduplication key** string (e.g. `CRITICAL_INCIDENT:i5555555...` or `RESOURCE_OFFLINE:r3333333...:ASSIGNED`).
- `notificationEngine.ts` maintains an active deduplication cache. If a rule output matches an existing deduplication key, payload creation is blocked.

---

## 5. UI Components

### 5.1 Top-Bar Bell & Badge (`NotificationBell.tsx` & `NotificationBadge.tsx`)
- Mounted in header bar displaying real-time unread count badge.
- Clicking opens `NotificationPanel.tsx` dropdown panel.

### 5.2 Dropdown Panel (`NotificationPanel.tsx`)
- Tab filters: `All`, `Unread`, `Critical`, `Warning`.
- **`Mark All as Read`** trigger.
- Direct link to full history page (`/alerts`).

### 5.3 In-App Live Toast (`NotificationToast.tsx`)
- Non-intrusive floating toast overlay at bottom-right of screen.
- Surfaces automatically for `CRITICAL` and `WARNING` operational events with direct action routing buttons.

### 5.4 Alerts History Page (`AlertsHistoryPage.tsx`)
- Accessible at route `/alerts`.
- Full operational alert audit history featuring multi-field search, severity filters, read/ack controls, and action links.

---

## 6. Database & RLS Migration (`009_notifications.sql`)

Creates table `public.notifications` with fields: `id`, `user_id`, `incident_id`, `resource_id`, `reallocation_event_id`, `type`, `severity`, `title`, `message`, `action_url`, `action_label`, `state`, `deduplication_key`, `created_at`, `acknowledged_at`. Includes indexes on `user_id`, `state`, `severity`, `created_at`, and `deduplication_key` with RLS policies enabled.
