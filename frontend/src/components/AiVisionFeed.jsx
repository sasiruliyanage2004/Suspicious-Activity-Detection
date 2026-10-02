import React, { useRef, useEffect } from 'react'

export default function AiVisionFeed({ 
  camera, 
  seed = 1, 
  filterMode = 'normal', 
  threat = null,
  isExpanded = false,
  className = "w-full h-full object-cover"
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let startTime = Date.now()

    // Deterministic simulation state based on seed
    const isParking = camera?.location?.toLowerCase().includes('parking') || camera?.code === 'CAM-02'
    const isGate = camera?.location?.toLowerCase().includes('entrance') || camera?.location?.toLowerCase().includes('gate') || camera?.code === 'CAM-01'

    // Simulated targets (pedestrians / vehicles)
    const targets = [
      {
        id: (seed * 100) + 1,
        type: isParking ? 'VEHICLE' : 'PERSON',
        baseX: 25,
        baseY: 45,
        speedX: 0.18 + (seed % 3) * 0.05,
        speedY: 0.04,
        width: isParking ? 140 : 48,
        height: isParking ? 80 : 110,
        color: '#00F0FF',
        confidence: 0.94,
        plate: 'WP CAA-9821'
      },
      {
        id: (seed * 100) + 2,
        type: 'PERSON',
        baseX: 65,
        baseY: 52,
        speedX: -0.15 - (seed % 2) * 0.04,
        speedY: 0.02,
        width: 44,
        height: 105,
        color: '#10B981',
        confidence: 0.89,
        backpack: true
      }
    ]

    const resize = () => {
      if (!canvas) return
      canvas.width = canvas.parentElement?.clientWidth || (isExpanded ? 1280 : 640)
      canvas.height = canvas.parentElement?.clientHeight || (isExpanded ? 720 : 360)
    }
    resize()
    window.addEventListener('resize', resize)

    const render = () => {
      const now = Date.now()
      const elapsed = (now - startTime) / 1000
      const width = canvas.width
      const height = canvas.height

      // ── 1. Background Environment (Tactical CCTV Scene) ─────────────
      // Dark surveillance room / outdoor facility lighting
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      if (filterMode === 'ir_green') {
        grad.addColorStop(0, '#021408')
        grad.addColorStop(1, '#052912')
      } else if (filterMode === 'thermal') {
        grad.addColorStop(0, '#0a001a')
        grad.addColorStop(1, '#2d083b')
      } else {
        grad.addColorStop(0, '#080C14')
        grad.addColorStop(1, '#0D131F')
      }
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // Perspective Grid / Facility Architecture
      ctx.strokeStyle = filterMode === 'ir_green' ? 'rgba(0,255,120,0.08)' : filterMode === 'thermal' ? 'rgba(255,100,0,0.08)' : 'rgba(0,240,255,0.07)'
      ctx.lineWidth = 1

      // Horizon & Ground Plane
      const horizonY = height * 0.38
      ctx.beginPath()
      ctx.moveTo(0, horizonY)
      ctx.lineTo(width, horizonY)
      ctx.stroke()

      // Vanishing Perspective Lines
      const vanishingX = width * (0.35 + (seed % 3) * 0.15)
      for (let x = -width * 0.5; x <= width * 1.5; x += width * 0.15) {
        ctx.beginPath()
        ctx.moveTo(vanishingX, horizonY)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // Facility Background Silhouettes (Building pillars, security fence, or gate posts)
      ctx.fillStyle = filterMode === 'ir_green' ? '#041d0b' : filterMode === 'thermal' ? '#1c0326' : '#0B101C'
      // Left pillar / wall
      ctx.fillRect(0, horizonY * 0.4, width * 0.18, height - horizonY * 0.4)
      // Right security gate / barrier
      ctx.fillRect(width * 0.82, horizonY * 0.5, width * 0.18, height - horizonY * 0.5)

      // ── 2. Render Moving Targets & AI YOLO Bounding Boxes ───────────
      targets.forEach((target, i) => {
        // Calculate animated position
        const cycleProgress = (elapsed * target.speedX) % 2
        let normX = cycleProgress > 1 ? 2 - cycleProgress : cycleProgress
        // Scale to canvas area
        const posX = width * (0.2 + normX * 0.55)
        const posY = height * (0.45 + (i * 0.08))

        const boxW = (target.width / 640) * width
        const boxH = (target.height / 360) * height

        // Silhouette of Pedestrian / Object
        ctx.fillStyle = filterMode === 'thermal' ? '#FFA500' : filterMode === 'ir_green' ? 'rgba(0,255,100,0.35)' : 'rgba(20,40,65,0.7)'
        
        if (target.type === 'PERSON') {
          // Head
          const headR = boxW * 0.18
          ctx.beginPath()
          ctx.arc(posX + boxW / 2, posY + headR, headR, 0, Math.PI * 2)
          ctx.fill()
          // Body Torso
          ctx.beginPath()
          ctx.roundRect(posX + boxW * 0.22, posY + headR * 1.8, boxW * 0.56, boxH * 0.5, 4)
          ctx.fill()
          // Legs
          ctx.fillRect(posX + boxW * 0.26, posY + headR * 1.8 + boxH * 0.5, boxW * 0.2, boxH * 0.35)
          ctx.fillRect(posX + boxW * 0.54, posY + headR * 1.8 + boxH * 0.5, boxW * 0.2, boxH * 0.35)
        } else {
          // Vehicle Silhouette
          ctx.beginPath()
          ctx.roundRect(posX, posY + boxH * 0.2, boxW, boxH * 0.75, 8)
          ctx.fill()
          ctx.fillRect(posX + boxW * 0.2, posY, boxW * 0.6, boxH * 0.3)
        }

        // ── 3. High-Tech YOLOv11 Tactical Bounding Box ────────────────
        const hasThreat = threat && (threat.camera_id === camera?.code || threat.camera === camera?.code || i === 0 && threat)
        const boxColor = hasThreat ? '#FF2A42' : (filterMode === 'ir_green' ? '#00FF66' : filterMode === 'thermal' ? '#FFCC00' : '#00F0FF')

        ctx.strokeStyle = boxColor
        ctx.lineWidth = 1.5
        ctx.strokeRect(posX, posY, boxW, boxH)

        // Futuristic Corner Brackets
        const bracketLen = Math.min(boxW * 0.22, 16)
        ctx.lineWidth = 3
        // Top-left
        ctx.beginPath(); ctx.moveTo(posX, posY + bracketLen); ctx.lineTo(posX, posY); ctx.lineTo(posX + bracketLen, posY); ctx.stroke()
        // Top-right
        ctx.beginPath(); ctx.moveTo(posX + boxW - bracketLen, posY); ctx.lineTo(posX + boxW, posY); ctx.lineTo(posX + boxW, posY + bracketLen); ctx.stroke()
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(posX, posY + boxH - bracketLen); ctx.lineTo(posX, posY + boxH); ctx.lineTo(posX + bracketLen, posY + boxH); ctx.stroke()
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(posX + boxW - bracketLen, posY + boxH); ctx.lineTo(posX + boxW, posY + boxH); ctx.lineTo(posX + boxW, posY + boxH - bracketLen); ctx.stroke()

        // Center Crosshair Target
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(posX + boxW / 2 - 4, posY + boxH / 2)
        ctx.lineTo(posX + boxW / 2 + 4, posY + boxH / 2)
        ctx.moveTo(posX + boxW / 2, posY + boxH / 2 - 4)
        ctx.lineTo(posX + boxW / 2, posY + boxH / 2 + 4)
        ctx.stroke()

        // YOLO Label Header Tag
        const labelText = hasThreat 
          ? `🚨 ${threat.label || 'SUSPICIOUS ACTIVITY'} [98.7%]` 
          : `${target.type} [${Math.round(target.confidence * 100)}%] · ID:#${target.id}`
        
        ctx.font = 'bold 9px monospace'
        const textWidth = ctx.measureText(labelText).width
        ctx.fillStyle = hasThreat ? '#FF2A42' : 'rgba(0, 0, 0, 0.85)'
        ctx.fillRect(posX, posY - 15, textWidth + 10, 15)

        ctx.fillStyle = hasThreat ? '#FFFFFF' : boxColor
        ctx.fillText(labelText, posX + 5, posY - 4)

        // License Plate Tag if Vehicle
        if (target.type === 'VEHICLE' && target.plate) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
          ctx.fillRect(posX, posY + boxH + 2, 90, 14)
          ctx.fillStyle = '#FFDD00'
          ctx.fillText(`ALPR: ${target.plate}`, posX + 4, posY + boxH + 12)
        }
      })

      // ── 4. Tactical CCTV HUD On-Screen Display (OSD) ──────────────
      // Live Blinking REC Indicator
      const isBlinkOn = Math.floor(now / 600) % 2 === 0
      ctx.fillStyle = isBlinkOn ? '#FF2A42' : 'rgba(255,42,66,0.2)'
      ctx.beginPath()
      ctx.arc(18, 20, 4.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = 'bold 10px monospace'
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText('REC', 28, 24)

      // Camera Tag & Quality
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.fillText(`${camera?.code || 'CAM-01'} · 1080P 30FPS · H.265`, 60, 24)

      // Live Timestamp (ISO Clock with Milliseconds)
      const dateStr = new Date(now).toISOString().replace('T', ' ').substring(0, 23)
      ctx.fillStyle = '#00F0FF'
      const timeWidth = ctx.measureText(dateStr).width
      ctx.fillText(dateStr, width - timeWidth - 16, 24)

      // Bottom Bar HUD Information
      ctx.font = '9px monospace'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.fillText(`OPTICAL AI: YOLOv11n-CORE · RTSP ONVIF PROFILE S`, 16, height - 12)

      const statusTag = threat ? 'STATUS: ⚠️ THREAT DETECTED' : 'STATUS: 🛡️ PERIMETER SECURE'
      ctx.fillStyle = threat ? '#FF2A42' : '#10B981'
      const statusWidth = ctx.measureText(statusTag).width
      ctx.fillText(statusTag, width - statusWidth - 16, height - 12)

      // ── 5. Scanline Overlay Effect ─────────────────────────────────
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1)
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
    }
  }, [camera, seed, filterMode, threat, isExpanded])

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
