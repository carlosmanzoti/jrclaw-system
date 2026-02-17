import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2A2A2A] bg-gradient-to-b from-[#2A2A2A] to-[#1a1a1a] px-4">
      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="font-heading text-[#C9A961]">JRC</span>
            <span className="font-body text-[#C9A961]">Law</span>
          </h1>

          {/* Gold decorative line */}
          <div className="mx-auto mt-3 mb-3 h-px w-16 bg-[#C9A961]" />

          <p className="font-body text-[#666666] text-base">
            Sistema de Gestao Juridica
          </p>
        </div>

        <LoginForm />

        {/* Footer */}
        <p className="text-center text-xs text-[#666666] mt-8">
          JRCLaw Advocacia Empresarial
        </p>
      </div>
    </div>
  );
}
