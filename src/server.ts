import { Hono } from "hono"
import { serve as inngestServe } from "inngest/hono"
import scheduleAppointmentFunction from "./inngest/functions/schedule-appointment.function"
import appointmentRouter from "./api/schedule-appointment.route"
import { inngestClient } from "./inngest/client"
import { cors } from "hono/cors"
import { startBrokersConsumers } from "./broker/brokers-boostrap"

const app = new Hono()

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"]
  })
)

app.get("/health", c => c.json({ status: "ok" }))

app.route("/schedule", appointmentRouter)

// Need to be registered as route to communicate with the API
app.on(
  ["GET", "POST", "PUT"],
  "/api/inngest",
  inngestServe({
    client: inngestClient,
    functions: [scheduleAppointmentFunction]
  })
)

await startBrokersConsumers()

Bun.serve({
  port: 3000,
  fetch: app.fetch
})

console.log("🏥 Telemedicine API running on http://localhost:3000")
