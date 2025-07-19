"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

interface MarblesProps {
  onGameEnd: (survived: boolean) => void
  player: Player
}

export function Marbles({ onGameEnd, player }: MarblesProps) {
  const [opponentMarbles, setOpponentMarbles] = useState(0)
  const [playerGuess, setPlayerGuess] = useState<"odd" | "even" | null>(null)
  const [message, setMessage] = useState("")
  const [isEliminated, setIsEliminated] = useState(player.isEliminated)
  const [gamePhase, setGamePhase] = useState<"waiting" | "guessing" | "revealing" | "finished">("waiting")
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)

  const playSound = (src: string) => {
    const audio = new Audio(src)
    audio.volume = 0.5
    audio.play().catch((e) => console.log("Audio play failed:", e))
  }

  const [revealPhase, setRevealPhase] = useState(false)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (isEliminated) {
      setMessage("💀 ELIMINATED!")
      onGameEnd(false)
      return
    }

    if (showResult) {
      setTimeout(() => {
        setGamePhase("finished")
      }, 2000)
    }
  }, [isEliminated, onGameEnd, showResult])

  const startGame = () => {
    const randomMarbles = Math.floor(Math.random() * 20) + 1 // 1 to 20 marbles for more challenge
    setOpponentMarbles(randomMarbles)
    setPlayerGuess(null)
    setMessage("🤔 Guess if I have an ODD or EVEN number of marbles.")
    setIsEliminated(false)
    setGamePhase("guessing")
    setRevealPhase(false)
    setShowResult(false)
  }

  const handleGuess = (guess: "odd" | "even") => {
    if (gamePhase !== "guessing") return
    setPlayerGuess(guess)
    setGamePhase("revealing")
    setRevealPhase(true)
    setMessage("🎲 Revealing the marbles...")

    setTimeout(() => {
      const isOpponentEven = opponentMarbles % 2 === 0
      const isCorrect = (guess === "even" && isOpponentEven) || (guess === "odd" && !isOpponentEven)

      if (isCorrect) {
        setMessage(`🎉 Correct! I had ${opponentMarbles} marbles (${isOpponentEven ? "EVEN" : "ODD"}). You win!`)
        setCoins((prev) => prev + 250)
        setShowResult(true)
      } else {
        setMessage(`💀 Incorrect! I had ${opponentMarbles} marbles (${isOpponentEven ? "EVEN" : "ODD"}). You lose.`)
        setIsEliminated(true)
        setShowResult(true)
      }
      setRevealPhase(false)
    }, 3000) // Longer reveal time for suspense
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

      <h2 className="text-5xl font-bold mb-8 text-center text-white drop-shadow-lg">
        {message || "Marbles: Guess Odd or Even"}
      </h2>

      <div className="flex flex-col items-center space-y-6">
        {gamePhase === "waiting" && (
          <Button
            onClick={startGame}
            className="bg-squidRed hover:bg-squidRed/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
          >
            Start Marbles Game
          </Button>
        )}

        {gamePhase === "guessing" && (
          <div className="flex space-x-4">
            <Button
              onClick={() => handleGuess("odd")}
              className="bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
            >
              ODD
            </Button>
            <Button
              onClick={() => handleGuess("even")}
              className="bg-squidPink hover:bg-squidPink/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
            >
              EVEN
            </Button>
          </div>
        )}

        {gamePhase === "revealing" && (
          <div className="text-center animate-bounce-in">
            <div className="text-3xl font-bold text-squidPink animate-pulse mb-4">🎲 Revealing...</div>
            <div className="text-6xl mb-4">
              {Array.from({ length: Math.min(opponentMarbles, 10) }, (_, i) => "🪨").join("")}
              {opponentMarbles > 10 && "..."}
            </div>
            {revealPhase && (
              <div className="text-2xl text-squidGold animate-fade-in">💎 {opponentMarbles} marbles total!</div>
            )}
          </div>
        )}

        {gamePhase === "finished" && (
          <Button
            onClick={() => onGameEnd(!isEliminated)}
            className="bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  )
}
