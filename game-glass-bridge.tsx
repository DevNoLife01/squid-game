"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"
import { X, Check } from "lucide-react"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

interface GlassBridgeProps {
  onGameEnd: (survived: boolean) => void
  player: Player
}

const NUM_STEPS = 5 // Number of steps to cross the bridge

export function GlassBridge({ onGameEnd, player }: GlassBridgeProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [bridgeLayout, setBridgeLayout] = useState<boolean[]>([]) // true for safe, false for shatter
  const [message, setMessage] = useState("")
  const [isEliminated, setIsEliminated] = useState(player.isEliminated)
  const [gamePhase, setGamePhase] = useState<"waiting" | "playing" | "finished">("waiting")
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)
  const [selectedPanel, setSelectedPanel] = useState<number | null>(null) // 0 for left, 1 for right

  const playSound = (src: string) => {
    const audio = new Audio(src)
    audio.volume = 0.5
    audio.play().catch((e) => console.log("Audio play failed:", e))
  }

  useEffect(() => {
    if (isEliminated) {
      setMessage("ELIMINATED!")
      onGameEnd(false)
      return
    }
    if (gamePhase === "finished") {
      setMessage("SUCCESS! You crossed the Glass Bridge!")
      setCoins((prev) => prev + 300)
      onGameEnd(true)
      playSound("/win-sound.mp3")
    }
  }, [isEliminated, gamePhase, onGameEnd, setCoins])

  const generateBridge = () => {
    const layout: boolean[] = []
    for (let i = 0; i < NUM_STEPS; i++) {
      layout.push(Math.random() > 0.5) // Randomly assign safe (true) or shatter (false)
    }
    setBridgeLayout(layout)
  }

  const startGame = () => {
    generateBridge()
    setCurrentStep(0)
    setMessage("Choose your path wisely.")
    setIsEliminated(false)
    setSelectedPanel(null)
    setGamePhase("playing")
  }

  const handlePanelClick = (panelIndex: number) => {
    if (gamePhase !== "playing" || isEliminated || selectedPanel !== null) return

    setSelectedPanel(panelIndex)

    setTimeout(() => {
      const isSafe = bridgeLayout[currentStep] === (panelIndex === 0) // Left panel is safe if bridgeLayout[step] is true, right if false
      if (isSafe) {
        setMessage("Safe! Proceed to the next step.")
        playSound("/glass-safe.mp3")
        setCurrentStep((prev) => prev + 1)
        setSelectedPanel(null)
        if (currentStep + 1 >= NUM_STEPS) {
          setGamePhase("finished")
        }
      } else {
        setMessage("Shattered! You fell.")
        setIsEliminated(true)
        playSound("/glass-shatter.mp3")
        setGamePhase("finished")
      }
    }, 1000) // Simulate a brief delay for the outcome
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
        {message || "Glass Bridge: Choose Your Panel"}
      </h2>

      <div className="flex flex-col items-center space-y-4 w-full max-w-xl">
        <div className="relative w-full h-12 bg-squidGray rounded-full overflow-hidden border-2 border-squidPink/50 shadow-lg shadow-squidPink/20">
          <div
            className="absolute h-full bg-squidGreen transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / NUM_STEPS) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-squidLightGray font-bold">
            Step {currentStep} / {NUM_STEPS}
          </div>
        </div>

        {gamePhase === "waiting" && (
          <Button
            onClick={startGame}
            className="bg-squidRed hover:bg-squidRed/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
          >
            Start Glass Bridge
          </Button>
        )}

        {gamePhase === "playing" && !isEliminated && (
          <div className="flex space-x-4 mt-8">
            <Button
              onClick={() => handlePanelClick(0)}
              disabled={selectedPanel !== null}
              className={cn(
                "relative w-40 h-40 bg-squidGray hover:bg-squidGray/80 text-white font-bold text-2xl rounded-lg transition-all duration-300 flex flex-col items-center justify-center",
                "border-2 border-squidPink/50 shadow-lg shadow-squidPink/20",
                selectedPanel === 0 && "scale-105 ring-4 ring-squidPink",
              )}
            >
              {selectedPanel === 0 && bridgeLayout[currentStep] === true && (
                <Check className="absolute text-squidGreen w-16 h-16 animate-bounce" />
              )}
              {selectedPanel === 0 && bridgeLayout[currentStep] === false && (
                <X className="absolute text-squidRed w-16 h-16 animate-pulse" />
              )}
              Left Panel
            </Button>
            <Button
              onClick={() => handlePanelClick(1)}
              disabled={selectedPanel !== null}
              className={cn(
                "relative w-40 h-40 bg-squidGray hover:bg-squidGray/80 text-white font-bold text-2xl rounded-lg transition-all duration-300 flex flex-col items-center justify-center",
                "border-2 border-squidPink/50 shadow-lg shadow-squidPink/20",
                selectedPanel === 1 && "scale-105 ring-4 ring-squidPink",
              )}
            >
              {selectedPanel === 1 && bridgeLayout[currentStep] === false && (
                <Check className="absolute text-squidGreen w-16 h-16 animate-bounce" />
              )}
              {selectedPanel === 1 && bridgeLayout[currentStep] === true && (
                <X className="absolute text-squidRed w-16 h-16 animate-pulse" />
              )}
              Right Panel
            </Button>
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
