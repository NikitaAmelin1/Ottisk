/**
 * Detailed creature / food / boss art for ОТТИСК.
 * Attaches OttiskArtFactory(api) → drawing API using shared helpers.
 */
(function attachOttiskArt(root) {
  "use strict";

  function createArt(api) {
    const { mixColor, cssVar, clamp } = api;
    let ctx = null;

    function use(c) {
      ctx = c;
    }

    function fxOn() {
      return !api.effects || api.effects();
    }

    function softGlow(x, y, r, color, alpha) {
      if (!fxOn()) {
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = mixColor(color, "#ffffff", 0.35);
        ctx.beginPath();
        ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const g = ctx.createRadialGradient(x, y, r * 0.08, x, y, r);
      g.addColorStop(0, mixColor(color, "#ffffff", 0.62));
      g.addColorStop(0.35, mixColor(color, "#ffffff", 0.18));
      g.addColorStop(0.7, color);
      g.addColorStop(1, "transparent");
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function eye(x, y, r, opts = {}) {
      const lookX = opts.lookX ?? r * 0.22;
      const lookY = opts.lookY ?? r * 0.1;
      const pupil = opts.pupil ?? 0.46;
      ctx.fillStyle = opts.white || "#fff8f0";
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.05, r * (opts.tall || 1.12), 0, 0, Math.PI * 2);
      ctx.fill();
      if (opts.lid) {
        ctx.fillStyle = opts.lid;
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.55, r * 1.05, r * 0.45, 0, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillStyle = opts.iris || "#141018";
      ctx.beginPath();
      ctx.arc(x + lookX, y + lookY, r * pupil, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = opts.shine || "#ffffff";
      ctx.beginPath();
      ctx.arc(x + lookX + r * 0.2, y + lookY - r * 0.22, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + lookX - r * 0.12, y + lookY + r * 0.16, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      if (opts.angry) {
        ctx.strokeStyle = opts.brow || "#120810";
        ctx.lineWidth = Math.max(1.5, r * 0.38);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x - r * 0.95, y - r * 0.9);
        ctx.lineTo(x + r * 0.95, y - r * 0.28);
        ctx.stroke();
      }
    }

    function speckles(count, color, rx, ry, spread) {
      ctx.fillStyle = color;
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * Math.PI * 2;
        const d = spread * (0.35 + (i % 3) * 0.18);
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d * 0.7, rx, ry, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* —— FOOD / LIGHT —— */
    function foodSilhouette(r, alpha = 1) {
      ctx.globalAlpha = alpha * 0.62;
      const ink = ctx.createRadialGradient(0, 0, r * 0.25, 0, 0, r * 1.7);
      ink.addColorStop(0, "rgba(3, 16, 26, 0.72)");
      ink.addColorStop(0.45, "rgba(3, 16, 26, 0.4)");
      ink.addColorStop(1, "transparent");
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    function foodRim(pathFn, color, bodyR, alpha = 1) {
      ctx.globalAlpha = alpha * 0.95;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(4, 18, 28, 0.88)";
      ctx.lineWidth = Math.max(3.2, bodyR * 0.28);
      pathFn();
      ctx.stroke();
      ctx.strokeStyle = mixColor(color, "#ffffff", 0.82);
      ctx.lineWidth = Math.max(1.6, bodyR * 0.12);
      pathFn();
      ctx.stroke();
    }

    function drawLightOrb(x, y, r, color, pulse, alpha = 1, kind = "normal") {
      const fancy = kind === "super" || kind === "rare";
      const bodyR = r * (1 + Math.sin(pulse) * (kind === "super" ? 0.12 : 0.08));
      ctx.save();
      ctx.translate(x, y);
      foodSilhouette(bodyR * 1.15, alpha);
      softGlow(0, 0, bodyR * (fancy ? 3.2 : 2.55), color, alpha * (fancy ? 0.55 : 0.4));

      // soft outer wash
      ctx.globalAlpha = alpha * 0.42;
      const wash = ctx.createRadialGradient(0, 0, bodyR * 0.15, 0, 0, bodyR * 2.0);
      wash.addColorStop(0, mixColor(color, "#ffffff", 0.6));
      wash.addColorStop(0.55, mixColor(color, "#ffffff", 0.14));
      wash.addColorStop(1, "transparent");
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.arc(0, 0, bodyR * 2.0, 0, Math.PI * 2);
      ctx.fill();

      // outer petal halo
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = mixColor(color, "#ffffff", 0.45);
      const petals = kind === "super" ? 10 : kind === "rare" ? 8 : 6;
      for (let i = 0; i < petals; i += 1) {
        const a = (i / petals) * Math.PI * 2 + pulse * 0.35;
        const pr = bodyR * (1.22 + 0.16 * Math.sin(pulse * 2 + i));
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * pr * 0.52, Math.sin(a) * pr * 0.52, bodyR * 0.28, bodyR * 0.14, a, 0, Math.PI * 2);
        ctx.fill();
      }

      const lobes = kind === "super" ? 9 : kind === "rare" ? 7 : 6;
      const lobePath = () => {
        ctx.beginPath();
        for (let i = 0; i <= lobes; i += 1) {
          const a = (i / lobes) * Math.PI * 2 + pulse * 0.25;
          const rad = bodyR * (0.72 + 0.36 * Math.sin(pulse * 1.8 + i * 1.4));
          const px = Math.cos(a) * rad;
          const py = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      };

      foodRim(lobePath, color, bodyR, alpha);

      const core = ctx.createRadialGradient(-bodyR * 0.25, -bodyR * 0.3, bodyR * 0.04, 0, 0, bodyR);
      core.addColorStop(0, "#ffffff");
      core.addColorStop(0.16, mixColor(color, "#ffffff", 0.82));
      core.addColorStop(0.45, mixColor(color, "#ffffff", 0.28));
      core.addColorStop(0.78, color);
      core.addColorStop(1, mixColor(color, "#1a0810", 0.35));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = core;
      lobePath();
      ctx.fill();

      // crystal facet web
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = mixColor(color, "#ffffff", 0.88);
      ctx.lineWidth = 1.45;
      for (let i = 0; i < (fancy ? 5 : 3); i += 1) {
        const a = pulse * 0.55 + i * ((Math.PI * 2) / (fancy ? 5 : 3));
        ctx.beginPath();
        ctx.moveTo(Math.cos(a + 1.2) * bodyR * 0.18, Math.sin(a + 1.2) * bodyR * 0.18);
        ctx.lineTo(Math.cos(a) * bodyR * 0.72, Math.sin(a) * bodyR * 0.72);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, bodyR * 0.3, 0, Math.PI * 2);
      ctx.stroke();

      // orbiting motes
      const moteCount = kind === "super" ? 7 : kind === "rare" ? 5 : 4;
      for (let i = 0; i < moteCount; i += 1) {
        const a = pulse * (1.5 + i * 0.12) + (i / moteCount) * Math.PI * 2;
        const orbit = bodyR * (1.38 + (i % 2) * 0.36);
        ctx.globalAlpha = alpha * (0.78 + (i % 2) * 0.2);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * orbit, Math.sin(a) * orbit * 0.72, Math.max(1.8, bodyR * 0.15), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = "rgba(4, 18, 28, 0.55)";
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      if (kind === "super") {
        ctx.globalAlpha = alpha * 0.88;
        ctx.strokeStyle = mixColor(color, "#ffffff", 0.6);
        ctx.lineWidth = 2.4;
        const ring = bodyR * (1.55 + Math.sin(pulse * 2) * 0.16);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring * 1.15, ring * 0.48, pulse * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, ring * 0.48, ring * 1.12, -pulse * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = mixColor(color, "#ffffff", 0.7);
        for (let i = 0; i < 4; i += 1) {
          const a = pulse + i * (Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * ring * 0.2, Math.sin(a) * ring * 0.2);
          ctx.lineTo(Math.cos(a - 0.18) * ring, Math.sin(a - 0.18) * ring);
          ctx.lineTo(Math.cos(a + 0.18) * ring, Math.sin(a + 0.18) * ring);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.beginPath();
      ctx.arc(-bodyR * 0.22, -bodyR * 0.28, Math.max(2, bodyR * 0.28), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(bodyR * 0.2, bodyR * 0.14, Math.max(1.2, bodyR * 0.13), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawSpark(spark, stateTime = 0) {
      const r = spark.r;
      const p = spark.pulse || 0;
      // Dark plate so food stays readable on bright water
      ctx.save();
      ctx.translate(spark.x, spark.y);
      foodSilhouette(r * 1.2, 0.9);
      ctx.restore();
      if (spark.comet) {
        const ang = Math.atan2(spark.vy, spark.vx || 0.001);
        ctx.save();
        ctx.translate(spark.x, spark.y);
        ctx.rotate(ang);
        softGlow(-8, 0, r * 2.6, spark.color, 0.4);
        const trail = ctx.createLinearGradient(-58, 0, 18, 0);
        trail.addColorStop(0, "transparent");
        trail.addColorStop(0.35, mixColor(spark.color, "#ffffff", 0.08));
        trail.addColorStop(0.7, spark.color);
        trail.addColorStop(1, mixColor(spark.color, "#fff4d8", 0.55));
        ctx.fillStyle = trail;
        ctx.beginPath();
        ctx.moveTo(-58, 0);
        ctx.quadraticCurveTo(-12, -r * 0.62, 14, -r * 0.38);
        ctx.lineTo(16, 0);
        ctx.lineTo(14, r * 0.38);
        ctx.quadraticCurveTo(-12, r * 0.62, -58, 0);
        ctx.fill();
        softGlow(8, 0, r * 1.4, "#fff8e8", 0.35);
        ctx.fillStyle = mixColor(spark.color, "#ffffff", 0.6);
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(5, -r * 0.58);
        ctx.lineTo(-2, 0);
        ctx.lineTo(5, r * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
      }

      if (spark.type === "seed") {
        ctx.save();
        ctx.translate(spark.x, spark.y);
        ctx.rotate(p * 0.45);
        softGlow(0, 0, r * 2, spark.color, 0.25);
        const pod = ctx.createLinearGradient(0, -r, 0, r);
        pod.addColorStop(0, mixColor(spark.color, "#ffffff", 0.55));
        pod.addColorStop(0.5, spark.color);
        pod.addColorStop(1, mixColor(spark.color, "#103028", 0.4));
        ctx.fillStyle = pod;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.62, r * 1.15, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = mixColor(spark.color, "#ffffff", 0.4);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.2);
        ctx.quadraticCurveTo(r * 0.2, 0, 0, r * 0.55);
        ctx.stroke();
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.arc(-r * 0.15, -r * 0.35 + i * r * 0.35, r * 0.1, 0, Math.PI * 2);
          ctx.fillStyle = mixColor(spark.color, "#ffffff", 0.55);
          ctx.fill();
        }
        ctx.restore();
        return;
      }

      if (spark.type === "ember") {
        ctx.save();
        ctx.translate(spark.x, spark.y);
        softGlow(0, 0, r * 2.3, spark.color, 0.4);
        for (let i = 0; i < 5; i += 1) {
          const a = p * 1.4 + i * 1.25;
          const len = r * (0.9 + (i % 2) * 0.35);
          ctx.strokeStyle = mixColor(spark.color, "#fff0c8", 0.35);
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(Math.cos(a) * len * 0.4, Math.sin(a) * len * 0.4 - r * 0.2, Math.cos(a) * len, Math.sin(a) * len - r * 0.35);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const coal = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
        coal.addColorStop(0, "#fff2c8");
        coal.addColorStop(0.35, spark.color);
        coal.addColorStop(1, "#4a1810");
        ctx.fillStyle = coal;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      if (spark.type === "mirror") {
        ctx.save();
        ctx.translate(spark.x, spark.y);
        ctx.rotate(p * 0.5);
        softGlow(0, 0, r * 2.1, spark.color, 0.3);
        ctx.globalAlpha = 0.9;
        const glass = ctx.createLinearGradient(-r, -r, r, r);
        glass.addColorStop(0, "rgba(255,255,255,0.85)");
        glass.addColorStop(0.35, spark.color);
        glass.addColorStop(0.7, mixColor(spark.color, "#102038", 0.2));
        glass.addColorStop(1, "rgba(255,255,255,0.55)");
        ctx.fillStyle = glass;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.85, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.85, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.ellipse(-r * 0.2, -r * 0.25, r * 0.18, r * 0.1, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      if (spark.type === "cool") {
        ctx.save();
        ctx.translate(spark.x, spark.y);
        softGlow(0, 0, r * 2.2, spark.color, 0.28);
        ctx.rotate(p * 0.2);
        ctx.fillStyle = mixColor(spark.color, "#ffffff", 0.35);
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a - 0.2) * r * 0.35, Math.sin(a - 0.2) * r * 0.35);
          ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15);
          ctx.lineTo(Math.cos(a + 0.2) * r * 0.35, Math.sin(a + 0.2) * r * 0.35);
          ctx.closePath();
          ctx.fill();
        }
        drawLightOrb(0, 0, r * 0.55, spark.color, p, 1, "normal");
        ctx.restore();
        return;
      }

      if (spark.type === "bait") {
        ctx.save();
        ctx.translate(spark.x, spark.y);
        softGlow(0, 0, r * 2.1, spark.color, 0.3);
        ctx.fillStyle = mixColor(spark.color, "#ffffff", 0.2);
        ctx.beginPath();
        ctx.ellipse(0, r * 0.15, r * 0.75, r * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = mixColor(spark.color, "#401028", 0.25);
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.35, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        eye(-r * 0.18, -r * 0.2, r * 0.16, { angry: false, lookX: r * 0.04, lookY: 0 });
        eye(r * 0.22, -r * 0.2, r * 0.16, { angry: false, lookX: r * 0.04, lookY: 0 });
        ctx.strokeStyle = mixColor(spark.color, "#ffffff", 0.4);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.35);
        ctx.quadraticCurveTo(r * 0.35, r * 0.7, 0, r * 1.05);
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (spark.type === "deep") {
        ctx.save();
        ctx.translate(spark.x, spark.y);
        softGlow(0, 0, r * 2.4, spark.color, 0.22);
        for (let i = 3; i >= 0; i -= 1) {
          ctx.globalAlpha = 0.2 + i * 0.15;
          ctx.strokeStyle = mixColor(spark.color, "#ffffff", 0.25);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, r * (0.55 + i * 0.28), p + i, p + i + Math.PI * 1.2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        drawLightOrb(0, 0, r * 0.7, spark.color, p, 1, "rare");
        ctx.restore();
        return;
      }

      const kind = spark.type === "super" ? "super" : spark.type === "rare" ? "rare" : "normal";
      drawLightOrb(spark.x, spark.y, r, spark.color, p, 1, kind);

      if (spark.tutorial) {
        const t = (stateTime * 1.4) % 1;
        for (let i = 0; i < 2; i += 1) {
          const phase = (t + i * 0.5) % 1;
          ctx.globalAlpha = (1 - phase) * 0.45;
          ctx.strokeStyle = spark.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, r * (1.35 + phase * 1.8), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    /* —— PREDATORS —— */
    function drawEvilFish(hunter, alpha = 1, ghost = false) {
      const angle = Math.atan2(hunter.vy || 0.001, hunter.vx || 0.001);
      const r = hunter.r * (ghost ? 1.05 : 1);
      const wobble = Math.sin(hunter.phase || 0) * 0.1;
      const body = ghost ? "#c8d8ff" : cssVar("--danger", "#ff6888");
      const dark = mixColor(body, ghost ? "#304060" : "#5a1024", 0.4);
      const light = mixColor(body, "#ffffff", ghost ? 0.5 : 0.38);
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.rotate(angle + wobble);
      softGlow(0, 0, r * 2.3, body, alpha * 0.28);
      ctx.globalAlpha = alpha * (ghost ? 0.75 : 1);

      // tail fan
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, 0);
      ctx.quadraticCurveTo(-r * 1.35, -r * 0.85, -r * 2.05, -r * 0.75);
      ctx.quadraticCurveTo(-r * 1.45, 0, -r * 2.05, r * 0.75);
      ctx.quadraticCurveTo(-r * 1.35, r * 0.85, -r * 0.85, 0);
      ctx.fill();
      ctx.strokeStyle = mixColor(dark, "#ffffff", 0.15);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 1.15, -r * 0.2);
      ctx.lineTo(-r * 1.85, -r * 0.45);
      ctx.moveTo(-r * 1.15, r * 0.2);
      ctx.lineTo(-r * 1.85, r * 0.45);
      ctx.stroke();

      // body
      const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r * 1.25);
      grad.addColorStop(0, light);
      grad.addColorStop(0.5, body);
      grad.addColorStop(1, dark);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(r * 1.2, 0);
      ctx.bezierCurveTo(r * 0.7, -r * 0.95, -r * 0.5, -r * 0.9, -r * 1.05, 0);
      ctx.bezierCurveTo(-r * 0.5, r * 0.9, r * 0.7, r * 0.95, r * 1.2, 0);
      ctx.fill();

      // armor plates
      ctx.strokeStyle = mixColor(body, "#ffffff", 0.18);
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 4; i += 1) {
        const x = -r * 0.55 + i * r * 0.28;
        ctx.beginPath();
        ctx.ellipse(x, 0, r * 0.22, r * 0.55, 0, -0.9, 0.9);
        ctx.stroke();
      }

      // fins
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.55);
      ctx.quadraticCurveTo(r * 0.15, -r * 1.45, r * 0.55, -r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.05, r * 0.35);
      ctx.quadraticCurveTo(-r * 0.15, r * 1.2, -r * 0.45, r * 0.3);
      ctx.closePath();
      ctx.fill();

      // gills
      ctx.strokeStyle = mixColor(dark, "#000", 0.25);
      for (let i = 0; i < 3; i += 1) {
        const gx = r * (0.2 + i * 0.12);
        ctx.beginPath();
        ctx.moveTo(gx, -r * 0.28);
        ctx.quadraticCurveTo(gx + r * 0.1, 0, gx, r * 0.32);
        ctx.stroke();
      }

      eye(r * 0.48, -r * 0.18, r * 0.26, { angry: !ghost, iris: ghost ? "#203050" : "#180810", lookX: r * 0.08 });
      // cheek + snarl
      ctx.fillStyle = ghost ? "rgba(160,190,255,0.35)" : "rgba(255,90,120,0.4)";
      ctx.beginPath();
      ctx.ellipse(r * 0.4, r * 0.14, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fffaf2";
      for (let i = 0; i < 5; i += 1) {
        const tx = r * 0.72 + i * r * 0.09;
        ctx.beginPath();
        ctx.moveTo(tx, r * 0.02);
        ctx.lineTo(tx + r * 0.05, r * 0.28);
        ctx.lineTo(tx + r * 0.1, 0);
        ctx.closePath();
        ctx.fill();
      }
      if (ghost) {
        ctx.strokeStyle = "rgba(230,240,255,0.75)";
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.3, r * 0.95, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    function drawDartHunter(hunter, alpha = 1) {
      const angle = Math.atan2(hunter.vy || 0.001, hunter.vx || 0.001);
      const r = hunter.r;
      const dash = hunter.dashT > 0;
      const flap = Math.sin(hunter.phase || 0) * 0.2;
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      if (dash) {
        for (let i = 0; i < 4; i += 1) {
          ctx.strokeStyle = `rgba(255,230,150,${0.5 - i * 0.1})`;
          ctx.lineWidth = 2.4 - i * 0.35;
          ctx.beginPath();
          ctx.moveTo(-r * (2.4 + i * 0.5), (i - 1.5) * r * 0.12);
          ctx.lineTo(-r * 0.5, 0);
          ctx.stroke();
        }
      }
      softGlow(0, 0, r * 2, "#ffd078", 0.22);
      const body = ctx.createLinearGradient(-r, 0, r * 1.4, 0);
      body.addColorStop(0, "#c87820");
      body.addColorStop(0.45, "#ffd078");
      body.addColorStop(1, "#fff3c8");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(r * 1.7, 0);
      ctx.lineTo(-r * 0.2, -r * (0.55 + flap * 0.15));
      ctx.lineTo(-r * 1.5, 0);
      ctx.lineTo(-r * 0.2, r * (0.55 + flap * 0.15));
      ctx.closePath();
      ctx.fill();
      // wing blades
      ctx.fillStyle = mixColor("#ffd078", "#8a4010", 0.35);
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.2);
      ctx.quadraticCurveTo(-r * 0.1, -r * 1.35 - flap * r, -r * 0.9, -r * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.1, r * 0.2);
      ctx.quadraticCurveTo(-r * 0.1, r * 1.35 + flap * r, -r * 0.9, r * 0.15);
      ctx.closePath();
      ctx.fill();
      eye(r * 0.55, -r * 0.08, r * 0.18, { angry: true, lookX: r * 0.06, tall: 0.85 });
      ctx.fillStyle = "#fff8f0";
      ctx.beginPath();
      ctx.moveTo(r * 1.15, -r * 0.08);
      ctx.lineTo(r * 1.55, 0);
      ctx.lineTo(r * 1.15, r * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawJellyHunter(hunter, alpha = 1) {
      const r = hunter.r;
      const pulse = hunter.pulse || 0;
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, r * 2.4, "#ff7ab8", 0.3);
      // tentacles
      for (let i = 0; i < 8; i += 1) {
        const spread = (i - 3.5) * 0.2;
        const len = r * (1.6 + Math.sin(pulse * 1.5 + i) * 0.35);
        ctx.strokeStyle = mixColor("#ff7ab8", "#401030", 0.2);
        ctx.lineWidth = Math.max(1.6, r * 0.1);
        ctx.lineCap = "round";
        ctx.globalAlpha = alpha * (0.45 + (i % 3) * 0.12);
        ctx.beginPath();
        ctx.moveTo(spread * r * 0.35, r * 0.35);
        ctx.bezierCurveTo(spread * r * 0.8, r * 0.9, spread * r * 0.5 + Math.sin(pulse + i) * r * 0.3, r * 1.3, spread * r * 0.2, len);
        ctx.stroke();
        // nematocyst dots
        ctx.fillStyle = "rgba(255,220,240,0.7)";
        ctx.beginPath();
        ctx.arc(spread * r * 0.35, r * 0.7 + (i % 2) * r * 0.25, r * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      const bell = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r);
      bell.addColorStop(0, "rgba(255,245,250,0.95)");
      bell.addColorStop(0.4, "#ff9ac8");
      bell.addColorStop(1, "#a03068");
      ctx.fillStyle = bell;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.95, r * 0.72, 0, Math.PI, 0);
      ctx.quadraticCurveTo(r * 0.95, r * 0.35, 0, r * 0.45);
      ctx.quadraticCurveTo(-r * 0.95, r * 0.35, -r * 0.95, 0);
      ctx.fill();
      // bell pattern
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.3;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.28, -r * 0.05);
        ctx.quadraticCurveTo(i * r * 0.28, r * 0.15, i * r * 0.15, r * 0.35);
        ctx.stroke();
      }
      eye(-r * 0.28, -r * 0.05, r * 0.16, { angry: true, lookX: 0, lookY: r * 0.04 });
      eye(r * 0.28, -r * 0.05, r * 0.16, { angry: true, lookX: 0, lookY: r * 0.04 });
      ctx.restore();
    }

    function drawEelHunter(hunter, alpha = 1) {
      const angle = Math.atan2(hunter.vy || 0.001, hunter.vx || 0.001);
      const r = hunter.r;
      const weave = hunter.weave || 0;
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, r * 2.2, "#3cffb0", 0.25);
      for (let i = 6; i >= 0; i -= 1) {
        const t = -r * (0.2 + i * 0.38);
        const wob = Math.sin(weave * 2 + i * 0.7) * r * 0.22;
        const rr = r * (0.85 - i * 0.07);
        const seg = ctx.createRadialGradient(t, wob - rr * 0.2, rr * 0.1, t, wob, rr);
        seg.addColorStop(0, "#b8ffe0");
        seg.addColorStop(0.45, "#3cffb0");
        seg.addColorStop(1, "#0a4030");
        ctx.fillStyle = seg;
        ctx.beginPath();
        ctx.ellipse(t, wob, rr * 1.1, rr * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        if (i % 2 === 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.25)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(t - rr * 0.3, wob);
          ctx.lineTo(t + rr * 0.3, wob);
          ctx.stroke();
        }
      }
      // electric whiskers
      ctx.strokeStyle = "rgba(180,255,220,0.7)";
      ctx.lineWidth = 1.5;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r * 0.7, side * r * 0.15);
        ctx.quadraticCurveTo(r * 1.2, side * r * 0.55, r * 1.55, side * r * 0.2);
        ctx.stroke();
      }
      eye(r * 0.55, -r * 0.12, r * 0.2, { angry: true, iris: "#041810", lookX: r * 0.05 });
      ctx.fillStyle = "#041810";
      ctx.beginPath();
      ctx.ellipse(r * 0.95, 0, r * 0.35, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawSharkHunter(hunter, alpha = 1) {
      const angle = Math.atan2(hunter.vy || 0.001, hunter.vx || 0.001);
      const r = hunter.r;
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, r * 2.3, "#6a90b8", 0.22);
      const body = ctx.createLinearGradient(0, -r, 0, r);
      body.addColorStop(0, "#d0dde8");
      body.addColorStop(0.4, "#6a90b8");
      body.addColorStop(1, "#1a2838");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(r * 1.55, 0);
      ctx.bezierCurveTo(r * 0.6, -r * 0.85, -r * 0.6, -r * 0.7, -r * 1.35, 0);
      ctx.bezierCurveTo(-r * 0.6, r * 0.7, r * 0.6, r * 0.85, r * 1.55, 0);
      ctx.fill();
      // belly
      ctx.fillStyle = "rgba(240,248,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(r * 0.1, r * 0.25, r * 0.75, r * 0.35, 0.1, 0, Math.PI);
      ctx.fill();
      // dorsal
      ctx.fillStyle = "#2a3848";
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, -r * 0.55);
      ctx.lineTo(r * 0.25, -r * 1.55);
      ctx.lineTo(r * 0.55, -r * 0.4);
      ctx.closePath();
      ctx.fill();
      // scar lines
      ctx.strokeStyle = "rgba(20,30,40,0.45)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.15);
      ctx.lineTo(r * 0.35, r * 0.05);
      ctx.moveTo(-r * 0.05, r * 0.1);
      ctx.lineTo(r * 0.45, r * 0.22);
      ctx.stroke();
      // tail
      ctx.fillStyle = "#2a3848";
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, 0);
      ctx.lineTo(-r * 1.95, -r * 0.7);
      ctx.lineTo(-r * 1.45, 0);
      ctx.lineTo(-r * 1.95, r * 0.55);
      ctx.closePath();
      ctx.fill();
      eye(r * 0.55, -r * 0.2, r * 0.22, { angry: true, iris: "#0a1018", white: "#e8f0f8" });
      // teeth row
      ctx.fillStyle = "#f8f4ec";
      for (let i = 0; i < 6; i += 1) {
        const tx = r * 0.85 + i * r * 0.1;
        ctx.beginPath();
        ctx.moveTo(tx, r * 0.05);
        ctx.lineTo(tx + r * 0.05, r * 0.28);
        ctx.lineTo(tx + r * 0.1, r * 0.04);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    function drawRayHunter(hunter, alpha = 1) {
      const angle = Math.atan2(hunter.vy || 0.001, hunter.vx || 0.001);
      const r = hunter.r;
      const flap = Math.sin(hunter.weave || 0) * 0.18;
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, r * 2.5, "#7ef0ea", 0.25);
      const wing = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.8);
      wing.addColorStop(0, "#e8fffc");
      wing.addColorStop(0.4, "#7ef0ea");
      wing.addColorStop(1, "#1a4850");
      ctx.fillStyle = wing;
      ctx.beginPath();
      ctx.moveTo(r * 1.1, 0);
      ctx.quadraticCurveTo(r * 0.2, -r * (1.55 + flap), -r * 1.1, -r * 0.35);
      ctx.quadraticCurveTo(-r * 1.4, 0, -r * 1.1, r * 0.35);
      ctx.quadraticCurveTo(r * 0.2, r * (1.55 + flap), r * 1.1, 0);
      ctx.fill();
      // rib veins
      ctx.strokeStyle = "rgba(20,60,70,0.35)";
      ctx.lineWidth = 1.3;
      for (let i = -3; i <= 3; i += 1) {
        if (!i) continue;
        ctx.beginPath();
        ctx.moveTo(r * 0.3, 0);
        ctx.quadraticCurveTo(r * 0.1, i * r * 0.35, -r * 0.7, i * r * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = mixColor("#7ef0ea", "#102028", 0.35);
      ctx.beginPath();
      ctx.ellipse(r * 0.35, 0, r * 0.55, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      eye(r * 0.45, -r * 0.1, r * 0.14, { angry: true, lookX: r * 0.04 });
      eye(r * 0.45, r * 0.1, r * 0.14, { angry: true, lookX: r * 0.04 });
      // whip tail
      ctx.strokeStyle = "#1a4850";
      ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-r * 1.0, 0);
      ctx.quadraticCurveTo(-r * 1.8, Math.sin(flap * 4) * r * 0.4, -r * 2.4, 0);
      ctx.stroke();
      ctx.restore();
    }

    function drawGhostHunter(hunter, alpha = 1) {
      const angle = Math.atan2(hunter.vy || 0.001, hunter.vx || 0.001);
      const r = hunter.r;
      const a = alpha * (hunter.phaseAlpha ?? 0.75);
      const wob = Math.sin(hunter.pulse || 0) * r * 0.1;
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.rotate(angle);
      ctx.globalAlpha = a;
      softGlow(0, 0, r * 2.4, "#c8d8ff", 0.3);
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = `rgba(190,210,255,${0.28 - i * 0.05})`;
        ctx.beginPath();
        ctx.ellipse(-r * (1.1 + i * 0.4), wob * (i + 1) * 0.25, r * (0.5 - i * 0.07), r * (0.32 - i * 0.04), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const ghost = ctx.createRadialGradient(-r * 0.1, -r * 0.2, r * 0.1, 0, 0, r * 1.35);
      ghost.addColorStop(0, "rgba(255,255,255,0.95)");
      ghost.addColorStop(0.5, "rgba(190,210,255,0.85)");
      ghost.addColorStop(1, "rgba(80,100,150,0.2)");
      ctx.fillStyle = ghost;
      ctx.beginPath();
      ctx.moveTo(r * 1.15, 0);
      ctx.bezierCurveTo(r * 0.5, -r * 1.05, -r * 1.0, -r * 0.8, -r * 1.25, 0);
      ctx.bezierCurveTo(-r * 1.0, r * 0.8, r * 0.5, r * 1.05, r * 1.15, 0);
      ctx.fill();
      // torn edge
      ctx.fillStyle = "rgba(180,200,240,0.55)";
      for (let i = 0; i < 5; i += 1) {
        const y = -r * 0.5 + i * r * 0.25;
        ctx.beginPath();
        ctx.moveTo(-r * 1.0, y);
        ctx.lineTo(-r * 1.45, y + r * 0.08);
        ctx.lineTo(-r * 1.0, y + r * 0.16);
        ctx.fill();
      }
      eye(r * 0.35, -r * 0.18, r * 0.2, { angry: false, iris: "#203050", white: "#f7fbff" });
      eye(r * 0.35, r * 0.2, r * 0.17, { angry: false, iris: "#203050", white: "#f7fbff" });
      ctx.strokeStyle = "rgba(40,60,100,0.5)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(r * 0.75, r * 0.05, r * 0.22, 0.35, Math.PI - 0.2);
      ctx.stroke();
      ctx.restore();
    }

    function drawCrabHunter(hunter, alpha = 1) {
      const r = hunter.r;
      const wob = Math.sin((hunter.pulse || 0) * 2.2) * r * 0.07;
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, r * 2.1, "#ff9a62", 0.25);
      // legs
      ctx.strokeStyle = "#c05028";
      ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.lineCap = "round";
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i += 1) {
          const base = -r * 0.2 + i * r * 0.25;
          ctx.beginPath();
          ctx.moveTo(side * r * 0.55, base + wob);
          ctx.quadraticCurveTo(side * r * 1.25, base + r * 0.2, side * r * 1.45, base + r * 0.55 + wob);
          ctx.stroke();
        }
      }
      const shell = ctx.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.1, 0, 0, r);
      shell.addColorStop(0, "#ffd0a8");
      shell.addColorStop(0.5, "#ff9a62");
      shell.addColorStop(1, "#8a3018");
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.ellipse(0, wob, r * 1.15, r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      speckles(7, "rgba(120,40,20,0.35)", r * 0.08, r * 0.06, r * 0.55);
      // claws
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#e06838";
        ctx.beginPath();
        ctx.ellipse(side * r * 1.05, -r * 0.25 + wob, r * 0.42, r * 0.24, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffb080";
        ctx.beginPath();
        ctx.moveTo(side * r * 1.25, -r * 0.35 + wob);
        ctx.lineTo(side * r * 1.65, -r * 0.55 + wob);
        ctx.lineTo(side * r * 1.35, -r * 0.1 + wob);
        ctx.closePath();
        ctx.fill();
      }
      eye(-r * 0.28, -r * 0.15 + wob, r * 0.16, { angry: true });
      eye(r * 0.3, -r * 0.15 + wob, r * 0.16, { angry: true });
      ctx.restore();
    }

    function drawUrchinHunter(hunter, alpha = 1) {
      const r = hunter.r;
      const pulse = hunter.pulse || 0;
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, r * 2.2, "#9be7ff", 0.28);
      const core = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.1, 0, 0, r * 0.7);
      core.addColorStop(0, "#e8fbff");
      core.addColorStop(0.5, "#9be7ff");
      core.addColorStop(1, "#204860");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 14; i += 1) {
        const a = (i / 14) * Math.PI * 2 + pulse * 0.15;
        const len = r * (1.15 + 0.18 * Math.sin(pulse * 2 + i));
        const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
        grad.addColorStop(0, "#c8f7ff");
        grad.addColorStop(1, "#306878");
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1.8, r * 0.1);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
        ctx.fillStyle = "#e8fbff";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * len, Math.sin(a) * len, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      eye(-r * 0.14, -r * 0.08, r * 0.12, { angry: true, tall: 0.9 });
      eye(r * 0.18, -r * 0.08, r * 0.12, { angry: true, tall: 0.9 });
      ctx.restore();
    }

    function drawMirrorHunter(hunter, alpha = 1) {
      const angle = Math.atan2(hunter.vy || 0.01, hunter.vx || 0.01);
      const r = hunter.r;
      const a = alpha * (0.55 + 0.35 * (0.5 + 0.5 * Math.sin((hunter.pulse || 0) * 2.2)));
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.rotate(angle);
      ctx.globalAlpha = a;
      softGlow(0, 0, r * 2.2, "#9be7ff", 0.3);
      const glass = ctx.createLinearGradient(-r, -r, r, r);
      glass.addColorStop(0, "rgba(255,255,255,0.2)");
      glass.addColorStop(0.35, "rgba(245,252,255,0.95)");
      glass.addColorStop(0.65, "#9be7ff");
      glass.addColorStop(1, "rgba(155,231,255,0.25)");
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.moveTo(r * 1.35, 0);
      ctx.bezierCurveTo(r * 0.3, -r * 0.85, -r * 0.9, -r * 0.55, -r * 1.15, 0);
      ctx.bezierCurveTo(-r * 0.9, r * 0.55, r * 0.3, r * 0.85, r * 1.35, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // refraction shards
      ctx.strokeStyle = "rgba(200,240,255,0.55)";
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.4 + i * r * 0.25, -r * 0.3);
        ctx.lineTo(-r * 0.1 + i * r * 0.25, r * 0.35);
        ctx.stroke();
      }
      eye(r * 0.35, -r * 0.14, r * 0.14, { angry: true, iris: "#102038" });
      eye(r * 0.35, r * 0.14, r * 0.14, { angry: true, iris: "#102038" });
      ctx.restore();
    }

    function drawBossHunter(hunter, alpha = 1) {
      const pulse = hunter.pulse || 0;
      const aim = Math.atan2(hunter.vy || 0.01, hunter.vx || 0.01);
      const s = hunter.r;
      const kraken = !!hunter.kraken;
      const maw = !!hunter.maw;
      const body = kraken ? "#2a1840" : maw ? "#0f2438" : "#152838";
      const accent = hunter.bossPhase === "telegraph" || hunter.bossPhase === "charge"
        ? "#ff6b7a"
        : hunter.bossPhase === "ink_burst"
          ? "#c184ff"
          : hunter.bossPhase === "suck"
            ? "#6ab0ff"
            : maw ? "#5aa0d8" : kraken ? "#b48cff" : "#7ec8ff";
      ctx.save();
      ctx.translate(hunter.x, hunter.y);
      ctx.rotate(aim);
      softGlow(0, 0, s * 2.9, accent, alpha * 0.38);
      ctx.globalAlpha = alpha;

      if (kraken) {
        ctx.lineCap = "round";
        for (let i = -3; i <= 3; i += 1) {
          if (!i) continue;
          const wob = Math.sin(pulse * 2 + i) * s * 0.35;
          ctx.strokeStyle = mixColor(accent, body, 0.35);
          ctx.lineWidth = s * (0.18 - Math.abs(i) * 0.015);
          ctx.beginPath();
          ctx.moveTo(-s * 0.2, i * s * 0.12);
          ctx.bezierCurveTo(-s * 1.1, i * s * 0.45 + wob, -s * 1.9, i * s * 0.7 - wob, -s * 2.6, i * s * 0.9 + wob * 0.5);
          ctx.stroke();
          ctx.fillStyle = mixColor(accent, "#401028", 0.3);
          for (let k = 0; k < 3; k += 1) {
            const x = -s * (0.8 + k * 0.55);
            const y = i * s * (0.25 + k * 0.2) + wob * (0.3 + k * 0.1);
            ctx.beginPath();
            ctx.arc(x, y, s * 0.08, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (maw) {
        // suction disc / open trench mouth silhouette
        const open = hunter.bossPhase === "suck" ? 1.18 : hunter.bossPhase === "telegraph" ? 1.08 : 1;
        softGlow(s * 0.55, 0, s * 1.8, accent, alpha * 0.28);
        ctx.fillStyle = mixColor(body, "#000810", 0.35);
        ctx.beginPath();
        ctx.ellipse(s * 0.15, 0, s * 1.15 * open, s * 0.95 * open, 0, 0, Math.PI * 2);
        ctx.fill();
        const throat = ctx.createRadialGradient(s * 0.35, 0, s * 0.1, s * 0.45, 0, s * 1.1);
        throat.addColorStop(0, mixColor(accent, "#ffffff", 0.25));
        throat.addColorStop(0.35, mixColor(body, accent, 0.45));
        throat.addColorStop(1, "#050810");
        ctx.fillStyle = throat;
        ctx.beginPath();
        ctx.ellipse(s * 0.4, 0, s * 0.78 * open, s * 0.62 * open, 0, 0, Math.PI * 2);
        ctx.fill();
        // jaw plates
        for (const side of [-1, 1]) {
          ctx.fillStyle = mixColor(body, accent, 0.25);
          ctx.beginPath();
          ctx.moveTo(-s * 0.2, side * s * 0.15);
          ctx.quadraticCurveTo(s * 0.5, side * s * 1.25 * open, s * 1.35, side * s * 0.35);
          ctx.quadraticCurveTo(s * 0.7, side * s * 0.55, s * 0.15, side * s * 0.25);
          ctx.closePath();
          ctx.fill();
        }
        // teeth ring
        ctx.fillStyle = "#fff4ea";
        for (let i = 0; i < 10; i += 1) {
          const a = (i / 10) * Math.PI * 2;
          const tx = s * 0.4 + Math.cos(a) * s * 0.55 * open;
          const ty = Math.sin(a) * s * 0.42 * open;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + Math.cos(a) * s * 0.22, ty + Math.sin(a) * s * 0.22);
          ctx.lineTo(tx + Math.cos(a + 0.2) * s * 0.12, ty + Math.sin(a + 0.2) * s * 0.12);
          ctx.closePath();
          ctx.fill();
        }
        eye(s * 0.05, -s * 0.42, s * 0.18, { angry: true, iris: "#081018", white: "#d8f0ff", lookX: s * 0.05 });
        eye(s * 0.05, s * 0.42, s * 0.18, { angry: true, iris: "#081018", white: "#d8f0ff", lookX: s * 0.05 });
        ctx.restore();
        return;
      }

      // armored serpent segments
      for (let i = 6; i >= 0; i -= 1) {
        const t = -s * (0.1 + i * 0.4);
        const wob = Math.sin(pulse * 2.1 + i * 0.85) * s * 0.16;
        const rr = s * (1.0 - i * 0.07);
        const seg = ctx.createRadialGradient(t, wob - rr * 0.25, rr * 0.1, t, wob, rr);
        seg.addColorStop(0, mixColor(accent, "#ffffff", 0.35));
        seg.addColorStop(0.4, mixColor(body, accent, 0.35));
        seg.addColorStop(1, mixColor(body, "#000000", 0.35));
        ctx.fillStyle = seg;
        ctx.beginPath();
        ctx.ellipse(t, wob, rr * 1.2, rr * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(t + rr * 0.1, wob, rr * 0.5, -0.9, 0.9);
        ctx.stroke();
        if (i === 1 || i === 3 || i === 5) {
          ctx.fillStyle = mixColor(accent, body, 0.45);
          ctx.beginPath();
          ctx.moveTo(t, wob - rr * 0.55);
          ctx.lineTo(t - rr * 0.15, wob - rr * 1.25);
          ctx.lineTo(t + rr * 0.4, wob - rr * 0.35);
          ctx.closePath();
          ctx.fill();
        }
      }

      // crown / horns
      ctx.fillStyle = mixColor(accent, "#120818", 0.2);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 0.25, side * s * 0.25);
        ctx.lineTo(s * 0.7, side * s * 1.15);
        ctx.lineTo(s * 0.9, side * s * 0.2);
        ctx.closePath();
        ctx.fill();
      }
      // head
      const head = ctx.createRadialGradient(s * 0.3, -s * 0.15, s * 0.1, s * 0.4, 0, s);
      head.addColorStop(0, mixColor(accent, "#ffffff", 0.4));
      head.addColorStop(0.5, mixColor(body, accent, 0.4));
      head.addColorStop(1, body);
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.ellipse(s * 0.45, 0, s * 0.85, s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // jaws
      ctx.fillStyle = mixColor(accent, "#120818", 0.4);
      ctx.beginPath();
      ctx.moveTo(s * 0.9, -s * 0.3);
      ctx.lineTo(s * 1.85, -s * 0.1);
      ctx.lineTo(s * 1.0, s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.9, s * 0.3);
      ctx.lineTo(s * 1.8, s * 0.12);
      ctx.lineTo(s * 1.0, -s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff8f0";
      for (let i = 0; i < 4; i += 1) {
        const tx = s * (1.1 + i * 0.14);
        ctx.beginPath();
        ctx.moveTo(tx, -s * 0.02);
        ctx.lineTo(tx + s * 0.06, s * 0.16);
        ctx.lineTo(tx + s * 0.12, 0);
        ctx.closePath();
        ctx.fill();
      }
      eye(s * 0.55, -s * 0.22, s * 0.22, { angry: true, iris: "#120810", white: "#ffe8e0", lookX: s * 0.08 });
      ctx.strokeStyle = mixColor(accent, "#ffffff", 0.45);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s * 0.2, s * 0.15, s * 0.25, 0.2, Math.PI * 1.2);
      ctx.stroke();
      ctx.restore();
    }

    /* —— HEROES —— */
    function heroEyes(s, wob, alpha, eyeY = 0) {
      const blink = Math.sin(wob * 0.32) > 0.93 ? 0.25 : 1;
      for (const side of [-1, 1]) {
        eye(s * 0.28, side * s * 0.22 + eyeY, s * 0.17, {
          tall: blink,
          lookX: s * 0.05,
          lookY: s * 0.03,
          angry: false,
        });
      }
    }

    function drawInkPolyp(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-b", "#7affd4");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.55, accent, 0.26);
      softGlow(s * 0.1, -s * 0.1, s * 1.35, mixColor(ink, "#ffffff", 0.35), 0.16);
      // tentacles with suckers
      for (let i = 0; i < 8; i += 1) {
        const side = i < 4 ? -1 : 1;
        const rank = i % 4;
        const baseY = side * s * (0.16 + rank * 0.2);
        const curl = Math.sin(wob * 1.4 + i * 0.9) * s * 0.48;
        const len = s * (1.65 + rank * 0.12);
        const tent = ctx.createLinearGradient(-s * 0.05, baseY * 0.5, -len, baseY * 0.9 + curl);
        tent.addColorStop(0, mixColor(ink, "#ffffff", 0.28));
        tent.addColorStop(0.55, mixColor(ink, accent, 0.18 + rank * 0.04));
        tent.addColorStop(1, mixColor(ink, "#102028", 0.4));
        ctx.strokeStyle = tent;
        ctx.lineWidth = Math.max(2.8, s * (0.26 - rank * 0.02));
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-s * 0.05, baseY * 0.5);
        ctx.bezierCurveTo(-s * 0.55, baseY * 1.3 + curl * 0.4, -len * 0.55, baseY + curl, -len, baseY * 0.9 + curl);
        ctx.stroke();
        ctx.fillStyle = mixColor(ink, "#2a1830", 0.35);
        for (let k = 0; k < 3; k += 1) {
          const t = 0.35 + k * 0.2;
          const x = -len * t;
          const y = baseY * (0.7 + t * 0.3) + curl * t;
          ctx.beginPath();
          ctx.arc(x, y, s * 0.065, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const mantle = ctx.createRadialGradient(s * 0.12, -s * 0.18, s * 0.08, 0, 0, s);
      mantle.addColorStop(0, mixColor(ink, "#ffffff", 0.62));
      mantle.addColorStop(0.35, mixColor(ink, accent, 0.28));
      mantle.addColorStop(0.72, mixColor(ink, accent, 0.08));
      mantle.addColorStop(1, mixColor(ink, "#102028", 0.42));
      ctx.fillStyle = mantle;
      ctx.beginPath();
      ctx.ellipse(s * 0.08, 0, s * 0.98, s * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      // belly highlight
      ctx.fillStyle = mixColor(ink, "#ffffff", 0.22);
      ctx.beginPath();
      ctx.ellipse(s * 0.12, s * 0.18, s * 0.55, s * 0.28, 0.12, 0, Math.PI);
      ctx.fill();
      speckles(7, mixColor(ink, "#ffffff", 0.24), s * 0.07, s * 0.05, s * 0.48);
      heroEyes(s, wob, alpha, -s * 0.05);
      ctx.restore();
    }

    function drawJellyfish(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-b", "#7affd4");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      softGlow(0, 0, s * 2.3, accent, alpha * 0.25);
      for (let i = 0; i < 9; i += 1) {
        const spread = (i - 4) * 0.2;
        const len = s * (1.45 + Math.sin(wob + i) * 0.25);
        ctx.globalAlpha = alpha * (0.4 + (i % 3) * 0.1);
        ctx.strokeStyle = mixColor(ink, accent, 0.4);
        ctx.lineWidth = Math.max(1.5, s * 0.08);
        ctx.beginPath();
        ctx.moveTo(s * 0.05, spread * s * 0.3);
        ctx.bezierCurveTo(-s * 0.25, spread * s * 0.8, -s * 0.5, spread * s * 1.1, -len, spread * s * 1.15 + Math.sin(wob * 1.5 + i) * s * 0.2);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      const bell = ctx.createRadialGradient(s * 0.1, 0, s * 0.1, 0, 0, s);
      bell.addColorStop(0, mixColor(ink, "#ffffff", 0.55));
      bell.addColorStop(0.5, mixColor(ink, accent, 0.25));
      bell.addColorStop(1, mixColor(ink, "#1a2848", 0.3));
      ctx.fillStyle = bell;
      ctx.beginPath();
      ctx.ellipse(s * 0.1, 0, s * 0.9, s * 0.72, 0, Math.PI * 0.1, Math.PI * 1.9, true);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(s * 0.15, i * s * 0.18);
        ctx.quadraticCurveTo(-s * 0.1, i * s * 0.22, -s * 0.55, i * s * 0.12);
        ctx.stroke();
      }
      heroEyes(s * 0.9, wob, alpha, -s * 0.05);
      ctx.restore();
    }

    function drawTurtle(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-a", "#ff9a62");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.2, accent, 0.2);
      ctx.fillStyle = mixColor(ink, accent, 0.25);
      for (const [fx, fy, fr] of [[s * 0.9, 0, s * 0.3], [-s * 0.55, -s * 0.5, s * 0.24], [-s * 0.55, s * 0.5, s * 0.24], [-s * 1.0, 0, s * 0.22]]) {
        ctx.beginPath();
        ctx.ellipse(fx, fy + Math.sin(wob + fx) * s * 0.04, fr, fr * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const shell = ctx.createRadialGradient(-s * 0.1, -s * 0.15, s * 0.1, 0, 0, s);
      shell.addColorStop(0, mixColor(ink, "#ffffff", 0.35));
      shell.addColorStop(0.45, mixColor(ink, accent, 0.25));
      shell.addColorStop(1, mixColor(ink, "#1a3020", 0.4));
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.0, s * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = mixColor(ink, "#102018", 0.45);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, 0);
      ctx.lineTo(s * 0.45, 0);
      ctx.moveTo(0, -s * 0.4);
      ctx.lineTo(0, s * 0.4);
      ctx.moveTo(-s * 0.3, -s * 0.3);
      ctx.lineTo(s * 0.3, s * 0.3);
      ctx.moveTo(-s * 0.3, s * 0.3);
      ctx.lineTo(s * 0.3, -s * 0.3);
      ctx.stroke();
      heroEyes(s, wob, alpha, -s * 0.05);
      ctx.restore();
    }

    function drawCrab(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-a", "#ff9a62");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.1, accent, 0.2);
      ctx.strokeStyle = mixColor(ink, accent, 0.3);
      ctx.lineWidth = Math.max(2, s * 0.12);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.moveTo(side * s * 0.4, (-0.2 + i * 0.25) * s);
          ctx.quadraticCurveTo(side * s * 1.1, (0.1 + i * 0.2) * s + Math.sin(wob + i) * s * 0.05, side * s * 1.35, (0.45 + i * 0.15) * s);
          ctx.stroke();
        }
      }
      const shell = ctx.createRadialGradient(0, -s * 0.1, s * 0.1, 0, 0, s);
      shell.addColorStop(0, mixColor(ink, "#ffffff", 0.4));
      shell.addColorStop(0.55, mixColor(ink, accent, 0.3));
      shell.addColorStop(1, mixColor(ink, "#401810", 0.35));
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.05, s * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const side of [-1, 1]) {
        ctx.fillStyle = mixColor(ink, accent, 0.2);
        ctx.beginPath();
        ctx.ellipse(side * s * 0.95, -s * 0.25, s * 0.35, s * 0.2, side * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      heroEyes(s, wob, alpha, -s * 0.08);
      ctx.restore();
    }

    function drawManta(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-b", "#7affd4");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      const flap = Math.sin(wob) * 0.2;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.5, accent, 0.22);
      const wing = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.7);
      wing.addColorStop(0, mixColor(ink, "#ffffff", 0.5));
      wing.addColorStop(0.4, mixColor(ink, accent, 0.25));
      wing.addColorStop(1, mixColor(ink, "#102028", 0.35));
      ctx.fillStyle = wing;
      ctx.beginPath();
      ctx.moveTo(s * 1.0, 0);
      ctx.quadraticCurveTo(s * 0.2, -s * (1.5 + flap), -s * 1.0, -s * 0.3);
      ctx.quadraticCurveTo(-s * 1.25, 0, -s * 1.0, s * 0.3);
      ctx.quadraticCurveTo(s * 0.2, s * (1.5 + flap), s * 1.0, 0);
      ctx.fill();
      ctx.strokeStyle = mixColor(ink, "#ffffff", 0.2);
      for (let i = -2; i <= 2; i += 1) {
        if (!i) continue;
        ctx.beginPath();
        ctx.moveTo(s * 0.3, 0);
        ctx.quadraticCurveTo(0, i * s * 0.35, -s * 0.65, i * s * 0.5);
        ctx.stroke();
      }
      heroEyes(s * 0.85, wob, alpha, 0);
      ctx.strokeStyle = mixColor(ink, "#102028", 0.5);
      ctx.lineWidth = Math.max(2, s * 0.1);
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, 0);
      ctx.quadraticCurveTo(-s * 1.6, Math.sin(wob) * s * 0.3, -s * 2.1, 0);
      ctx.stroke();
      ctx.restore();
    }

    function drawAngler(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--gold", "#ffe898");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.2, accent, 0.2);
      // lure
      ctx.strokeStyle = mixColor(ink, accent, 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.4, -s * 0.55);
      ctx.quadraticCurveTo(s * 0.9, -s * 1.2, s * 1.15, -s * 0.7);
      ctx.stroke();
      softGlow(s * 1.15, -s * 0.7, s * 0.55, accent, 0.7);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(s * 1.15, -s * 0.7, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      const bodyG = ctx.createRadialGradient(-s * 0.1, -s * 0.15, s * 0.1, 0, 0, s);
      bodyG.addColorStop(0, mixColor(ink, "#ffffff", 0.35));
      bodyG.addColorStop(0.5, mixColor(ink, accent, 0.15));
      bodyG.addColorStop(1, mixColor(ink, "#101828", 0.4));
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.05, s * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      speckles(5, "rgba(255,255,255,0.15)", s * 0.07, s * 0.05, s * 0.4);
      // teeth grin
      ctx.fillStyle = "#fff8f0";
      for (let i = 0; i < 4; i += 1) {
        const tx = s * 0.35 + i * s * 0.15;
        ctx.beginPath();
        ctx.moveTo(tx, s * 0.15);
        ctx.lineTo(tx + s * 0.06, s * 0.38);
        ctx.lineTo(tx + s * 0.12, s * 0.14);
        ctx.closePath();
        ctx.fill();
      }
      heroEyes(s, wob, alpha, -s * 0.12);
      ctx.restore();
    }

    function drawNautilus(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-a", "#ff9a62");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim + wob * 0.05);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.2, accent, 0.22);
      const shell = ctx.createRadialGradient(-s * 0.2, -s * 0.2, s * 0.1, 0, 0, s * 1.2);
      shell.addColorStop(0, mixColor(ink, "#ffffff", 0.45));
      shell.addColorStop(0.4, mixColor(ink, accent, 0.3));
      shell.addColorStop(1, mixColor(ink, "#301808", 0.4));
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = mixColor(ink, "#201008", 0.45);
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 5; i += 1) {
        const rr = s * (0.25 + i * 0.16);
        ctx.beginPath();
        ctx.arc(-s * 0.1, 0, rr, -0.2, Math.PI * 1.6);
        ctx.stroke();
      }
      // tentacle cluster
      for (let i = 0; i < 5; i += 1) {
        const a = -0.4 + i * 0.2;
        ctx.strokeStyle = mixColor(ink, accent, 0.25);
        ctx.lineWidth = s * 0.1;
        ctx.beginPath();
        ctx.moveTo(s * 0.7, a * s * 0.3);
        ctx.quadraticCurveTo(s * 1.2, a * s * 0.6 + Math.sin(wob + i) * s * 0.1, s * 1.55, a * s * 0.35);
        ctx.stroke();
      }
      heroEyes(s * 0.75, wob, alpha, -s * 0.05);
      ctx.restore();
    }

    function drawSubmarine(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-b", "#7affd4");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.3, accent, 0.2);
      const hull = ctx.createLinearGradient(0, -s, 0, s);
      hull.addColorStop(0, mixColor(ink, "#ffffff", 0.4));
      hull.addColorStop(0.5, mixColor(ink, accent, 0.2));
      hull.addColorStop(1, mixColor(ink, "#102028", 0.45));
      ctx.fillStyle = hull;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.35, s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // tower
      ctx.fillStyle = mixColor(ink, accent, 0.15);
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.55);
      ctx.lineTo(-s * 0.1, -s * 1.05);
      ctx.lineTo(s * 0.4, -s * 1.05);
      ctx.lineTo(s * 0.4, -s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = mixColor(ink, "#000", 0.25);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // portholes
      for (let i = 0; i < 3; i += 1) {
        const x = -s * 0.45 + i * s * 0.4;
        ctx.fillStyle = mixColor(accent, "#ffffff", 0.35);
        ctx.beginPath();
        ctx.arc(x, 0, s * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = mixColor(ink, "#000", 0.35);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // propeller
      ctx.save();
      ctx.translate(-s * 1.25, 0);
      ctx.rotate(wob * 3);
      ctx.fillStyle = mixColor(accent, "#102028", 0.3);
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.35, s * 0.1, (i / 3) * Math.PI * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // periscope gleam as eye
      eye(s * 0.15, -s * 0.85, s * 0.12, { angry: false, iris: "#102028" });
      ctx.restore();
    }

    function drawEel(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-b", "#7affd4");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.2, accent, 0.22);
      // electric arcs
      ctx.strokeStyle = mixColor(accent, "#ffffff", 0.55);
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = alpha * 0.55;
      for (let i = 0; i < 3; i += 1) {
        const side = i === 1 ? 0 : i === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(s * 0.6, side * s * 0.1);
        ctx.lineTo(s * 0.9, side * s * 0.35 + Math.sin(wob * 4 + i) * s * 0.1);
        ctx.lineTo(s * 1.25, side * s * 0.05);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      for (let i = 5; i >= 0; i -= 1) {
        const t = -s * (0.15 + i * 0.35);
        const wave = Math.sin(wob * 2 + i * 0.7) * s * 0.2;
        const rr = s * (0.8 - i * 0.06);
        const seg = ctx.createRadialGradient(t, wave, rr * 0.1, t, wave, rr);
        seg.addColorStop(0, mixColor(ink, "#ffffff", 0.4));
        seg.addColorStop(0.5, mixColor(ink, accent, 0.25));
        seg.addColorStop(1, mixColor(ink, "#102028", 0.35));
        ctx.fillStyle = seg;
        ctx.beginPath();
        ctx.ellipse(t, wave, rr * 1.05, rr * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        if (i % 2 === 0) {
          ctx.strokeStyle = mixColor(accent, "#ffffff", 0.35);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(t - rr * 0.25, wave);
          ctx.lineTo(t + rr * 0.25, wave);
          ctx.stroke();
        }
      }
      heroEyes(s * 0.85, wob, alpha, -s * 0.05);
      ctx.restore();
    }

    function drawSquid(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-a", "#ff9a62");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.3, accent, 0.22);
      for (let i = 0; i < 8; i += 1) {
        const a = -0.9 + i * 0.26;
        const len = s * (1.5 + Math.sin(wob + i) * 0.2);
        ctx.strokeStyle = mixColor(ink, accent, 0.25);
        ctx.lineWidth = Math.max(2, s * 0.1);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, a * s * 0.15);
        ctx.quadraticCurveTo(-s * 0.7, a * s * 0.55, -len, a * s * 0.35 + Math.sin(wob * 1.5 + i) * s * 0.15);
        ctx.stroke();
        ctx.fillStyle = mixColor(ink, "#2a1830", 0.4);
        for (let k = 0; k < 3; k += 1) {
          const t = 0.35 + k * 0.2;
          ctx.beginPath();
          ctx.arc(-len * t, a * s * (0.2 + t * 0.2), s * 0.055, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const mantle = ctx.createRadialGradient(s * 0.1, 0, s * 0.1, 0, 0, s);
      mantle.addColorStop(0, mixColor(ink, "#ffffff", 0.45));
      mantle.addColorStop(0.5, mixColor(ink, accent, 0.25));
      mantle.addColorStop(1, mixColor(ink, "#201018", 0.35));
      ctx.fillStyle = mantle;
      ctx.beginPath();
      ctx.ellipse(s * 0.15, 0, s * 0.85, s * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = mixColor(ink, "#ffffff", 0.2);
      ctx.lineWidth = 1.3;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(s * 0.55, i * s * 0.16);
        ctx.quadraticCurveTo(s * 0.1, i * s * 0.2, -s * 0.35, i * s * 0.12);
        ctx.stroke();
      }
      ctx.fillStyle = mixColor(ink, accent, 0.2);
      ctx.beginPath();
      ctx.ellipse(s * 0.55, -s * 0.55, s * 0.35, s * 0.18, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.55, s * 0.55, s * 0.35, s * 0.18, 0.5, 0, Math.PI * 2);
      ctx.fill();
      heroEyes(s, wob, alpha, 0);
      ctx.restore();
    }

    function drawSeahorse(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--gold", "#ffe898");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.2, accent, 0.22);
      // curled tail
      ctx.strokeStyle = mixColor(ink, accent, 0.35);
      ctx.lineWidth = s * 0.22;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 0.2);
      ctx.bezierCurveTo(-s * 0.9, s * 0.6, -s * 0.3, s * 1.3, s * 0.25, s * 1.1);
      ctx.stroke();
      const bodyG = ctx.createLinearGradient(0, -s, 0, s);
      bodyG.addColorStop(0, mixColor(ink, "#ffffff", 0.4));
      bodyG.addColorStop(0.5, mixColor(ink, accent, 0.25));
      bodyG.addColorStop(1, mixColor(ink, "#302010", 0.35));
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.55, s * 0.95, 0.15, 0, Math.PI * 2);
      ctx.fill();
      // snout
      ctx.beginPath();
      ctx.ellipse(s * 0.75, -s * 0.35, s * 0.45, s * 0.18, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // dorsal fin
      ctx.fillStyle = mixColor(accent, ink, 0.3);
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.4);
      for (let i = 0; i < 5; i += 1) {
        ctx.lineTo(-s * 0.55 - Math.sin(wob + i) * s * 0.08, -s * 0.3 + i * s * 0.2);
        ctx.lineTo(-s * 0.15, -s * 0.2 + i * s * 0.2);
      }
      ctx.fill();
      eye(s * 0.2, -s * 0.35, s * 0.14, { angry: false, lookX: s * 0.04 });
      ctx.restore();
    }

    function drawDolphin(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-b", "#7affd4");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.4, accent, 0.24);
      // fluke
      ctx.fillStyle = mixColor(ink, "#102028", 0.35);
      ctx.beginPath();
      ctx.moveTo(-s * 1.05, 0);
      ctx.quadraticCurveTo(-s * 1.7, -s * 0.65, -s * 2.05, -s * 0.12);
      ctx.quadraticCurveTo(-s * 1.45, 0, -s * 2.05, s * 0.12);
      ctx.quadraticCurveTo(-s * 1.7, s * 0.65, -s * 1.05, 0);
      ctx.fill();
      const bodyG = ctx.createLinearGradient(0, -s, 0, s);
      bodyG.addColorStop(0, mixColor(ink, "#ffffff", 0.5));
      bodyG.addColorStop(0.4, mixColor(ink, accent, 0.2));
      bodyG.addColorStop(1, mixColor(ink, "#102028", 0.4));
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.moveTo(s * 1.35, 0);
      ctx.bezierCurveTo(s * 0.7, -s * 0.75, -s * 0.4, -s * 0.7, -s * 1.15, 0);
      ctx.bezierCurveTo(-s * 0.4, s * 0.7, s * 0.7, s * 0.75, s * 1.35, 0);
      ctx.fill();
      // belly
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.ellipse(s * 0.15, s * 0.22, s * 0.75, s * 0.32, 0.08, 0, Math.PI);
      ctx.fill();
      // dorsal
      ctx.fillStyle = mixColor(ink, "#102028", 0.3);
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.45);
      ctx.quadraticCurveTo(s * 0.05, -s * 1.25 - Math.sin(wob) * s * 0.05, s * 0.45, -s * 0.35);
      ctx.closePath();
      ctx.fill();
      // pectoral
      ctx.beginPath();
      ctx.moveTo(s * 0.1, s * 0.25);
      ctx.quadraticCurveTo(s * 0.05, s * 0.95, -s * 0.35, s * 0.45);
      ctx.closePath();
      ctx.fill();
      // snout + smile
      ctx.fillStyle = mixColor(ink, accent, 0.15);
      ctx.beginPath();
      ctx.ellipse(s * 1.05, s * 0.05, s * 0.42, s * 0.2, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = mixColor(ink, "#102028", 0.45);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(s * 1.05, s * 0.08, s * 0.22, 0.15, Math.PI - 0.15);
      ctx.stroke();
      eye(s * 0.55, -s * 0.18, s * 0.16, { angry: false, lookX: s * 0.05 });
      ctx.restore();
    }

    function drawSeal(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = mixColor(cssVar("--accent-b", "#7affd4"), "#b8dcff", 0.35);
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.2, accent, 0.2);
      ctx.fillStyle = mixColor(ink, "#102028", 0.4);
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, 0);
      ctx.quadraticCurveTo(-s * 1.55, -s * 0.55, -s * 1.85, -s * 0.05);
      ctx.quadraticCurveTo(-s * 1.35, 0.05 * s, -s * 1.85, s * 0.12);
      ctx.quadraticCurveTo(-s * 1.55, s * 0.55, -s * 0.95, 0);
      ctx.fill();
      const bodyG = ctx.createLinearGradient(0, -s, 0, s);
      bodyG.addColorStop(0, mixColor(ink, "#ffffff", 0.42));
      bodyG.addColorStop(0.55, mixColor(ink, accent, 0.18));
      bodyG.addColorStop(1, mixColor(ink, "#182028", 0.45));
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.2, s * 0.72, 0.05 * Math.sin(wob), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.beginPath();
      ctx.ellipse(s * 0.1, s * 0.2, s * 0.7, s * 0.28, 0.1, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = mixColor(ink, accent, 0.2);
      ctx.beginPath();
      ctx.ellipse(s * 0.95, 0.02 * s, s * 0.38, s * 0.22, 0.12, 0, Math.PI * 2);
      ctx.fill();
      eye(s * 0.42, -s * 0.16, s * 0.15, { angry: false, lookX: s * 0.04 });
      ctx.restore();
    }

    function drawLantern(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--gold", "#ffe898");
      const foam = cssVar("--foam", "#fffdf8");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.5, accent, 0.28);
      softGlow(s * 1.05, -s * 0.55, s * 0.7, foam, 0.55);
      ctx.strokeStyle = mixColor(ink, accent, 0.55);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(s * 0.25, -s * 0.35);
      ctx.quadraticCurveTo(s * 0.7, -s * 1.05, s * 1.05, -s * 0.55);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(s * 1.05, -s * 0.55, s * 0.24 + Math.sin(wob) * s * 0.02, 0, Math.PI * 2);
      ctx.fill();
      const bodyG = ctx.createRadialGradient(-s * 0.1, 0, s * 0.1, 0, 0, s);
      bodyG.addColorStop(0, mixColor(ink, foam, 0.4));
      bodyG.addColorStop(0.55, mixColor(ink, accent, 0.2));
      bodyG.addColorStop(1, mixColor(ink, "#101820", 0.45));
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.95, s * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      eye(s * 0.28, -s * 0.12, s * 0.14, { angry: false, lookX: s * 0.04 });
      ctx.restore();
    }

    function drawStarfish(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-a", "#ff9a62");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim + wob * 0.08);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.3, accent, 0.24);
      const arms = 5;
      for (let i = 0; i < arms; i += 1) {
        const a = (i / arms) * Math.PI * 2 - Math.PI / 2;
        const len = s * (1.35 + 0.08 * Math.sin(wob + i));
        const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
        grad.addColorStop(0, mixColor(ink, "#ffffff", 0.4));
        grad.addColorStop(0.45, mixColor(ink, accent, 0.3));
        grad.addColorStop(1, mixColor(ink, "#401810", 0.4));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.45) * s * 0.35, Math.sin(a - 0.45) * s * 0.35);
        ctx.quadraticCurveTo(
          Math.cos(a - 0.22) * len * 0.7,
          Math.sin(a - 0.22) * len * 0.7,
          Math.cos(a) * len,
          Math.sin(a) * len
        );
        ctx.quadraticCurveTo(
          Math.cos(a + 0.22) * len * 0.7,
          Math.sin(a + 0.22) * len * 0.7,
          Math.cos(a + 0.45) * s * 0.35,
          Math.sin(a + 0.45) * s * 0.35
        );
        ctx.closePath();
        ctx.fill();
        // arm ridges
        ctx.strokeStyle = mixColor(ink, "#ffffff", 0.25);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3);
        ctx.lineTo(Math.cos(a) * len * 0.85, Math.sin(a) * len * 0.85);
        ctx.stroke();
        // tip sucker bumps
        for (let k = 0; k < 3; k += 1) {
          const t = 0.4 + k * 0.18;
          ctx.fillStyle = mixColor(accent, "#fff0e0", 0.35);
          ctx.beginPath();
          ctx.arc(Math.cos(a) * len * t, Math.sin(a) * len * t, s * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const disc = ctx.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.05, 0, 0, s * 0.55);
      disc.addColorStop(0, mixColor(ink, "#ffffff", 0.55));
      disc.addColorStop(0.5, mixColor(ink, accent, 0.25));
      disc.addColorStop(1, mixColor(ink, "#301808", 0.35));
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.52, 0, Math.PI * 2);
      ctx.fill();
      speckles(8, mixColor(ink, "#ffffff", 0.2), s * 0.06, s * 0.045, s * 0.32);
      heroEyes(s * 0.7, wob, alpha, 0);
      ctx.restore();
    }

    function drawWhale(body, alpha = 1) {
      const ink = api.lifeInkColor();
      const accent = cssVar("--accent-b", "#7affd4");
      const aim = body.aim ?? -Math.PI / 2;
      const s = body.r;
      const wob = body.wobble || 0;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(aim);
      ctx.globalAlpha = alpha;
      softGlow(0, 0, s * 2.5, accent, 0.2);
      // spout spray
      ctx.strokeStyle = mixColor(accent, "#ffffff", 0.45);
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = alpha * 0.55;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(s * 0.15, -s * 0.55);
        ctx.quadraticCurveTo(s * (0.2 + i * 0.25), -s * (1.1 + Math.sin(wob + i) * 0.1), s * (0.05 + i * 0.35), -s * 1.45);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      const bodyG = ctx.createLinearGradient(0, -s, 0, s);
      bodyG.addColorStop(0, mixColor(ink, "#ffffff", 0.45));
      bodyG.addColorStop(0.45, mixColor(ink, accent, 0.2));
      bodyG.addColorStop(1, mixColor(ink, "#102028", 0.4));
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.45, s * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.ellipse(s * 0.1, s * 0.28, s * 0.9, s * 0.4, 0.1, 0, Math.PI);
      ctx.fill();
      // barnacle spots
      speckles(5, mixColor(ink, "#ffffff", 0.18), s * 0.08, s * 0.06, s * 0.55);
      // pectoral fin
      ctx.fillStyle = mixColor(ink, "#102028", 0.3);
      ctx.beginPath();
      ctx.moveTo(s * 0.1, s * 0.25);
      ctx.quadraticCurveTo(s * 0.0, s * 1.05, -s * 0.45, s * 0.5);
      ctx.closePath();
      ctx.fill();
      // fluke
      ctx.fillStyle = mixColor(ink, "#102028", 0.35);
      ctx.beginPath();
      ctx.moveTo(-s * 1.2, 0);
      ctx.quadraticCurveTo(-s * 1.9, -s * 0.7, -s * 2.2, -s * 0.15);
      ctx.quadraticCurveTo(-s * 1.6, 0, -s * 2.2, s * 0.15);
      ctx.quadraticCurveTo(-s * 1.9, s * 0.7, -s * 1.2, 0);
      ctx.fill();
      // spout hint
      ctx.strokeStyle = mixColor(accent, "#ffffff", 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.55, -s * 0.55);
      ctx.quadraticCurveTo(s * 0.7, -s * 1.0 - Math.sin(wob) * s * 0.1, s * 0.55, -s * 1.25);
      ctx.stroke();
      heroEyes(s, wob, alpha, -s * 0.15);
      ctx.restore();
    }

    return {
      use,
      drawLightOrb,
      drawSpark,
      drawEvilFish,
      drawDartHunter,
      drawJellyHunter,
      drawEelHunter,
      drawSharkHunter,
      drawRayHunter,
      drawGhostHunter,
      drawCrabHunter,
      drawUrchinHunter,
      drawMirrorHunter,
      drawBossHunter,
      drawInkPolyp,
      drawJellyfish,
      drawTurtle,
      drawCrab,
      drawManta,
      drawAngler,
      drawNautilus,
      drawSubmarine,
      drawEel,
      drawSquid,
      drawSeahorse,
      drawWhale,
      drawDolphin,
      drawSeal,
      drawLantern,
      drawStarfish,
      eye,
    };
  }

  root.OttiskArtFactory = createArt;
})(typeof globalThis !== "undefined" ? globalThis : window);
