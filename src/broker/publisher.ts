import amqplib from "amqplib"
import type { IAppointmentReservation } from "../types/appointment-reservation.type"

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://localhost"
const EXCHANGE_NAME = "appointment.confirmed"

export async function publishAppointmentConfirmed(
  data: IAppointmentReservation
): Promise<void> {
  const connection = await amqplib.connect(RABBITMQ_URL)
  const channel = await connection.createChannel()

  await channel.assertExchange(EXCHANGE_NAME, "fanout", { durable: true })

  channel.publish(EXCHANGE_NAME, "", Buffer.from(JSON.stringify(data)), {
    persistent: true
  })

  console.log(`Event published to exchange: ${EXCHANGE_NAME}`, data)

  await channel.close()
  await connection.close()
}
