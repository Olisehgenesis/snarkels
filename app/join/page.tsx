'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get all search parameters and preserve them
    const params = new URLSearchParams(searchParams.toString());
    
    // Build the redirect URL with preserved parameters
    const redirectUrl = params.toString() ? `/?${params.toString()}` : '/';
    
    // Redirect to home page with preserved parameters
    router.replace(redirectUrl);
  }, [router, searchParams]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}