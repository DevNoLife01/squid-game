"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"

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
      layout.push(Math.random() > 0.5) // true = left panel safe, false = right panel safe
    }
    setBridgeLayout(layout)
    console.log("Bridge layout:", layout) // For debugging
  }

  const handlePanelClick = (panelIndex: number) => {
    if (gamePhase !== "playing" || isEliminated || selectedPanel !== null) return

    setSelectedPanel(panelIndex)
    setMessage("🔍 Testing the glass...")

    setTimeout(() => {
      // panelIndex: 0 = left, 1 = right
      // bridgeLayout[currentStep]: true = left safe, false = right safe
      const isSafe = (panelIndex === 0 && bridgeLayout[currentStep]) || (panelIndex === 1 && !bridgeLayout[currentStep])

      if (isSafe) {
        setMessage("✅ Safe! The glass holds. Proceed to the next step.")
        setCurrentStep((prev) => prev + 1)
        setSelectedPanel(null)

        if (currentStep + 1 >= NUM_STEPS) {
          setMessage("🎉 SUCCESS! You crossed the Glass Bridge!")
          setCoins((prev) => prev + 300)
          setGamePhase("finished")
          setTimeout(() => onGameEnd(true), 1500)
        } else {
          setTimeout(() => {
            setMessage("🤔 Choose your next panel wisely...")
          }, 1500)
        }
      } else {
        setMessage("💥 CRASH! The glass shattered! You fell.")
        setIsEliminated(true)
        setGamePhase("finished")
        setTimeout(() => onGameEnd(false), 1500)
      }
    }, 2000) // 2 second suspense
  }

  const startGame = () => {
    generateBridge()
    setCurrentStep(0)
    setMessage("Choose your path wisely.")
    setIsEliminated(false)
    setSelectedPanel(null)
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
          <div className="space-y-6">
            <div className="text-center text-2xl font-bold text-squidPink">
              🌉 Step {currentStep + 1} of {NUM_STEPS}
            </div>
            <div className="flex space-x-6 justify-center">
              <Button
                onClick={() => handlePanelClick(0)}
                disabled={selectedPanel !== null}
                className={cn(
                  "relative w-32 h-32 md:w-40 md:h-40 text-xl font-bold rounded-xl transition-all duration-300 flex flex-col items-center justify-center",
                  "border-4 border-squidPink/50 shadow-xl",
                  selectedPanel === 0 && "scale-110 ring-4 ring-squidPink animate-pulse",
                  selectedPanel === 0 && bridgeLayout[currentStep] && "bg-squidGreen/20 border-squidGreen",
                  selectedPanel === 0 && !bridgeLayout[currentStep] && "bg-squidRed/20 border-squidRed",
                )}
                variant="ghost"
              >
                <div className="text-4xl mb-2">⬅️</div>
                <div>Left Panel</div>
                {selectedPanel === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {bridgeLayout[currentStep] ? (
                      <div className="text-6xl animate-bounce">✅</div>
                    ) : (
                      <div className="text-6xl animate-pulse">💥</div>
                    )}
                  </div>
                )}
              </Button>

              <Button
                onClick={() => handlePanelClick(1)}
                disabled={selectedPanel !== null}
                className={cn(
                  "relative w-32 h-32 md:w-40 md:h-40 text-xl font-bold rounded-xl transition-all duration-300 flex flex-col items-center justify-center",
                  "border-4 border-squidPink/50 shadow-xl",
                  selectedPanel === 1 && "scale-110 ring-4 ring-squidPink animate-pulse",
                  selectedPanel === 1 && !bridgeLayout[currentStep] && "bg-squidGreen/20 border-squidGreen",
                  selectedPanel === 1 && bridgeLayout[currentStep] && "bg-squidRed/20 border-squidRed",
                )}
                variant="ghost"
              >
                <div className="text-4xl mb-2">➡️</div>
                <div>Right Panel</div>
                {selectedPanel === 1 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {!bridgeLayout[currentStep] ? (
                      <div className="text-6xl animate-bounce">✅</div>
                    ) : (
                      <div className="text-6xl animate-pulse">💥</div>
                    )}
                  </div>
                )}
              </Button>
            </div>
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
