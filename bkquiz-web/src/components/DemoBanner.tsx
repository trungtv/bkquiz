import Link from 'next/link';

export const DemoBanner = () => (
  <div className="sticky top-0 z-modal bg-bg-section p-4 text-center text-lg font-semibold text-text-heading [&_a]:text-primary [&_a:hover]:text-primary-hover">
    Live Demo of Next.js Boilerplate -
    {' '}
    <Link href="/sign-up">Explore the Authentication</Link>
  </div>
);
