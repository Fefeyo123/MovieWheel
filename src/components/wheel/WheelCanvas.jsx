import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { WHEEL_COLORS, WHEEL_CONFIG, TMDB_CONFIG } from '../../utils/constants';
import { adjustColorBrightness, wrapText, getIndexAtTop } from '../../utils/helpers';

const WheelCanvas = ({ items, onSpinEnd, isSpinning, spinTrigger, width = 500, height = 500, fontSize, colors, isDonut = false, imageCache = {} }) => {
    const canvasRef = useRef(null);
    const offscreenCanvasRef = useRef(null);
    
    const stateRef = useRef({
        angle: 0,
        velocity: 0,
        isSpinning: false,
        lastFrameTime: 0
    });

    // Local images state (fallback if not in cache)
    const [images, setImages] = useState({});

    // 1. Load images logic - Alleen als ze NIET in de cache zitten
    useEffect(() => {
        const loadImages = async () => {
            const newImagesToProps = {};
            const itemsWithPosters = items.filter(item => item && typeof item === 'object' && item.posterPath);

            const promises = itemsWithPosters.map((item) => {
                const key = item.value || item.label;
                const rawPath = item.posterPath;
                
                // Slimme Cache Check: Probeer met én zonder slash
                const slashPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
                const noSlashPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
                
                // Als we hem al hebben (lokaal of in cache), doe niets
                if (images[key] || imageCache[slashPath] || imageCache[noSlashPath]) {
                    return Promise.resolve();
                }

                // Anders: downloaden (fallback)
                return new Promise((resolve) => {
                    const img = new Image();
                    const fullUrl = `${TMDB_CONFIG.IMAGE_BASE_URL}${TMDB_CONFIG.POSTER_SIZE}${slashPath}`;
                    img.src = fullUrl;
                    
                    img.onload = () => {
                        newImagesToProps[key] = img;
                        resolve();
                    };
                    img.onerror = () => resolve(); 
                });
            });

            await Promise.all(promises);

            if (Object.keys(newImagesToProps).length > 0) {
                setImages(prev => ({ ...prev, ...newImagesToProps }));
            }
        };

        loadImages();
    }, [items, images, imageCache]);


    // 2. Draw Static Wheel - Nu met useLayoutEffect om "flicker" te voorkomen
    const drawStaticWheel = () => {
        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }
        
        const ctx = offscreenCanvasRef.current.getContext('2d');
        const size = width;
        const scale = size / WHEEL_CONFIG.REFERENCE_SIZE; 

        if (offscreenCanvasRef.current.width !== size || offscreenCanvasRef.current.height !== size) {
             offscreenCanvasRef.current.width = size;
             offscreenCanvasRef.current.height = size;
        } else {
             ctx.clearRect(0, 0, size, size);
        }

        const center = size / 2;
        const radius = size / 2 - (WHEEL_CONFIG.DIMENSIONS.INNER_RADIUS_OFFSET * scale);
        const arc = (2 * Math.PI) / items.length;
        const chord = 2 * radius * Math.sin(arc / 2);
        
        ctx.save();
        ctx.translate(center, center);

        // Outer Rim
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, radius + (WHEEL_CONFIG.DIMENSIONS.OUTER_RIM_OFFSET * scale), 0, 2 * Math.PI);
        const rimGradient = ctx.createRadialGradient(0, 0, radius, 0, 0, radius + (WHEEL_CONFIG.DIMENSIONS.OUTER_RIM_OFFSET * scale));
        rimGradient.addColorStop(0, WHEEL_CONFIG.COLORS.OUTER_RIM_START);
        rimGradient.addColorStop(0.5, WHEEL_CONFIG.COLORS.OUTER_RIM_MID);
        rimGradient.addColorStop(1, WHEEL_CONFIG.COLORS.OUTER_RIM_END);
        ctx.fillStyle = rimGradient;
        ctx.fill();
        ctx.strokeStyle = WHEEL_CONFIG.COLORS.STROKE;
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        ctx.restore();

        const effectiveColors = colors && colors.length > 0 ? colors : WHEEL_COLORS;

        items.forEach((item, i) => {
            const segmentAngle = i * arc;
            const color = effectiveColors[i % effectiveColors.length];
            const itemKey = typeof item === 'object' ? (item.value || item.label) : item;
            
            // HIER IS DE SLIMME LOOKUP:
            let img = images[itemKey];
            if (!img && typeof item === 'object' && item.posterPath) {
                const rawPath = item.posterPath;
                const slashPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
                const noSlashPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
                img = imageCache[slashPath] || imageCache[noSlashPath];
            }

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, segmentAngle, segmentAngle + arc);
            ctx.lineTo(0, 0);
            
            ctx.save();
            if (img) {
                ctx.clip();
                const scaleImg = chord / img.width;
                const imgW = img.width * scaleImg;
                const imgH = img.height * scaleImg;
                
                ctx.rotate(segmentAngle + arc / 2);
                ctx.rotate(Math.PI/2); 
                
                ctx.drawImage(img, -imgW/2, -radius, imgW, imgH);
            } else {
                const segGradient = ctx.createRadialGradient(0, 0, WHEEL_CONFIG.DIMENSIONS.DONUT_INNER_MIN * scale, 0, 0, radius);
                segGradient.addColorStop(0, adjustColorBrightness(color, WHEEL_CONFIG.COLOR_ADJUSTMENT.DARKEN_AMOUNT));
                segGradient.addColorStop(1, color);
                
                ctx.fillStyle = segGradient;
                ctx.fill();
            }
            
            ctx.strokeStyle = WHEEL_CONFIG.COLORS.STROKE_DARK;
            ctx.lineWidth = WHEEL_CONFIG.DIMENSIONS.SHADOW_OFFSET_X * scale;
            ctx.stroke();

            if (!img) {
                ctx.save();
                ctx.translate(Math.cos(segmentAngle + arc / 2) * (radius * 0.65), 
                                 Math.sin(segmentAngle + arc / 2) * (radius * 0.65));
                ctx.rotate(segmentAngle + arc / 2);
                ctx.fillStyle = '#FFFFFF';
                const calculatedFontSize = fontSize || (WHEEL_CONFIG.FONT_SIZE.MOVIE * scale);
                ctx.font = `bold ${calculatedFontSize}px Outfit, sans-serif`; 
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.shadowColor = WHEEL_CONFIG.COLORS.TEXT_SHADOW;
                ctx.shadowBlur = WHEEL_CONFIG.DIMENSIONS.SHADOW_BLUR * scale;
                ctx.shadowOffsetX = WHEEL_CONFIG.DIMENSIONS.SHADOW_OFFSET_X * scale;
                ctx.shadowOffsetY = WHEEL_CONFIG.DIMENSIONS.SHADOW_OFFSET_Y * scale;
                
                const maxWidth = radius * 0.6;
                const label = typeof item === 'string' ? item : (item.label || item);
                wrapText(ctx, label, 0, 0, maxWidth, calculatedFontSize + (WHEEL_CONFIG.DIMENSIONS.LINE_HEIGHT_OFFSET * scale));
                
                ctx.restore();
            }
             ctx.restore();
        });
        
        ctx.restore();
    };

    // Gebruik useLayoutEffect zodat hij tekent VOORDAT de browser de nieuwe frame laat zien.
    // Dit voorkomt dat je eerst tekst ziet en dan pas plaatjes.
    useLayoutEffect(() => {
        drawStaticWheel();
    }, [items, images, width, height, colors, fontSize, isDonut, imageCache]);


    // Main Draw Function (Animation Loop)
    const draw = (ctx, angle) => {
        const size = ctx.canvas.width;
        const scale = size / WHEEL_CONFIG.REFERENCE_SIZE;
        const center = size / 2;
        const radius = size / 2 - (WHEEL_CONFIG.DIMENSIONS.INNER_RADIUS_OFFSET * scale);

        ctx.clearRect(0, 0, size, size);

        if (offscreenCanvasRef.current) {
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(angle);
            ctx.drawImage(offscreenCanvasRef.current, -center, -center);
            ctx.restore();
        }

        const chord = 2 * radius * Math.sin((2 * Math.PI) / items.length / 2);
        const expectedPosterHeight = chord * WHEEL_CONFIG.DIMENSIONS.POSTER_ASPECT_RATIO;
        let calculatedInner = radius - expectedPosterHeight;
        if (calculatedInner < WHEEL_CONFIG.DIMENSIONS.DONUT_INNER_MIN * scale) calculatedInner = WHEEL_CONFIG.DIMENSIONS.DONUT_INNER_MIN * scale;
        const innerRadius = isDonut ? calculatedInner : (WHEEL_CONFIG.DIMENSIONS.DONUT_INNER_DEFAULT * scale);

        if (isDonut) {
            const idx = getIndexAtTop(angle, items.length);
            const centerItem = items[idx];
            const centerItemKey = centerItem ? ((typeof centerItem === 'string') ? centerItem : (centerItem.value || centerItem.label)) : null;
            
            ctx.save();
            ctx.translate(center, center);
            ctx.beginPath();
            ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI);
            ctx.fillStyle = WHEEL_CONFIG.COLORS.CENTER_BG; 
            ctx.fill();
            ctx.strokeStyle = WHEEL_CONFIG.COLORS.STROKE;
            ctx.lineWidth = 4 * scale;
            ctx.stroke();
            
            // Draw Center Poster from Cache
            let cImg = images[centerItemKey];
            if (!cImg && centerItem && centerItem.posterPath) {
                 const rawPath = centerItem.posterPath;
                 const slashPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
                 const noSlashPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
                 cImg = imageCache[slashPath] || imageCache[noSlashPath];
            }

            if (cImg) {
                 ctx.save();
                 ctx.clip(); 
                 const imgRatio = cImg.height / cImg.width;
                 const drawW = innerRadius * 2;
                 const drawH = drawW * imgRatio;
                 ctx.drawImage(cImg, -drawW/2, -innerRadius, drawW, drawH);
                 
                 const gradient = ctx.createRadialGradient(0, 0, innerRadius * 0.7, 0, 0, innerRadius);
                 gradient.addColorStop(0, 'rgba(0,0,0,0)');
                 gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
                 ctx.fillStyle = gradient;
                 ctx.fillRect(-innerRadius, -innerRadius, innerRadius*2, innerRadius*2);
                 ctx.restore();
            } else if (centerItem) {
                ctx.fillStyle = '#FFF';
                ctx.font = `bold ${WHEEL_CONFIG.FONT_SIZE.CENTER_LABEL * scale}px Outfit, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const label = (typeof centerItem === 'string') ? centerItem : (centerItem.label || centerItem);
                wrapText(ctx, label, 0, 0, innerRadius * 1.5, (40 * scale) + (WHEEL_CONFIG.DIMENSIONS.CENTER_LABEL_PADDING * scale));
            }
            ctx.restore();
        } else {
            ctx.save();
            ctx.translate(center, center);
            ctx.beginPath();
            const innerRingSize = WHEEL_CONFIG.DIMENSIONS.INNER_RING_SIZE * scale;
            ctx.arc(0, 0, innerRingSize, 0, 2 * Math.PI);
            ctx.fillStyle = WHEEL_CONFIG.COLORS.INNER_RING_FILL;
            ctx.fill();
            ctx.restore();
        }

        const shineGradient = ctx.createLinearGradient(0, 0, size, size);
        shineGradient.addColorStop(0, WHEEL_CONFIG.COLORS.SHINE_START);
        shineGradient.addColorStop(0.5, WHEEL_CONFIG.COLORS.SHINE_MID);
        shineGradient.addColorStop(1, WHEEL_CONFIG.COLORS.SHINE_END);
        ctx.fillStyle = shineGradient;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI);
        ctx.arc(center, center, innerRadius, 0, 2 * Math.PI, true); 
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(center, center, radius - WHEEL_CONFIG.DIMENSIONS.STROKE_WIDTH * scale, 0, 2 * Math.PI);
        ctx.strokeStyle = WHEEL_CONFIG.COLORS.STROKE_LIGHT;
        ctx.lineWidth = WHEEL_CONFIG.DIMENSIONS.STROKE_WIDTH * scale;
        ctx.stroke();
    };

    const determineWinner = (finalAngle) => {
        const arc = (2 * Math.PI) / items.length;
        let pointerAngle = (1.5 * Math.PI - finalAngle) % (2 * Math.PI);
        if (pointerAngle < 0) pointerAngle += 2 * Math.PI;
        const index = Math.floor(pointerAngle / arc);
        return items[index];
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        const animate = (time) => {
            const state = stateRef.current;
            if (state.isSpinning) {
                if (state.velocity < WHEEL_CONFIG.PHYSICS.STOP_VELOCITY) {
                    state.isSpinning = false;
                    state.velocity = 0;
                    const winner = determineWinner(state.angle);
                    onSpinEnd(winner);
                } else {
                    state.angle += state.velocity;
                    state.velocity *= WHEEL_CONFIG.PHYSICS.FRICTION; 
                    state.angle %= (2 * Math.PI);
                }
            }
            draw(ctx, state.angle);
            animationId = requestAnimationFrame(animate);
        };
        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [items, onSpinEnd, width, height, images, imageCache]); // imageCache toegevoegd

    useEffect(() => {
        if (spinTrigger) {
             const state = stateRef.current;
             if (!state.isSpinning) {
                 state.isSpinning = true;
                 state.velocity = Math.random() * WHEEL_CONFIG.PHYSICS.RANDOM_VELOCITY_FACTOR + WHEEL_CONFIG.PHYSICS.BASE_VELOCITY;
             }
        }
    }, [spinTrigger]);

    // Initial paint on mount
    useLayoutEffect(() => {
        if(canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            draw(ctx, stateRef.current.angle);
        }
    }, [items, width, height, images, imageCache]);

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