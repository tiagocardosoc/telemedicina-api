import amqplib from "amqplib"

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://localhost"
const EXCHANGE_NAME = "appointment.confirmed"
const QUEUE_NAME = "appointment.notify-patient"

export async function notifyPatientConsumer(): Promise<void> {
  const connection = await amqplib.connect(RABBITMQ_URL)
  const channel = await connection.createChannel()

  await channel.assertExchange(EXCHANGE_NAME, "fanout", { durable: true })
  await channel.assertQueue(QUEUE_NAME, { durable: true })

  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, "")

  // Only process one message at a time
  channel.prefetch(1)

  console.log("[notify-patient] is listening to:", QUEUE_NAME)

  channel.consume(QUEUE_NAME, async msg => {
    if (!msg) return

    const appointment = JSON.parse(msg.content.toString())

    // Operation example: it can be an integration with email service provider
    await new Promise(resolve => setTimeout(resolve, 500))

    console.log(`Patient ${appointment.patientId} notified successfully`)

    channel.ack(msg)
  })
}
