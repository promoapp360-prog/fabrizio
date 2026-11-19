# API

Tutte JSON. Errori: `{ "error": "messaggio" }` con status 400/401/403/404/409/429/500.

## Pubbliche
| Metodo | Percorso | Note |
|---|---|---|
| GET | `/api/reservations?date=YYYY-MM-DD` | fasce orarie disponibili |
| POST | `/api/reservations` | `{date,time,people,name,phone,email?,notes?,privacy:true,marketing,idempotencyKey}` |
| POST | `/api/table/{token}/order` | `{idempotencyKey,notes?,items:[{productId,quantity,cooking?,optionIds[],notes?}]}` |
| GET | `/api/table/{token}/order` | ordini della sessione tavolo aperta |
| POST | `/api/online-order` | carrello + `{channel,pickupAt,name,phone,email?,address?,privacy,payment}` |
| GET | `/api/order/{id}` | stato ordine |
| POST | `/api/auth/login` `{password}` · `/api/auth/logout` | accesso staff con sola password |

## Admin (sessione + permesso)
| Metodo | Percorso | Permesso |
|---|---|---|
| GET/POST | `/api/admin/r/{resource}` | per risorsa (vedi `src/lib/resources.ts`) |
| GET/PATCH/DELETE | `/api/admin/r/{resource}/{id}` | idem |
| GET | `/api/admin/orders[?all=1]` | orders.view |
| PATCH | `/api/admin/orders/{id}` | `{action:"status"\|"weight"\|"confirmFinal"\|"payment",…}` |
| POST/DELETE | `/api/admin/qr/{tableId}` | tables — rigenera / disattiva |
| POST | `/api/admin/tables/{id}/close` | tables — libera tavolo |
| GET/POST | `/api/admin/reservations` · PATCH `/{id}` | reservations |
| GET/POST | `/api/admin/stock` | stock |
| POST | `/api/admin/upload` | content (multipart `files[]`, `gallery`) |
| GET/PUT | `/api/admin/settings` | settings (ordering: orders.manage) |
| GET/POST | `/api/admin/users` | users |
| GET | `/api/admin/export?report=orders\|products\|reservations` | stats (CSV) |
