"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

interface RedLightGreenLightProps {
  onGameEnd: (survived: boolean) => void
  player: Player
}

export function RedLightGreenLight({ onGameEnd, player }: RedLightGreenLightProps) {
  const [gamePhase, setGamePhase] = useState<"waiting" | "green" | "red" | "finished">("waiting")
  const [timer, setTimer] = useState(30) // Total game time
  const [roundTimer, setRoundTimer] = useState(0) // Timer for current green/red phase
  const [progress, setProgress] = useState(0) // Player's progress across the field
  const [isMoving, setIsMoving] = useState(false)
  const [isEliminated, setIsEliminated] = useState(player.isEliminated)
  const [message, setMessage] = useState("")
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)

  const dollRef = useRef<HTMLDivElement>(null)
  const eliminationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isEliminated) {
      setMessage("ELIMINATED!")
      onGameEnd(false)
      if (dollRef.current) {
        dollRef.current.style.animation = "none" // Stop doll animation on elimination
      }
      return
    }

    if (gamePhase === "finished") {
      setMessage("SAFE! You crossed the line.")
      setCoins((prev) => prev + 100) // Reward for surviving
      onGameEnd(true)
      return
    }

    let gameInterval: NodeJS.Timeout | null = null
    if (gamePhase !== "waiting") {
      gameInterval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(gameInterval!)
            if (progress < 100) {
              setIsEliminated(true) // Time ran out, not at finish line
            } else {
              setGamePhase("finished")
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (gameInterval) clearInterval(gameInterval)
    }
  }, [gamePhase, timer, progress, isEliminated, onGameEnd, setCoins])

  useEffect(() => {
    if (gamePhase === "waiting" || isEliminated) return

    let phaseInterval: NodeJS.Timeout | null = null

    const startPhase = () => {
      const isGreen = Math.random() > 0.4 // 60% chance for green light
      const phaseDuration = Math.floor(Math.random() * 4) + 2 // 2-5 seconds

      setGamePhase(isGreen ? "green" : "red")
      setRoundTimer(phaseDuration)
      setMessage(isGreen ? "🟢 GREEN LIGHT! MOVE!" : "🔴 RED LIGHT! STOP!")

      let currentPhaseTime = phaseDuration
      phaseInterval = setInterval(() => {
        currentPhaseTime -= 1
        setRoundTimer(currentPhaseTime)

        if (currentPhaseTime <= 0) {
          clearInterval(phaseInterval!)
          // Check for elimination before switching phases
          if (gamePhase === "red" && isMoving) {
            setIsEliminated(true)
            return
          }
          startPhase() // Start next phase
        }
      }, 1000)
    }

    startPhase() // Initial phase start

    return () => {
      if (phaseInterval) clearInterval(phaseInterval)
    }
  }, [gamePhase === "waiting", isEliminated]) // Only depend on waiting state and elimination

  // Separate effect for movement progress
  useEffect(() => {
    if (isMoving && gamePhase === "green" && progress < 100 && !isEliminated) {
      const moveInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = Math.min(prev + 2, 100)
          if (newProgress >= 100) {
            setGamePhase("finished")
          }
          return newProgress
        })
      }, 100) // Update every 100ms for smooth progress
      return () => clearInterval(moveInterval)
    }
  }, [isMoving, gamePhase, progress, isEliminated])

  const handleMoveStart = () => {
    if (isEliminated || gamePhase === "waiting" || gamePhase === "finished") return
    setIsMoving(true)
    if (gamePhase === "red") {
      // Immediate elimination for moving during red light
      setTimeout(() => {
        setIsEliminated(true)
      }, 200) // Small delay to show the action
    }
  }

  const handleMoveEnd = () => {
    if (eliminationTimeoutRef.current) {
      clearTimeout(eliminationTimeoutRef.current)
      eliminationTimeoutRef.current = null
    }
    setIsMoving(false)
  }

  useEffect(() => {
    if (isMoving && gamePhase === "green" && progress < 100) {
      const moveInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 100))
      }, 50) // Increase progress faster
      return () => clearInterval(moveInterval)
    }
  }, [isMoving, gamePhase, progress])

  useEffect(() => {
    if (progress >= 100 && gamePhase !== "finished") {
      setGamePhase("finished")
    }
  }, [progress, gamePhase])

  const startGame = () => {
    setGamePhase("green") // Start with green light
    setTimer(30)
    setProgress(0)
    setIsEliminated(false)
    setMessage("")
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

      <div className="relative w-full max-w-4xl h-64 bg-gradient-to-r from-squidGreen/20 to-squidRed/20 rounded-lg overflow-hidden mb-8 border-2 border-squidPink/50 shadow-lg shadow-squidPink/20">
        <div
          ref={dollRef}
          className={cn(
            "absolute top-0 right-0 w-24 h-full bg-squidGray flex items-center justify-center text-5xl rounded-l-full transition-transform duration-500",
            gamePhase === "green" ? "animate-doll-scan" : "",
          )}
          style={{ transform: gamePhase === "red" ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          👧
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <Progress value={progress} className="w-full h-4 bg-squidGray/50 [&>*]:bg-squidGreen" />
          <div className="text-center mt-2 text-sm text-squidLightGray">Progress: {progress}%</div>
        </div>
      </div>

      <h2 className="text-5xl font-bold mb-8 text-center text-white drop-shadow-lg">
        {message || "Red Light, Green Light"}
      </h2>

      <div className="text-3xl font-mono text-squidPink mb-8">
        {gamePhase !== "waiting" && gamePhase !== "finished" && `Phase Timer: ${roundTimer}s`}
      </div>

      {gamePhase === "waiting" && (
        <Button
          onClick={startGame}
          className="bg-squidRed hover:bg-squidRed/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
        >
          Start Round
        </Button>
      )}

      {gamePhase !== "waiting" && gamePhase !== "finished" && !isEliminated && (
        <Button
          onMouseDown={handleMoveStart}
          onMouseUp={handleMoveEnd}
          onTouchStart={handleMoveStart}
          onTouchEnd={handleMoveEnd}
          className={cn(
            "bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300",
            isMoving && "scale-105 shadow-lg shadow-squidGreen/50",
          )}
        >
          {isMoving ? "RUNNING..." : "HOLD TO RUN"}
        </Button>
      )}

      {gamePhase === "finished" && (
        <Button
          onClick={() => onGameEnd(true)}
          className="bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
        >
          Continue
        </Button>
      )}
    </div>
  )
}
