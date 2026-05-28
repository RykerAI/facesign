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
  password: z.string().min(1, "Enter your password"),
});
type FormData = z.infer<typeof schema>;

const inputClass =
  "bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus-visible:ring-0 focus-visible:border-[#4db3ff]/60 rounded-xl";

function friendlyLoginError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid") || m.includes("credentials") || m.includes("wrong"))
    return "Incorrect email or password. Please try again.";
  if (m.includes("not confirmed") || m.includes("confirm"))
    return "Please check your inbox and confirm your email address before signing in.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts — please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "Connection error — check your internet and try again.";
  return msg;
}

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
      if (error) {
        toast.error(friendlyLoginError(error.message));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Sign in failed — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithFingerprint() {
    setWebauthnLoading(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");

      const optRes = await fetch("/api/webauthn/auth-options", { method: "POST" });
      if (!optRes.ok) throw new Error("Could not get authentication options");
      const options = await optRes.json();

      const credential = await startAuthentication({ optionsJSON: options });

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
        <h2 className="text-lg font-semibold text-white tracking-tight">Welcome back</h2>
        <p className="text-white/35 text-sm mt-0.5">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/50 text-xs uppercase tracking-wider">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
            {...register("email")}
          />
          {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/50 text-xs uppercase tracking-wider">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${inputClass} pr-10`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-xl h-11 mt-2"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={15} /> : null}
          Sign in
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.07]" />
        </div>
        <div className="relative flex justify-center text-[10px] text-white/25 uppercase tracking-wider">
          <span className="bg-transparent px-3">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={signInWithFingerprint}
        disabled={webauthnLoading}
        className="w-full rounded-xl h-11 font-medium"
        style={{
          background: "rgba(77,179,255,0.06)",
          border: "1px solid rgba(77,179,255,0.25)",
          color: "#4db3ff",
        }}
      >
        {webauthnLoading
          ? <Loader2 className="animate-spin mr-2" size={15} />
          : <Fingerprint size={15} className="mr-2" />
        }
        Sign in with Fingerprint / Face ID
      </Button>

      <p className="text-center text-xs text-white/30">
        {"Don't have an account? "}
        <Link href="/signup" className="text-[#4db3ff] hover:text-[#7fd0ff] font-medium transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
