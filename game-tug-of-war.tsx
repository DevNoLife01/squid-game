"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { database, ref, onValue, update } from "@/lib/firebase"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

interface TugOfWarProps {
  onGameEnd: (survived: boolean) => void
  player: Player
  gameId: string
}

export function TugOfWar({ onGameEnd, player, gameId }: TugOfWarProps) {
  const [team1Strength, setTeam1Strength] = useState(0)
  const [team2Strength, setTeam2Strength] = useState(0)
  const [timer, setTimer] = useState(30)
  const [gamePhase, setGamePhase] = useState<"waiting" | "playing" | "finished">("waiting")
  const [message, setMessage] = useState("")
  const [isEliminated, setIsEliminated] = useState(player.isEliminated)
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)
  const [playerTeam, setPlayerTeam] = useState<1 | 2 | null>(null)
  const [teams, setTeams] = useState<{ team1: Player[]; team2: Player[] }>({ team1: [], team2: [] })

  useEffect(() => {
    if (!gameId) return

    const tugOfWarRef = ref(database, `games/${gameId}/tugOfWar`)
    const unsubscribe = onValue(tugOfWarRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setTeam1Strength(data.team1Strength || 0)
        setTeam2Strength(data.team2Strength || 0)
        setGamePhase(data.phase || "waiting")
        setTimer(data.timer || 30)
        setTeams(data.teams || { team1: [], team2: [] })

        // Find player's team
        if (data.teams) {
          if (data.teams.team1?.find((p: Player) => p.id === player.id)) {
            setPlayerTeam(1)
          } else if (data.teams.team2?.find((p: Player) => p.id === player.id)) {
            setPlayerTeam(2)
          }
        }

        // Check for game end
        if (data.phase === "finished") {
          const winningTeam = data.team1Strength > data.team2Strength ? 1 : 2
          if (playerTeam === winningTeam) {
            setMessage("🎉 YOUR TEAM WON!")
            setCoins((prev) => prev + 200)
            onGameEnd(true)
          } else {
            setMessage("💀 YOUR TEAM LOST!")
            setIsEliminated(true)
            onGameEnd(false)
          }
        }
      }
    })

    return () => unsubscribe()
  }, [gameId, player.id, playerTeam, onGameEnd, setCoins])

  const handlePull = async () => {
    if (gamePhase !== "playing" || isEliminated || !playerTeam) return

    const strengthKey = playerTeam === 1 ? "team1Strength" : "team2Strength"
    const currentStrength = playerTeam === 1 ? team1Strength : team2Strength

    await update(ref(database, `games/${gameId}/tugOfWar`), {
      [strengthKey]: Math.min(currentStrength + 3, 100),
    })
  }

  const startGame = async () => {
    // Assign players to teams randomly
    const playersRef = ref(database, `games/${gameId}/players`)
    const snapshot = await onValue(playersRef, async (playersSnapshot) => {
      const playersData = playersSnapshot.val()
      if (playersData) {
        const alivePlayers = Object.values(playersData).filter((p: any) => !p.isEliminated)
        const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5)
        const mid = Math.ceil(shuffled.length / 2)

        const team1 = shuffled.slice(0, mid)
        const team2 = shuffled.slice(mid)

        await update(ref(database, `games/${gameId}/tugOfWar`), {
          phase: "playing",
          timer: 30,
          team1Strength: 0,
          team2Strength: 0,
          teams: { team1, team2 },
        })
      }
    })
    snapshot()
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-squidDark text-squidLightGray p-4 overflow-hidden">
      {isEliminated && (
        <div className="absolute inset-0 bg-squidRed/80 flex items-center justify-center z-50 animate-fade-out-up">
          <h2 className="text-6xl font-bold text-white drop-shadow-lg">ELIMINATED</h2>
        </div>
      )}

      <div className="absolute top-4 left-4 text-lg font-mono text-squidGreen">
        Player: #{player.number} {player.name} {playerTeam && `(Team ${playerTeam})`}
      </div>
      <div className="absolute top-4 right-4 text-lg font-mono text-squidPink">Time Left: {timer}s</div>

      <h2 className="text-5xl font-bold mb-8 text-center text-white drop-shadow-lg">
        {message || "Tug of War: Team Battle!"}
      </h2>

      <div className="w-full max-w-4xl space-y-6 mb-8">
        <div className="flex items-center justify-between text-xl font-bold text-squidGreen">
          <span>Team 1 ({teams.team1.length} players)</span>
          <span>{team1Strength.toFixed(0)}%</span>
        </div>
        <Progress value={team1Strength} className="w-full h-6 bg-squidGray/50 [&>*]:bg-squidGreen" />

        <div className="flex items-center justify-between text-xl font-bold text-squidRed">
          <span>Team 2 ({teams.team2.length} players)</span>
          <span>{team2Strength.toFixed(0)}%</span>
        </div>
        <Progress value={team2Strength} className="w-full h-6 bg-squidGray/50 [&>*]:bg-squidRed" />
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 w-full max-w-4xl">
        <div className="text-center">
          <h3 className="text-xl font-bold text-squidGreen mb-2">Team 1</h3>
          <div className="space-y-1">
            {teams.team1.map((p) => (
              <div key={p.id} className="text-sm text-squidLightGray">
                #{p.number} {p.name}
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-squidRed mb-2">Team 2</h3>
          <div className="space-y-1">
            {teams.team2.map((p) => (
              <div key={p.id} className="text-sm text-squidLightGray">
                #{p.number} {p.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {gamePhase === "waiting" && (
        <Button
          onClick={startGame}
          className="bg-squidRed hover:bg-squidRed/80 text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300"
        >
          Start Tug of War
        </Button>
      )}

      {gamePhase === "playing" && !isEliminated && playerTeam && (
        <Button
          onClick={handlePull}
          className={`text-white font-bold py-4 px-8 text-xl rounded-lg transition-colors duration-300 active:scale-95 ${
            playerTeam === 1 ? "bg-squidGreen hover:bg-squidGreen/80" : "bg-squidRed hover:bg-squidRed/80"
          }`}
        >
          PULL FOR TEAM {playerTeam}! (Click Rapidly)
        </Button>
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
  )
}
