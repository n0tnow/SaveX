'use client';

export default function AnimatedBackground() {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Dark Base */}
            <div className="absolute inset-0 bg-black"></div>

            {/* Gradient Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse-slow delay-1000"></div>
            <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px] animate-pulse-slow delay-2000"></div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>

            {/* Radial Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#000000_100%)]"></div>
        </div>
    );
}
