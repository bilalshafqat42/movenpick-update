"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REDIRECT_DELAY_MS = 15000;

export default function AutoRedirect({ href = "/", delay = REDIRECT_DELAY_MS }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(href);
    }, delay);

    return () => clearTimeout(timer);
  }, [router, href, delay]);

  return null;
}