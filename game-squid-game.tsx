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
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [combatLog, setCombatLog] = useState<string[]>([])
  const [actionLocked, setActionLocked] = useState(false)

  const playSound = (src: string) => {
    const audio = new Audio(src)
    audio.volume = 0.5
    audio.play().catch((e) => console.log("Audio play failed:", e))
  }

  useEffect(() => {
    if (playerHealth <= 0 && gamePhase === "playing") {
      setMessage("💀 You were defeated! ELIMINATED.")
      setIsEliminated(true)
      setGamePhase("finished")
      setTimeout(() => onGameEnd(false), 2000)
    } else if (opponentHealth <= 0 && gamePhase === "playing") {
      setMessage("🏆 VICTORY! You won the Squid Game!")
      setCoins((prev) => prev + 1000)
      setGamePhase("finished")
      setTimeout(() => onGameEnd(true), 2000)
    }
  }, [playerHealth, opponentHealth, gamePhase, setCoins, onGameEnd])

  const handlePlayerMove = (action: "attack" | "defend") => {
    if (gamePhase !== "playing" || isEliminated || actionLocked || !isPlayerTurn) return

    setActionLocked(true)
    setPlayerAction(action)
    setIsPlayerTurn(false)

    // Generate opponent action with some strategy
    const opponentActions = ["attack", "defend"]
    const opponentWeights = playerHealth < 30 ? [0.8, 0.2] : [0.6, 0.4] // More aggressive when player is weak
    const randomOpponentAction = Math.random() < opponentWeights[0] ? "attack" : "defend"
    setOpponentAction(randomOpponentAction)

    setTimeout(() => {
      let newPlayerHealth = playerHealth
      let newOpponentHealth = opponentHealth
      let roundMessage = ""
      let logEntry = ""

      if (action === "attack" && randomOpponentAction === "defend") {
        const damage = Math.floor(Math.random() * 15) + 10 // 10-25 damage
        newOpponentHealth = Math.max(0, opponentHealth - damage)
        roundMessage = `⚔️ Your attack hits! Opponent takes ${damage} damage.`
        logEntry = `You attacked, opponent defended. Opponent -${damage} HP`
      } else if (action === "defend" && randomOpponentAction === "attack") {
        const damage = Math.floor(Math.random() * 8) + 3 // 3-10 reduced damage
        newPlayerHealth = Math.max(0, playerHealth - damage)
        roundMessage = `🛡️ You defended! Reduced damage: ${damage}.`
        logEntry = `You defended, opponent attacked. You -${damage} HP (reduced)`
      } else if (action === "attack" && randomOpponentAction === "attack") {
        const playerDamage = Math.floor(Math.random() * 20) + 15 // 15-35 damage
        const opponentDamage = Math.floor(Math.random() * 20) + 15
        newOpponentHealth = Math.max(0, opponentHealth - playerDamage)
        newPlayerHealth = Math.max(0, playerHealth - opponentDamage)
        roundMessage = `💥 Both attacked! You deal ${playerDamage}, take ${opponentDamage} damage.`
        logEntry = `Both attacked. You -${opponentDamage} HP, Opponent -${playerDamage} HP`
      } else if (action === "defend" && randomOpponentAction === "defend") {
        roundMessage = "🤝 Both defended. Stalemate - no damage dealt."
        logEntry = "Both defended. No damage."
      }

      setPlayerHealth(newPlayerHealth)
      setOpponentHealth(newOpponentHealth)
      setMessage(roundMessage)
      setCombatLog((prev) => [...prev.slice(-4), logEntry]) // Keep last 5 entries

      setTimeout(() => {
        setPlayerAction(null)
        setOpponentAction(null)
        setActionLocked(false)
        setIsPlayerTurn(true)
        if (newPlayerHealth > 0 && newOpponentHealth > 0) {
          setMessage("🎯 Choose your next move!")
        }
      }, 2000)
    }, 1500)
  }

  const startGame = () => {
    setPlayerHealth(100)
    setOpponentHealth(100)
    setMessage("⚔️ Choose your move!")
    setIsEliminated(false)
    setPlayerAction(null)
    setOpponentAction(null)
    setGamePhase("playing")
    setIsPlayerTurn(true)
    setActionLocked(false)
    setCombatLog([])
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

      {gamePhase === "playing" && (
        <div className="w-full max-w-2xl mb-6">
          <h3 className="text-xl font-bold text-squidPink mb-2 text-center">📜 Combat Log</h3>
          <div className="bg-squidGray/50 rounded-lg p-4 h-32 overflow-y-auto border border-squidPink/30">
            {combatLog.length === 0 ? (
              <p className="text-squidLightGray/70 text-center">Combat log will appear here...</p>
            ) : (
              combatLog.map((entry, index) => (
                <p key={index} className="text-sm text-squidLightGray mb-1">
                  Round {index + 1}: {entry}
                </p>
              ))
            )}
          </div>
        </div>
      )}

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
            disabled={playerAction !== null || !isPlayerTurn}
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
            disabled={playerAction !== null || !isPlayerTurn}
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
