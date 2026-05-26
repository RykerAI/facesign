"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [webauthnLoading, setWebauthnLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithFingerprint() {
    setWebauthnLoading(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");

      // Get options from server
      const optRes = await fetch("/api/webauthn/auth-options", { method: "POST" });
      if (!optRes.ok) throw new Error("Could not get authentication options");
      const options = await optRes.json();

      // Trigger fingerprint/face-id prompt
      const credential = await startAuthentication({ optionsJSON: options });

      // Verify with server
      const verifyRes = await fetch("/api/webauthn/verify-authentication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      if (!verifyRes.ok) {
        const text = await verifyRes.text().catch(() => "");
        throw new Error(text || "Authentication failed");
      }
      const result = await verifyRes.json();
      if (!result.verified) throw new Error("Authentication failed");

      // Exchange for Supabase session via magic link token
      const sessionRes = await fetch("/api/webauthn/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: result.userId }),
      });
      if (!sessionRes.ok) {
        const text = await sessionRes.text().catch(() => "");
        throw new Error(text || "Session exchange failed");
      }
      const { token } = await sessionRes.json();
      if (!token) throw new Error("Session token missing");
      await supabase.auth.verifyOtp({ token_hash: token, type: "email" });

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Biometric sign-in failed");
    } finally {
      setWebauthnLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Welcome back</h2>
        <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-slate-300">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-indigo-500"
            {...register("email")}
          />
          {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-slate-300">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-indigo-500 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
          Sign in
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs text-slate-500">
          <span className="bg-transparent px-2">or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={signInWithFingerprint}
        disabled={webauthnLoading}
        className="w-full border-white/20 text-slate-300 hover:bg-white/10 hover:text-white bg-transparent"
      >
        {webauthnLoading
          ? <Loader2 className="animate-spin mr-2" size={16} />
          : <Fingerprint size={16} className="mr-2" />
        }
        Sign in with Fingerprint / Face ID
      </Button>

      <p className="text-center text-sm text-slate-400">
        {"Don't have an account? "}
        <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
