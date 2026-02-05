import React, { useEffect, useRef } from 'react';

const COLORS = [
    '#d946ef', // Neon Fuchsia
    '#8b5cf6', // Neon Violet
    '#06b6d4', // Neon Cyan
    '#f43f5e', // Neon Rose
    '#3b82f6', // Bright Blue
    '#10b981', // Emerald
    '#ec4899', // Pink
    '#f59e0b', // Amber
];

const WheelCanvas = ({ items, onSpinEnd, isSpinning, spinTrigger, width = 500, height = 500 }) => {
    const canvasRef = useRef(null);
    const stateRef = useRef({
        angle: 0,
        velocity: 0,
        isSpinning: false,
        lastFrameTime: 0
    });

    // Draw the wheel
    const draw = (ctx, angle) => {
        const size = ctx.canvas.width; // Use actual canvas width
        const center = size / 2;
        const radius = size / 2 - 20; // Reduced radius for outer rim
        const arc = (2 * Math.PI) / items.length;

        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(angle);

        // 1. Draw Outer Rim / Bezel
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, radius + 15, 0, 2 * Math.PI);
        const rimGradient = ctx.createRadialGradient(0, 0, radius, 0, 0, radius + 15);
        rimGradient.addColorStop(0, '#1e1b4b');
        rimGradient.addColorStop(0.5, '#4c1d95');
        rimGradient.addColorStop(1, '#000');
        ctx.fillStyle = rimGradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        items.forEach((item, i) => {
            const segmentAngle = i * arc;
            const color = COLORS[i % COLORS.length];

            // 2. Draw Segment with Radial Gradient
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, segmentAngle, segmentAngle + arc);
            ctx.lineTo(0, 0);
            
            // Create gradient for depth (darker at center, lighter at edge)
            const segGradient = ctx.createRadialGradient(0, 0, 50, 0, 0, radius);
            segGradient.addColorStop(0, adjustColorBrightness(color, -40)); // Darker center
            segGradient.addColorStop(1, color); // Pure color at edge
            
            ctx.fillStyle = segGradient;
            ctx.fill();
            
            // Segment Border
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 3. Draw Text
            ctx.save();
            ctx.translate(Math.cos(segmentAngle + arc / 2) * (radius * 0.60), 
                             Math.sin(segmentAngle + arc / 2) * (radius * 0.60));
            ctx.rotate(segmentAngle + arc / 2);
            ctx.fillStyle = '#FFFFFF';
            // Adaptive font size based on wheel size
            // Base: 16px for 500px w. Scale up if wheel is huge to keep it readable but meaningful
            // Actually, we want it relatively smaller to fit more text? 
            // The request was that large items looked bad.
            // If we have a 1200px wheel, 16px is tiny, overlapping is impossible.
            // We can bump it slightly to 24px so it's readable.
            const fontSize = size > 800 ? 24 : 16;
            ctx.font = `bold ${fontSize}px Outfit, sans-serif`; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Text Shadow for readability
            ctx.shadowColor = "rgba(0,0,0,0.9)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            const maxWidth = radius * 0.6;
            wrapText(ctx, item, 0, 0, maxWidth, fontSize + 4);
            
            ctx.restore();
        });
        
        // 4. Inner Decoration (Optional "Inner Ring" where segments meet)
        ctx.beginPath();
        // Scale inner ring slightly
        const innerRingSize = size > 800 ? 80 : 45;
        ctx.arc(0, 0, innerRingSize, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        ctx.restore(); // End rotation

        // 5. Glass Overlay / Shine (Static, invalidates rotation if inside)
        // Draw this AFTER restoring context so it stays top-left lit
        const shineGradient = ctx.createLinearGradient(0, 0, size, size);
        shineGradient.addColorStop(0, 'rgba(255,255,255,0.05)');
        shineGradient.addColorStop(0.5, 'rgba(255,255,255,0)');
        shineGradient.addColorStop(1, 'rgba(255,255,255,0.02)');
        
        ctx.fillStyle = shineGradient;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Circular highlight ring
        ctx.beginPath();
        ctx.arc(center, center, radius - 2, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    // Helper to darken colors for gradient
    const adjustColorBrightness = (col, amt) => {
        let usePound = false;
        if (col[0] === "#") {
            col = col.slice(1);
            usePound = true;
        }
        let num = parseInt(col, 16);
        let r = (num >> 16) + amt;
        if (r > 255) r = 255; else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255; else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
    };

    const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        let startY = y - ((lines.length - 1) * lineHeight) / 2;

        for(let k = 0; k < lines.length; k++) {
            ctx.fillText(lines[k], x, startY + (k * lineHeight));
        }
    };

    const determineWinner = (finalAngle) => {
        const arc = (2 * Math.PI) / items.length;
        // Pointer is at 270deg (3PI/2)
        // pointer_theta = (3PI/2 - final_angle) % 2PI
        let pointerAngle = (1.5 * Math.PI - finalAngle) % (2 * Math.PI);
        if (pointerAngle < 0) pointerAngle += 2 * Math.PI;

        const index = Math.floor(pointerAngle / arc);
        return items[index];
    };

    // Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        const animate = (time) => {
            const state = stateRef.current;
            
            if (state.isSpinning) {
                // Higher threshold to stop sooner
                if (state.velocity < 0.002) {
                    state.isSpinning = false;
                    state.velocity = 0;
                    const winner = determineWinner(state.angle);
                    onSpinEnd(winner);
                } else {
                    state.angle += state.velocity;
                    // Increased friction (lower multiplier) to slow down faster
                    state.velocity *= 0.985; 
                    state.angle %= (2 * Math.PI);
                }
            }

            draw(ctx, state.angle);
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [items, onSpinEnd, width, height]); // Re-bind if size changes

    // Spin Trigger
    useEffect(() => {
        if (spinTrigger) {
             const state = stateRef.current;
             if (!state.isSpinning) {
                 state.isSpinning = true;
                 state.velocity = Math.random() * 0.2 + 0.4;
             }
        }
    }, [spinTrigger]);

    // Initial draw
    useEffect(() => {
        if(canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            draw(ctx, stateRef.current.angle);
        }
    }, [items, width, height]);

    return (
        <canvas 
            ref={canvasRef} 
            width={width} 
            height={height}
            className="w-full h-full rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-transform duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        />
    );
};

export default WheelCanvas;
