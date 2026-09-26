import { auth } from '@clerk/nextjs/server';
import React from 'react';

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();
  return <>{children}</>;
}
