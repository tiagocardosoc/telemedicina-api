import { notifyDoctorConsumer } from "./consumers/notify-doctor.consumer"
import { notifyPatientConsumer } from "./consumers/notify-patient.consumer"
import { saveHistoryConsumer } from "./consumers/save-history.consumer"

export async function startBrokersConsumers() {
  await notifyPatientConsumer()
  await notifyDoctorConsumer()
  await saveHistoryConsumer()
}
