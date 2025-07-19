"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"
import { X, Check } from "lucide-react"
import { database, ref, onValue, update } from "@/lib/firebase"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

interface GlassBridgeProps {
  onGameEnd: (survived: boolean) => void
  player: Player
  gameId: string
}

export function GlassBridge({ onGameEnd, player, gameId }: GlassBridgeProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [bridgeLayout, setBridgeLayout] = useState<boolean[]>([]) // true for left safe, false for right safe
  const [revealedPanels, setRevealedPanels] = useState<boolean[]>([]) // which panels have been revealed
  const [message, setMessage] = useState("")
  const [isEliminated, setIsEliminated] = useState(player.isEliminated)
  const [gamePhase, setGamePhase] = useState<"waiting" | "playing" | "finished">("waiting")
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)
  const [selectedPanel, setSelectedPanel] = useState<number | null>(null)
  const [numPanels, setNumPanels] = useState(10) // Default, can be changed by admin
  const [playerOrder, setPlayerOrder] = useState<Player[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)

  useEffect(() => {
    if (!gameId) return

    const glassBridgeRef = ref(database, `games/${gameId}/glassBridge`)
    const unsubscribe = onValue(glassBridgeRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setBridgeLayout(data.bridgeLayout || [])
        setRevealedPanels(data.revealedPanels || [])
        setGamePhase(data.phase || "waiting")
        setCurrentStep(data.currentStep || 0)
        setNumPanels(data.numPanels || 10)
        setPlayerOrder(data.playerOrder || [])
        setCurrentPlayerIndex(data.currentPlayerIndex || 0)

        // Check if it's this player's turn
        const currentPlayer = data.playerOrder?.[data.currentPlayerIndex || 0]
        if (currentPlayer?.id !== player.id && data.phase === "playing") {
          setMessage(`Waiting for ${currentPlayer?.name} to choose...`)
        } else if (currentPlayer?.id === player.id && data.phase === "playing") {
          setMessage("Your turn! Choose a panel.")
        }

        // Check for game completion
        if (data.currentStep >= data.numPanels) {
          setMessage("🎉 Bridge completed! All survivors advance!")
          setCoins((prev) => prev + 300)
          onGameEnd(true)
        }
      }
    })

    return () => unsubscribe()
  }, [gameId, player.id, onGameEnd, setCoins])

  const generateBridge = () => {
    const layout: boolean[] = []
    for (let i = 0; i < numPanels; i++) {
      layout.push(Math.random() > 0.5) // true for left safe, false for right safe
    }
    return layout
  }

  const startGame = async () => {
    // Get all alive players and randomize order
    const playersRef = ref(database, `games/${gameId}/players`)
    const snapshot = await onValue(playersRef, async (playersSnapshot) => {
      const playersData = playersSnapshot.val()
      if (playersData) {
        const alivePlayers = Object.values(playersData).filter((p: any) => !p.isEliminated)
        const shuffledPlayers = [...alivePlayers].sort(() => Math.random() - 0.5)

        const layout = generateBridge()
        const revealed = new Array(numPanels).fill(false)

        await update(ref(database, `games/${gameId}/glassBridge`), {
          phase: "playing",
          bridgeLayout: layout,
          revealedPanels: revealed,
          currentStep: 0,
          numPanels: numPanels,
          playerOrder: shuffledPlayers,
          currentPlayerIndex: 0,
        })
      }
    })
    snapshot()
  }

  const handlePanelClick = async (panelIndex: number) => {
    if (gamePhase !== "playing" || isEliminated || selectedPanel !== null) return

    // Check if it's this player's turn
    const currentPlayer = playerOrder[currentPlayerIndex]
    if (currentPlayer?.id !== player.id) return

    setSelectedPanel(panelIndex)

    setTimeout(async () => {
      const isSafe = bridgeLayout[currentStep] === (panelIndex === 0) // Left panel safe if true, right if false

      if (isSafe) {
        // Reveal the correct panel for everyone
        const newRevealed = [...revealedPanels]
        newRevealed[currentStep] = true

        const newStep = currentStep + 1
        let newPlayerIndex = currentPlayerIndex

        // If bridge is complete, everyone wins
        if (newStep >= numPanels) {
          await update(ref(database, `games/${gameId}/glassBridge`), {
            currentStep: newStep,
            revealedPanels: newRevealed,
            phase: "finished",
          })
        } else {
          // Move to next player
          newPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length

          await update(ref(database, `games/${gameId}/glassBridge`), {
            currentStep: newStep,
            revealedPanels: newRevealed,
            currentPlayerIndex: newPlayerIndex,
          })
        }
      } else {
        // Player is eliminated, move to next player
        await update(ref(database, `games/${gameId}/players/${player.id}`), {
          isEliminated: true,
        })

        setIsEliminated(true)
        setMessage("💀 You chose wrong and fell!")
        onGameEnd(false)
      }

      setSelectedPanel(null)
    }, 1000)
  }

  const isMyTurn = playerOrder[currentPlayerIndex]?.id === player.id

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

      <div className="flex flex-col items-center space-y-4 w-full max-w-4xl">
        <div className="relative w-full h-12 bg-squidGray rounded-full overflow-hidden border-2 border-squidPink/50 shadow-lg shadow-squidPink/20">
          <div
            className="absolute h-full bg-squidGreen transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / numPanels) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-squidLightGray font-bold">
            Step {currentStep} / {numPanels}
          </div>
        </div>

        {/* Show player order */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-squidPink mb-2">Player Order:</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {playerOrder.map((p, index) => (
              <span
                key={p.id}
                className={`px-3 py-1 rounded-full text-sm ${
                  index === currentPlayerIndex ? "bg-squidGreen text-white" : "bg-squidGray text-squidLightGray"
                }`}
              >
                #{p.number} {p.name}
              </span>
            ))}
          </div>
        </div>

        {gamePhase === "waiting" && (
          <div className="text-center space-y-4">
            <div className="flex items-center space-x-4">
              <label className="text-squidLightGray">Number of Panels:</label>
              <input
                type="number"
                min="5"
                max="20"
                value={numPanels}
                onChange={(e) => setNumPanels(Number.parseInt(e.target.value) || 10)}
                className="px-3 py-2 bg-squidGray text-squidLightGray rounded border border-squidPink/30"
              />
            </div>
            <Button
              onClick={startGame}
              className="bg-squidRed hover:bg-squidRed/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
            >
              Start Glass Bridge
            </Button>
          </div>
        )}

        {gamePhase === "playing" && !isEliminated && (
          <div className="flex space-x-4 mt-8">
            <Button
              onClick={() => handlePanelClick(0)}
              disabled={selectedPanel !== null || !isMyTurn}
              className={cn(
                "relative w-40 h-40 bg-squidGray hover:bg-squidGray/80 text-white font-bold text-2xl rounded-lg transition-all duration-300 flex flex-col items-center justify-center",
                "border-2 border-squidPink/50 shadow-lg shadow-squidPink/20",
                selectedPanel === 0 && "scale-105 ring-4 ring-squidPink",
                revealedPanels[currentStep] && bridgeLayout[currentStep] === true && "bg-squidGreen",
                revealedPanels[currentStep] && bridgeLayout[currentStep] === false && "bg-squidRed",
                !isMyTurn && "opacity-50 cursor-not-allowed",
              )}
            >
              {selectedPanel === 0 && bridgeLayout[currentStep] === true && (
                <Check className="absolute text-squidGreen w-16 h-16 animate-bounce" />
              )}
              {selectedPanel === 0 && bridgeLayout[currentStep] === false && (
                <X className="absolute text-squidRed w-16 h-16 animate-pulse" />
              )}
              Left Panel
              {revealedPanels[currentStep] && bridgeLayout[currentStep] === true && (
                <div className="absolute top-2 right-2 text-green-400">✓</div>
              )}
            </Button>
            <Button
              onClick={() => handlePanelClick(1)}
              disabled={selectedPanel !== null || !isMyTurn}
              className={cn(
                "relative w-40 h-40 bg-squidGray hover:bg-squidGray/80 text-white font-bold text-2xl rounded-lg transition-all duration-300 flex flex-col items-center justify-center",
                "border-2 border-squidPink/50 shadow-lg shadow-squidPink/20",
                selectedPanel === 1 && "scale-105 ring-4 ring-squidPink",
                revealedPanels[currentStep] && bridgeLayout[currentStep] === false && "bg-squidGreen",
                revealedPanels[currentStep] && bridgeLayout[currentStep] === true && "bg-squidRed",
                !isMyTurn && "opacity-50 cursor-not-allowed",
              )}
            >
              {selectedPanel === 1 && bridgeLayout[currentStep] === false && (
                <Check className="absolute text-squidGreen w-16 h-16 animate-bounce" />
              )}
              {selectedPanel === 1 && bridgeLayout[currentStep] === true && (
                <X className="absolute text-squidRed w-16 h-16 animate-pulse" />
              )}
              Right Panel
              {revealedPanels[currentStep] && bridgeLayout[currentStep] === false && (
                <div className="absolute top-2 right-2 text-green-400">✓</div>
              )}
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
