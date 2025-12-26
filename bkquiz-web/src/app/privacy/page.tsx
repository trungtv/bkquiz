import { redirect } from 'next/navigation';

export default function PrivacyPage() {
  // Redirect to default locale privacy page
  redirect('/en/privacy');
}

