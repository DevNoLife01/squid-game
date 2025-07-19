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

interface TugOfWarProps {
  onGameEnd: (survived: boolean) => void
  player: Player
}

export function TugOfWar({ onGameEnd, player }: TugOfWarProps) {
  const [playerStrength, setPlayerStrength] = useState(0)
  const [opponentStrength, setOpponentStrength] = useState(0)
  const [timer, setTimer] = useState(20) // 20 seconds for the round
  const [gamePhase, setGamePhase] = useState<"waiting" | "playing" | "finished">("waiting")
  const [message, setMessage] = useState("")
  const [isEliminated, setIsEliminated] = useState(player.isEliminated)
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)

  const clickCount = useRef(0)
  const opponentIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const gameTimerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const playSound = (src: string) => {
    const audio = new Audio(src)
    audio.volume = 0.5
    audio.play().catch((e) => console.log("Audio play failed:", e))
  }

  useEffect(() => {
    if (isEliminated) {
      setMessage("💀 ELIMINATED!")
      onGameEnd(false)
      return
    }

    if (gamePhase === "playing") {
      // Game timer
      gameTimerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(gameTimerIntervalRef.current!)
            // Check who won based on strength
            if (playerStrength > opponentStrength) {
              setMessage("🎉 VICTORY! You pulled them over!")
              setCoins((prev) => prev + 200)
              onGameEnd(true)
            } else {
              setMessage("💀 DEFEAT! You were pulled over.")
              setIsEliminated(true)
              onGameEnd(false)
            }
            setGamePhase("finished")
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Opponent AI - gets stronger over time but player can overcome with rapid clicking
      opponentIntervalRef.current = setInterval(() => {
        setOpponentStrength((prev) => {
          const increase = Math.random() * 3 + 1 // 1-4 strength per interval
          const newStrength = Math.min(prev + increase, 100)

          // Check for immediate win conditions
          if (newStrength >= 100 && playerStrength < 100) {
            setTimeout(() => {
              setMessage("💀 DEFEAT! You were pulled over.")
              setIsEliminated(true)
              setGamePhase("finished")
            }, 100)
          }

          return newStrength
        })
      }, 800) // Opponent pulls every 0.8 seconds
    }

    return () => {
      if (opponentIntervalRef.current) clearInterval(opponentIntervalRef.current)
      if (gameTimerIntervalRef.current) clearInterval(gameTimerIntervalRef.current)
    }
  }, [gamePhase, isEliminated, onGameEnd, setCoins, playerStrength])

  // Separate effect to check for player victory
  useEffect(() => {
    if (playerStrength >= 100 && gamePhase === "playing") {
      setMessage("🎉 VICTORY! You pulled them over!")
      setCoins((prev) => prev + 200)
      setGamePhase("finished")
      setTimeout(() => onGameEnd(true), 1000)
    }
  }, [playerStrength, gamePhase, onGameEnd, setCoins])

  const handlePull = () => {
    if (gamePhase !== "playing" || isEliminated) return

    setPlayerStrength((prev) => {
      const increase = Math.random() * 8 + 4 // 4-12 strength per click
      return Math.min(prev + increase, 100)
    })

    // Reduce opponent strength slightly when player pulls hard
    setOpponentStrength((prev) => Math.max(prev - 1, 0))
  }

  const startGame = () => {
    setPlayerStrength(0)
    setOpponentStrength(0)
    setTimer(20)
    setIsEliminated(false)
    setMessage("")
    clickCount.current = 0
    setGamePhase("playing")
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
        {message || "Tug of War: Pull to Survive!"}
      </h2>

      <div className="w-full max-w-2xl space-y-6 mb-8">
        <div className="flex items-center justify-between text-xl font-bold text-squidGreen">
          <span>Your Team</span>
          <span>{playerStrength.toFixed(0)}%</span>
        </div>
        <Progress value={playerStrength} className="w-full h-6 bg-squidGray/50 [&>*]:bg-squidGreen" />

        <div className="flex items-center justify-between text-xl font-bold text-squidRed">
          <span>Opponent Team</span>
          <span>{opponentStrength.toFixed(0)}%</span>
        </div>
        <Progress value={opponentStrength} className="w-full h-6 bg-squidGray/50 [&>*]:bg-squidRed" />
      </div>

      {gamePhase === "waiting" && (
        <Button
          onClick={startGame}
          className="bg-squidRed hover:bg-squidRed/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
        >
          Start Tug of War
        </Button>
      )}

      {gamePhase === "playing" && !isEliminated && (
        <Button
          onClick={handlePull}
          className={cn(
            "bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300",
            "active:scale-95", // Visual feedback on click
          )}
        >
          PULL! (Click Rapidly)
        </Button>
      )}

      {gamePhase === "finished" && (
        <Button
          onClick={() => onGameEnd(playerStrength >= 100)}
          className="bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
        >
          Continue
        </Button>
      )}
    </div>
  )
}
