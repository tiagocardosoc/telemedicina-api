# 🏥 Telemedicine API — Event-Driven Architecture Study

> A study project exploring event-driven architecture patterns using a telemedicine appointment scheduling API as the domain.

---

## 🎯 Purpose

This project was built as a hands-on study of **event-driven architecture (EDA)**, focusing on the practical application of two distinct topologies within the same system:

- **Broker topology** — decoupled event distribution with no central coordination
- **Mediator topology** — orchestrated workflows where steps depend on each other

The telemedicine domain was chosen because it naturally exposes both patterns: scheduling an appointment requires strict sequential steps (mediator), while reacting to a confirmed appointment can happen independently across multiple services (broker).

---

## 🏗️ Architecture

```
POST /schedule/appointment
        │
        ▼
  [Hono API]
        │ dispatches: schedule/appointment.requested
        ▼
  [ INNGEST ]  ─────────────────────────── MEDIATOR
        │
        ├─ step 1: check-availability
        ├─ step 2: reserve-time-slot
        ├─ step 3: generate-video-call-link
        └─ step 4: confirm-appointment
                │
                │ publishes: appointment.confirmed
                ▼
         [ RABBITMQ ]  ──────────────────── BROKER
          (fanout exchange)
                │
        ┌───────┼───────┐
        ▼       ▼       ▼
  [notify    [notify   [save
  patient]   doctor]  history]
```

### Why two topologies?

The appointment flow has steps that are **strictly dependent on each other** — you can't generate a video call link before reserving the time slot, and you can't confirm the appointment before the payment is processed. This is a natural fit for the **mediator**, where an orchestrator knows the full flow, controls execution order, and manages state.

Once the appointment is confirmed, however, notifying the patient, notifying the doctor, and saving to history are **completely independent** actions. A failure in one should not affect the others, and none of them need to know about each other. This is a natural fit for the **broker**, where a fanout exchange delivers a copy of the message to each queue independently.

---

## 🔀 Broker Topology — RabbitMQ

The broker is implemented using a **fanout exchange**, which delivers a copy of every published message to all bound queues simultaneously.

Each consumer has its own dedicated queue:

| Queue                        | Responsibility                                 |
| ---------------------------- | ---------------------------------------------- |
| `appointment.notify-patient` | Sends confirmation to the patient (e.g. email) |
| `appointment.notify-doctor`  | Sends push notification to the doctor          |
| `appointment.save-history`   | Persists the appointment record to history     |

The publisher only knows about the exchange — it has no knowledge of which consumers exist or how many there are.

---

## 🎯 Mediator Topology — Inngest

The mediator is implemented using **Inngest**, which orchestrates the critical appointment flow through four sequential steps:

| Step                       | Responsibility                                                |
| -------------------------- | ------------------------------------------------------------- |
| `check-availability`       | Verifies the doctor has no conflicting appointments           |
| `reserve-time-slot`        | Creates a temporary reservation with `pending` status         |
| `generate-video-call-link` | Calls a video provider API to generate a room                 |
| `confirm-appointment`      | Promotes the reservation to `confirmed` and persists the link |

Each step is independently retryable — if step 3 fails, Inngest retries only step 3 without re-executing steps 1 and 2. The full execution history of every run is visible in the Inngest dashboard.

---

## 🛠️ Stack

| Layer            | Technology                 |
| ---------------- | -------------------------- |
| Runtime          | Bun                        |
| Language         | TypeScript                 |
| API Framework    | Hono                       |
| Mediator         | Inngest                    |
| Broker           | RabbitMQ (fanout exchange) |
| Containerization | Docker Compose             |

---

## 🚀 Running locally

**Prerequisites:** Docker and Bun installed.

```bash
# Clone the repository
git clone <repo-url>
cd telemedicine-api

# Install dependencies
bun install

# Start all services
docker compose up
```

Services available at:

- API → `http://localhost:3000`
- Inngest Dashboard → `http://localhost:8288`
- RabbitMQ Dashboard → `http://localhost:15672` (guest/guest)

---

## 🧪 Testing the flow

```bash
curl -X POST http://localhost:3000/schedule/appointment \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "p-123",
    "doctorId": "d-456",
    "date": "2026-05-10",
    "time": "14:30"
  }'
```

Expected response:

```json
{
  "message": "Appointment received and being processed.",
  "status": "processing"
}
```

After the request, you can observe:

- The 4 mediator steps executing in sequence in the **Inngest dashboard**
- The 3 broker consumers processing their queues in the **API logs**
- The exchange and queues in the **RabbitMQ dashboard**

---

## 📁 Project structure

```
src/
├── api/
│   └── schedule-appointment.route.ts   # REST endpoint
├── inngest/
│   ├── client.ts                       # Inngest shared instance
│   └── functions/
│       └── schedule-appointment.function.ts  # Orchestrated flow
├── broker/
│   ├── publisher.ts                    # Publishes to fanout exchange
│   ├── brokers-bootstrap.ts            # Starts all consumers
│   └── consumers/
│       ├── notify-patient.consumer.ts
│       ├── notify-doctor.consumer.ts
│       └── save-history.consumer.ts
├── types/
│   └── appointment-reservation.type.ts
└── server.ts                           # Hono + Inngest handler + bootstrap
```

---

## 📚 Key concepts explored

**Event-driven architecture** — systems where components communicate through events rather than direct calls, promoting decoupling and scalability.

**Broker topology** — a central message broker routes events to consumers that react independently, with no knowledge of each other or of the overall flow.

**Mediator topology** — a central orchestrator coordinates a workflow, knowing each step, controlling execution order, and managing state across the entire process.

**Fanout exchange** — a RabbitMQ exchange type that delivers a copy of every message to all bound queues, enabling true parallel independent consumption.

**Idempotent step execution** — Inngest's step model ensures each step can be safely retried without side effects on already-completed steps.
