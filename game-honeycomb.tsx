"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

interface HoneycombProps {
  onGameEnd: (survived: boolean) => void
  player: Player
}

const shapes = ["circle", "triangle", "star", "umbrella"]

export function Honeycomb({ onGameEnd, player }: HoneycombProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedShape, setSelectedShape] = useState<string | null>(null)
  const [timer, setTimer] = useState(60) // Time limit for tracing
  const [isTracing, setIsTracing] = useState(false)
  const [isEliminated, setIsEliminated] = useState(player.isEliminated)
  const [message, setMessage] = useState("")
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)
  const [gameStarted, setGameStarted] = useState(false)

  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const tracePoints = useRef<Array<{ x: number; y: number }>>([])
  const shapePath = useRef<Path2D | null>(null) // Store the path for hit testing

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: string) => {
    const centerX = ctx.canvas.width / 2
    const centerY = ctx.canvas.height / 2
    const size = 80

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.strokeStyle = "#FF007F" // Neon pink for the shape outline
    ctx.lineWidth = 4
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    const path = new Path2D()

    switch (shape) {
      case "circle":
        path.arc(centerX, centerY, size, 0, Math.PI * 2)
        break
      case "triangle":
        path.moveTo(centerX, centerY - size)
        path.lineTo(centerX + (size * Math.sqrt(3)) / 2, centerY + size / 2)
        path.lineTo(centerX - (size * Math.sqrt(3)) / 2, centerY + size / 2)
        path.closePath()
        break
      case "star":
        const outerRadius = size
        const innerRadius = size / 2.5
        const numPoints = 5
        for (let i = 0; i < numPoints * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius
          const angle = (Math.PI / numPoints) * i - Math.PI / 2 // Start at top
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          if (i === 0) {
            path.moveTo(x, y)
          } else {
            path.lineTo(x, y)
          }
        }
        path.closePath()
        break
      case "umbrella":
        path.arc(centerX, centerY + size / 4, size, Math.PI, Math.PI * 2) // Top arc
        path.moveTo(centerX - size, centerY + size / 4)
        path.lineTo(centerX - size / 4, centerY + size * 1.5) // Left handle
        path.arc(centerX, centerY + size * 1.5, size / 4, Math.PI, Math.PI * 2) // Handle curve
        path.lineTo(centerX + size / 4, centerY + size * 1.5) // Right handle
        path.lineTo(centerX + size, centerY + size / 4)
        break
    }
    ctx.stroke(path)
    shapePath.current = path // Store the path for hit testing
  }, [])

  const checkTraceAccuracy = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !shapePath.current) return false

    const ctx = canvas.getContext("2d")
    if (!ctx) return false

    // Simple check: ensure most traced points are within the shape
    let insideCount = 0
    const totalPoints = tracePoints.current.length
    if (totalPoints === 0) return false

    for (const point of tracePoints.current) {
      if (ctx.isPointInStroke(shapePath.current, point.x, point.y)) {
        insideCount++
      }
    }
    // Require at least 80% of points to be on the path
    return insideCount / totalPoints > 0.8
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEliminated || !gameStarted) return
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      lastPoint.current = { x, y }
      tracePoints.current = [{ x, y }]
      setIsTracing(true)
    },
    [isEliminated, gameStarted],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isTracing || isEliminated || !gameStarted) return
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (lastPoint.current) {
        ctx.beginPath()
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
        ctx.lineTo(x, y)
        ctx.strokeStyle = "#00A86B" // Green for traced line
        ctx.lineWidth = 6
        ctx.stroke()
        lastPoint.current = { x, y }
        tracePoints.current.push({ x, y })
      }
    },
    [isTracing, isEliminated, gameStarted],
  )

  const handleMouseUp = useCallback(() => {
    setIsTracing(false)
    lastPoint.current = null
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas resolution for crisp drawing
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    if (selectedShape) {
      drawShape(ctx, selectedShape)
    }
  }, [selectedShape, drawShape])

  useEffect(() => {
    if (isEliminated || !gameStarted) return

    let gameInterval: NodeJS.Timeout | null = null
    if (timer > 0) {
      gameInterval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    } else {
      // Time's up! Check accuracy
      const survived = checkTraceAccuracy()
      if (survived) {
        setMessage("SUCCESS! You cut the shape.")
        setCoins((prev) => prev + 150)
        onGameEnd(true)
      } else {
        setIsEliminated(true)
        setMessage("FAILED! Shape broken or time ran out.")
        onGameEnd(false)
      }
    }

    return () => {
      if (gameInterval) clearInterval(gameInterval)
    }
  }, [timer, isEliminated, gameStarted, checkTraceAccuracy, onGameEnd, setCoins])

  const startGame = () => {
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)]
    setSelectedShape(randomShape)
    setTimer(60)
    setIsEliminated(false)
    setMessage("")
    setGameStarted(true)
    tracePoints.current = [] // Clear previous trace
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height) // Clear canvas
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-squidDark text-squidLightGray p-4 overflow-hidden">
      {isEliminated && (
        <div className="absolute inset-0 bg-squidRed/80 flex items-center justify-center z-50 animate-fade-out-up">
          <h2 className="text-6xl font-bold text-white drop-shadow-lg">ELIMINATED</h2>
        </div>
      )}

      <div className="absolute top-4 left-4 text-lg font-mono text-squidGreen">
        Player: #{player.number} {player.name}
      </div>
      <div className="absolute top-4 right-4 text-lg font-mono text-squidPink">Time Left: {timer}s</div>

      <h2 className="text-5xl font-bold mb-8 text-center text-white drop-shadow-lg">
        {message || `Honeycomb: Trace the ${selectedShape || "shape"}`}
      </h2>

      <div className="relative w-96 h-96 bg-squidGray rounded-lg border-2 border-squidPink/50 shadow-lg shadow-squidPink/20 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // End tracing if mouse leaves canvas
          onTouchStart={(e) => handleMouseDown(e as any)} // Cast to any for touch events
          onTouchMove={(e) => handleMouseMove(e as any)}
          onTouchEnd={handleMouseUp}
          onTouchCancel={handleMouseUp}
        />
      </div>

      <div className="w-96 mt-4">
        <Progress value={(timer / 60) * 100} className="w-full h-4 bg-squidGray/50 [&>*]:bg-squidGreen" />
        <div className="text-center mt-2 text-sm text-squidLightGray">Time Progress</div>
      </div>

      {!gameStarted && (
        <Button
          onClick={startGame}
          className="mt-8 bg-squidRed hover:bg-squidRed/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
        >
          Start Honeycomb
        </Button>
      )}
    </div>
  )
}
