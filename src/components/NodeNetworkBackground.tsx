import React, { useEffect, useRef } from 'react';

const NodeNetworkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number;
    const maxDistance = 140;
    const nodeCount = 30;

    let nodes: Node[] = [];

    const resize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    const random = (min: number, max: number) => Math.random() * (max - min) + min;

    class Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      ctx: CanvasRenderingContext2D;

      constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.x = random(0, width);
        this.y = random(0, height);
        this.vx = random(-0.3, 0.3);
        this.vy = random(-0.3, 0.3);
        this.radius = 3;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(21, 207, 241, 0.8)';
        this.ctx.shadowColor = 'rgba(21, 207, 241, 0.6)';
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
        this.ctx.closePath();
      }
    }

    const connectNodes = () => {
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(21, 207, 241, ${1 - dist / maxDistance})`;
            ctx.lineWidth = 1;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
            ctx.closePath();
          }
        }
      }
    };

    const init = () => {
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        nodes.push(new Node(ctx));
      }
    };

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      nodes.forEach((node) => {
        node.update();
        node.draw();
      });
      connectNodes();
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    init();
    animate();

    const handleResize = () => {
      resize();
      init();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default NodeNetworkBackground;
