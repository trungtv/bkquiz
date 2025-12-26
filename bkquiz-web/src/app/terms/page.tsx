import { redirect } from 'next/navigation';

export default function TermsPage() {
  // Redirect to default locale terms page
  redirect('/en/terms');
}

