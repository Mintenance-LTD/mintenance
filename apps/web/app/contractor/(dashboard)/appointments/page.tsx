import { redirect } from 'next/navigation';

/** Keep historical appointment notification links usable. */
export default function AppointmentsRedirect() {
  redirect('/contractor/scheduling');
}
