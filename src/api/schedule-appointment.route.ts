import { Hono } from "hono"
import { inngestClient } from "../inngest/client"

const router = new Hono()

router.post("/appointment", async c => {
  const { patientId, doctorId, date, time } = await c.req.json()

  if (!patientId || !doctorId || !date || !time) {
    return c.json(
      { error: "Required fields: patientId, doctorId, date, time" },
      400
    )
  }

  await inngestClient.send({
    name: "schedule/appointment.requested",
    data: { patientId, doctorId, date, time }
  })

  return c.json(
    {
      message: "Appointment received and being processed.",
      status: "processing"
    },
    202
  )
})

export default router
