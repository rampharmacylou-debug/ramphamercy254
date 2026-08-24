'use client';

import { useEffect } from 'react';

export default function RootPage() {
  useEffect(() => {
    window.location.href = '/staff/products';
  }, []);

  return null;
}'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/staff/products');
  }, [router]);

  return null;
}
