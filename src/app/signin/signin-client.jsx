"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInClient() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Continue to your habit dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
            Continue with Google
          </Button>

          <p className="text-xs text-muted-foreground">
            Requires Google OAuth env vars: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
