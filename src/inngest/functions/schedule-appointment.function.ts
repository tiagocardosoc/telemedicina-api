import { publishAppointmentConfirmed } from "../../broker/publisher"
import type { IAppointmentReservation } from "../../types/appointment-reservation.type"
import { inngestClient } from "../client"

type TScheduleAppointmentData = {
  patientId: string
  doctorId: string
  date: string
  time: string
}

const scheduleAppointment = inngestClient.createFunction(
  {
    id: "schedule-appointment",
    triggers: [{ event: "schedule/appointment.requested" }]
  },
  async ({ event, step }) => {
    const { patientId, doctorId, date, time } =
      event.data as TScheduleAppointmentData

    const available = await step.run("validar-disponibilidade", async () => {
      console.log(`Validando disponibilidade do médico ${doctorId}`)
      // operation example: check if has some kind of conflict in the doctor's calendar
      return { success: true }
    })

    if (!available.success) {
      throw new Error("Médico não disponível no horário solicitado.")
    }

    const reservation = await step.run("reserve-appointment", async () => {
      console.log(
        `Reservando horário ${time} em ${date} com status pendente...`
      )
      // operation example: insert a temporary record in the database with status "pending", the data will be updated with confirmed status in the following steps
      return { reservationId: `res-${Date.now()}` }
    })

    const meeting = await step.run("gerar-link-videochamada", async () => {
      console.log(`🎥 Gerando link da videochamada...`)
      // operation example: it can be a integration with a thrid party video call provider, or an internal service that generates the link and credentials for the video call (ex: zoom, meeting, whatever)
      return {
        link: `https://meet.telemedicina.app/${reservation.reservationId}`
      }
    })

    const confirmation = await step.run("sync-appointment", async () => {
      console.log(`✅ Confirmando agendamento...`)
      // operation example: update the temporary record in the database with status "confirmed", and save the generated link for the video call, so it can be retrieved later when the appointment details are requested
      return {
        appointmentId: `appointment-${Date.now()}`,
        patientId,
        doctorId,
        date,
        time,
        link: meeting.link
      } as IAppointmentReservation
    })

    await publishAppointmentConfirmed(confirmation)

    return confirmation
  }
)

export default scheduleAppointment
