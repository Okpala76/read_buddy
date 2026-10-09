"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ProductError({ reset }: { reset: () => void }) {
  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-8 text-center">
      <AlertCircle
        className="text-destructive mx-auto size-8"
        aria-hidden="true"
      />
      <h1 className="text-foreground mt-3 text-xl font-semibold">
        We could not load this page
      </h1>
      <p className="text-muted-foreground mt-2">
        Your data was not changed. Try loading the page again.
      </p>
      <Button type="button" className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
