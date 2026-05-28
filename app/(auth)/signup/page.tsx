"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "At least one uppercase letter")
    .regex(/[0-9]/, "At least one number")
    .regex(/[^A-Za-z0-9]/, "At least one special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

const inputClass =
  "bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/20 focus-visible:ring-0 focus-visible:border-[#4db3ff]/60 rounded-xl";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.full_name },
        },
      });
      if (error) throw error;
      if (authData.session) {
        router.push("/onboarding");
      } else {
        toast.success("Account created! Please sign in.");
        router.push("/login");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white tracking-tight">Create account</h2>
        <p className="text-white/35 text-sm mt-0.5">Sign up to get started</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name" className="text-white/50 text-xs uppercase tracking-wider">
            Full name
          </Label>
          <Input
            id="full_name"
            autoComplete="name"
            placeholder="Jane Smith"
            className={inputClass}
            {...register("full_name")}
          />
          {errors.full_name && <p className="text-red-400 text-xs">{errors.full_name.message}</p>}
        </div>

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
              autoComplete="new-password"
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

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-white/50 text-xs uppercase tracking-wider">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-red-400 text-xs">{errors.confirmPassword.message}</p>
          )}
        </div>

        <p className="text-[10px] text-white/25 leading-relaxed">
          8+ characters · uppercase · number · special character
        </p>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-xl h-11"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={15} /> : null}
          Create account
        </Button>
      </form>

      <p className="text-center text-xs text-white/30">
        Already have an account?{" "}
        <Link href="/login" className="text-[#4db3ff] hover:text-[#7fd0ff] font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
