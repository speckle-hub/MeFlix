"use client";

import { useEffect, useRef } from "react";

export default function SeasonalOverlay() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let flakes: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createFlakes = () => {
            flakes = Array.from({ length: 50 }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 1 + 0.5,
                opacity: Math.random() * 0.5 + 0.2,
            }));
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "white";

            flakes.forEach((f) => {
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                ctx.globalAlpha = f.opacity;
                ctx.fill();

                f.y += f.speed;
                f.x += Math.sin(f.y / 50) * 0.5;

                if (f.y > canvas.height) f.y = -f.size;
                if (f.x > canvas.width) f.x = 0;
                if (f.x < 0) f.x = canvas.width;
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener("resize", resize);
        resize();
        createFlakes();
        draw();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[99999] opacity-40 mix-blend-screen"
        />
    );
}
