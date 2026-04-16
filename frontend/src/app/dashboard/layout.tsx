'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // TODO: Re-enable auth check after testing
    // const token = localStorage.getItem('access_token');
    // if (!token) {
    //   router.replace('/login');
    // } else {
    //   setIsChecking(false);
    // }
    setIsChecking(false); // TEMP: bypass auth for preview
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return <>{children}</>;
}
