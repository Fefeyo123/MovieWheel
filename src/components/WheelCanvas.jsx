import React, { useEffect, useRef } from 'react';
import { WHEEL_COLORS } from '../utils/constants';
import { adjustColorBrightness, wrapText, getIndexAtTop } from '../utils/helpers';

const WheelCanvas = ({ items, onSpinEnd, isSpinning, spinTrigger, width = 500, height = 500, fontSize, colors, isDonut = false }) => {
    const canvasRef = useRef(null);
    const stateRef = useRef({
        angle: 0,
        velocity: 0,
        isSpinning: false,
        lastFrameTime: 0
    });

    const [images, setImages] = React.useState({});

    // Load images when items change
    useEffect(() => {
        const loadImages = async () => {
            const newImages = {};
            const promises = items.map((item) => {
                if (item && typeof item === 'object' && item.posterPath) {
                    return new Promise((resolve) => {
                        const img = new Image();
                        const path = item.posterPath.startsWith('/') ? item.posterPath : `/${item.posterPath}`;
                        img.src = `https://image.tmdb.org/t/p/w500${path}`;
                        
                        img.onload = () => {
                            const key = item.value || item.label;
                            if (key) newImages[key] = img;
                            resolve();
                        };
                        img.onerror = () => {
                            resolve(); 
                        };
                    });
                }
                return Promise.resolve();
            });

            await Promise.all(promises);
            setImages(newImages);
        };

        loadImages();
    }, [items]);

    // Draw the wheel
    const draw = (ctx, angle) => {
        const size = ctx.canvas.width;
        const center = size / 2;
        const radius = size / 2 - 20;
        const arc = (2 * Math.PI) / items.length;
        
        const chord = 2 * radius * Math.sin(arc / 2);
        const expectedPosterHeight = chord * 1.5;
        
        let calculatedInner = radius - expectedPosterHeight;
        if (calculatedInner < 50) calculatedInner = 50;
        
        const innerRadius = isDonut ? calculatedInner : (size > 800 ? 80 : 45);

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

        const effectiveColors = colors && colors.length > 0 ? colors : WHEEL_COLORS;

        items.forEach((item, i) => {
            const segmentAngle = i * arc;
            const color = effectiveColors[i % effectiveColors.length];
            const img = images[item.value || item.label];

            // 2. Draw Segment with Radial Gradient
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, segmentAngle, segmentAngle + arc);
            ctx.lineTo(0, 0);
            
            ctx.save();
            if (img) {
                ctx.clip();
                const scale = chord / img.width;
                const imgW = img.width * scale;
                const imgH = img.height * scale;
                
                ctx.rotate(segmentAngle + arc / 2);
                ctx.rotate(Math.PI/2); 
                
                ctx.drawImage(img, -imgW/2, -radius, imgW, imgH);
            } else {
                const segGradient = ctx.createRadialGradient(0, 0, 50, 0, 0, radius);
                segGradient.addColorStop(0, adjustColorBrightness(color, -40));
                segGradient.addColorStop(1, color);
                
                ctx.fillStyle = segGradient;
                ctx.fill();
            }
            
            // Segment Border
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 3. Draw Text
            if (!img) {
                ctx.save();
                ctx.translate(Math.cos(segmentAngle + arc / 2) * (radius * 0.60), 
                                 Math.sin(segmentAngle + arc / 2) * (radius * 0.60));
                ctx.rotate(segmentAngle + arc / 2);
                ctx.fillStyle = '#FFFFFF';
                // Adaptive font size
                const calculatedFontSize = fontSize || (size > 800 ? 24 : 16);
                ctx.font = `bold ${calculatedFontSize}px Outfit, sans-serif`; 
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.shadowColor = "rgba(0,0,0,0.9)";
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                
                const maxWidth = radius * 0.6;
                const label = typeof item === 'string' ? item : (item.label || item);
                wrapText(ctx, label, 0, 0, maxWidth, calculatedFontSize + 4);
                
                ctx.restore();
            }
             ctx.restore();
        });
        
        ctx.restore(); // End rotation
        

        if (isDonut) {
            // Donut: Find current winner to show in center
            const idx = getIndexAtTop(angle, items.length);
            const centerItem = items[idx];
            const centerItemKey = centerItem ? ((typeof centerItem === 'string') ? centerItem : (centerItem.value || centerItem.label)) : null;
            
            // Draw circle over the center to create "hole"
            ctx.save();
            ctx.translate(center, center);
            ctx.beginPath();
            ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI);
            ctx.fillStyle = '#050511'; 
            ctx.fill();
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Draw Center Poster
            const cImg = images[centerItemKey];
            if (cImg) {
                 ctx.save();
                 ctx.clip(); 
                 
                 const imgRatio = cImg.height / cImg.width;
                 const drawW = innerRadius * 2;
                 const drawH = drawW * imgRatio;
                 
                 ctx.drawImage(cImg, -drawW/2, -drawH/2, drawW, drawH);
                 
                 // Vignette
                 const gradient = ctx.createRadialGradient(0, 0, innerRadius * 0.7, 0, 0, innerRadius);
                 gradient.addColorStop(0, 'rgba(0,0,0,0)');
                 gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
                 ctx.fillStyle = gradient;
                 ctx.fillRect(-innerRadius, -innerRadius, innerRadius*2, innerRadius*2);
                 
                 ctx.restore();
            } else if (centerItem) {
                 // Fallback text
                ctx.fillStyle = '#FFF';
                ctx.font = `bold ${size > 800 ? 40 : 20}px Outfit, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const label = (typeof centerItem === 'string') ? centerItem : (centerItem.label || centerItem);
                wrapText(ctx, label, 0, 0, innerRadius * 1.5, (size > 800 ? 40 : 20) + 5);
            }
            
            ctx.restore();
        } else {
             // 4. Inner Decoration (Non-donut)
            ctx.save();
            ctx.translate(center, center);
            ctx.beginPath();
            const innerRingSize = size > 800 ? 80 : 45;
            ctx.arc(0, 0, innerRingSize, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fill();
            ctx.restore();
        }

        // 5. Glass Overlay / Shine
        const shineGradient = ctx.createLinearGradient(0, 0, size, size);
        shineGradient.addColorStop(0, 'rgba(255,255,255,0.05)');
        shineGradient.addColorStop(0.5, 'rgba(255,255,255,0)');
        shineGradient.addColorStop(1, 'rgba(255,255,255,0.02)');
        
        ctx.fillStyle = shineGradient;
        ctx.beginPath();
        // Donut shine: Ring only
        ctx.arc(center, center, radius, 0, 2 * Math.PI);
        ctx.arc(center, center, innerRadius, 0, 2 * Math.PI, true); // Counter-clockwise to create hole
        ctx.fill();
        
        // Circular highlight ring (Outer)
        ctx.beginPath();
        ctx.arc(center, center, radius - 2, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
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
                if (state.velocity < 0.002) {
                    state.isSpinning = false;
                    state.velocity = 0;
                    const winner = determineWinner(state.angle);
                    onSpinEnd(winner);
                } else {
                    state.angle += state.velocity;
                    state.velocity *= 0.985; 
                    state.angle %= (2 * Math.PI);
                }
            }

            draw(ctx, state.angle);
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [items, onSpinEnd, width, height, images]); // Re-bind if size changes or images load

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
