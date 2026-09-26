import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Terminal } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#161616] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-[#fd86db]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white px-3.5 py-2 rounded-full border border-white/10 hover:border-white/30 bg-white/5 backdrop-blur-md transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>RETURN TO HOME</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-[#fd86db]" />
          <span>CYBER::AUTH_GATEWAY</span>
        </div>
      </div>

      <div className="w-full max-w-md flex justify-center z-10">
        <SignIn />
      </div>
    </div>
  );
}


