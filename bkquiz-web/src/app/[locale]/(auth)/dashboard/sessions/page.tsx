import type { Metadata } from 'next';
import { SessionsPanel } from './SessionsPanel';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'My Sessions' };
}

export default async function SessionsPage() {
  return (
    <div className="py-5">
      <SessionsPanel />
    </div>
  );
}

