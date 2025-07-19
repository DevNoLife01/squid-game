"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"
import { Sword, Shield } from "lucide-react"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

interface SquidGameProps {
  onGameEnd: (survived: boolean) => void
  player: Player
}

export function SquidGame({ onGameEnd, player }: SquidGameProps) {
  const [playerHealth, setPlayerHealth] = useState(100)
  const [opponentHealth, setOpponentHealth] = useState(100)
  const [message, setMessage] = useState("The Final Game Begins!")
  const [isEliminated, setIsEliminated] = useState(player.isEliminated)
  const [gamePhase, setGamePhase] = useState<"waiting" | "playing" | "finished">("waiting")
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)
  const [playerAction, setPlayerAction] = useState<"attack" | "defend" | null>(null)
  const [opponentAction, setOpponentAction] = useState<"attack" | "defend" | null>(null)

  const playSound = (src: string) => {
    const audio = new Audio(src)
    audio.volume = 0.5
    audio.play().catch((e) => console.log("Audio play failed:", e))
  }

  useEffect(() => {
    if (playerHealth <= 0 && gamePhase === "playing") {
      setMessage("You were defeated! ELIMINATED.")
      setIsEliminated(true)
      setGamePhase("finished")
      playSound("/elimination-sound.mp3")
    } else if (opponentHealth <= 0 && gamePhase === "playing") {
      setMessage("VICTORY! You won the Squid Game!")
      setCoins((prev) => prev + 1000) // Grand prize!
      setGamePhase("finished")
      playSound("/win-sound.mp3")
    }
  }, [playerHealth, opponentHealth, gamePhase, setCoins])

  const startGame = () => {
    setPlayerHealth(100)
    setOpponentHealth(100)
    setMessage("Choose your move!")
    setIsEliminated(false)
    setPlayerAction(null)
    setOpponentAction(null)
    setGamePhase("playing")
  }

  const handlePlayerMove = (action: "attack" | "defend") => {
    if (gamePhase !== "playing" || isEliminated) return

    setPlayerAction(action)
    const randomOpponentAction = Math.random() > 0.5 ? "attack" : "defend"
    setOpponentAction(randomOpponentAction)

    setTimeout(() => {
      let newPlayerHealth = playerHealth
      let newOpponentHealth = opponentHealth
      let roundMessage = ""

      if (action === "attack" && randomOpponentAction === "defend") {
        roundMessage = "You attacked, opponent defended. No damage."
      } else if (action === "defend" && randomOpponentAction === "attack") {
        roundMessage = "You defended, opponent attacked. No damage."
      } else if (action === "attack" && randomOpponentAction === "attack") {
        const damage = Math.floor(Math.random() * 20) + 10 // 10-30 damage
        newOpponentHealth = Math.max(0, opponentHealth - damage)
        newPlayerHealth = Math.max(0, playerHealth - damage) // Both take damage
        roundMessage = `Both attacked! You took ${damage} damage, opponent took ${damage} damage.`
        playSound("/hit-sound.mp3")
      } else if (action === "defend" && randomOpponentAction === "defend") {
        roundMessage = "Both defended. Nothing happened."
      }

      setPlayerHealth(newPlayerHealth)
      setOpponentHealth(newOpponentHealth)
      setMessage(roundMessage)
      setPlayerAction(null)
      setOpponentAction(null)
    }, 1500) // Simulate combat delay
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
        {message || "The Final Squid Game"}
      </h2>

      <div className="flex justify-around w-full max-w-2xl mb-8">
        <div className="flex flex-col items-center">
          <h3 className="text-2xl font-bold text-squidGreen mb-2">Your Health</h3>
          <Progress value={playerHealth} className="w-48 h-6 bg-squidGray/50 [&>*]:bg-squidGreen" />
          <span className="text-xl mt-2">{playerHealth}%</span>
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-2xl font-bold text-squidRed mb-2">Opponent Health</h3>
          <Progress value={opponentHealth} className="w-48 h-6 bg-squidGray/50 [&>*]:bg-squidRed" />
          <span className="text-xl mt-2">{opponentHealth}%</span>
        </div>
      </div>

      {gamePhase === "waiting" && (
        <Button
          onClick={startGame}
          className="bg-squidRed hover:bg-squidRed/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
        >
          Start Final Game
        </Button>
      )}

      {gamePhase === "playing" && !isEliminated && (
        <div className="flex space-x-8 mt-8">
          <Button
            onClick={() => handlePlayerMove("attack")}
            disabled={playerAction !== null}
            className={cn(
              "bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300 flex items-center space-x-2",
              playerAction === "attack" && "scale-105 ring-4 ring-squidGreen",
            )}
          >
            <Sword className="w-8 h-8" />
            <span>Attack</span>
          </Button>
          <Button
            onClick={() => handlePlayerMove("defend")}
            disabled={playerAction !== null}
            className={cn(
              "bg-squidPink hover:bg-squidPink/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300 flex items-center space-x-2",
              playerAction === "defend" && "scale-105 ring-4 ring-squidPink",
            )}
          >
            <Shield className="w-8 h-8" />
            <span>Defend</span>
          </Button>
        </div>
      )}

      {gamePhase === "finished" && (
        <Button
          onClick={() => onGameEnd(!isEliminated)}
          className="bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
        >
          {isEliminated ? "Return to Lobby" : "Claim Your Prize!"}
        </Button>
      )}
    </div>
  )
}
