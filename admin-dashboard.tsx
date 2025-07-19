"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ref, set, update } from "firebase/database"
import { database } from "@/lib/firebase"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

interface AdminDashboardProps {
  onLogout: () => void
  players: Player[]
  gameId: string | null
  setGameId: (id: string) => void
  currentRound: number
}

export function AdminDashboard({ onLogout, players, gameId, setGameId, currentRound }: AdminDashboardProps) {
  const [newGameId, setNewGameId] = useState("")

  const handleCreateGame = async () => {
    const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setNewGameId(generatedId)
    setGameId(generatedId) // Update local state immediately

    // Initialize game in Firebase
    await set(ref(database, `games/${generatedId}`), {
      currentRound: 0, // Lobby state
      status: "lobby",
      players: {},
    })
  }

  const handleStartGame = async () => {
    if (!gameId) return
    // Update game status and round in Firebase
    await update(ref(database, `games/${gameId}`), {
      currentRound: 1, // Start with Red Light, Green Light
      status: "playing",
    })
  }

  const handleEliminatePlayer = async (playerId: string) => {
    if (!gameId) return
    // Update player's elimination status in Firebase
    await update(ref(database, `games/${gameId}/players/${playerId}`), {
      isEliminated: true,
    })
  }

  const handleNextRound = async () => {
    if (!gameId) return
    const nextRound = currentRound + 1
    await update(ref(database, `games/${gameId}`), {
      currentRound: nextRound,
    })
  }

  return (
    <div className="min-h-screen bg-squidDark text-squidLightGray p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-squidRed mb-8 text-center">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="bg-squidGray border-squidPink/50 shadow-lg shadow-squidPink/20">
            <CardHeader>
              <CardTitle className="text-2xl text-squidPink">Game Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="game-id" className="text-squidLightGray">
                  Current Game ID:
                </Label>
                <Input
                  id="game-id"
                  value={gameId || "N/A"}
                  readOnly
                  className="flex-1 bg-squidDark border-squidPink/30 text-squidGreen font-mono"
                />
              </div>
              <Button
                onClick={handleCreateGame}
                className="w-full bg-squidGreen hover:bg-squidGreen/80 text-white font-bold transition-colors duration-300"
              >
                {gameId ? "Generate New Game ID" : "Create New Game"}
              </Button>
              {gameId && (
                <Button
                  onClick={handleStartGame}
                  className="w-full bg-squidRed hover:bg-squidRed/80 text-white font-bold transition-colors duration-300"
                >
                  Start Game
                </Button>
              )}
              <Button
                onClick={handleNextRound}
                disabled={!gameId || currentRound >= 6} // Disable if no game or all rounds played
                className="w-full bg-squidPink hover:bg-squidPink/80 text-white font-bold transition-colors duration-300"
              >
                Next Round (Current: {currentRound})
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-squidGray border-squidPink/50 shadow-lg shadow-squidPink/20">
            <CardHeader>
              <CardTitle className="text-2xl text-squidPink">Player Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-xl font-semibold text-squidLightGray">Connected Players ({players.length})</h3>
              <ScrollArea className="h-48 w-full rounded-md border border-squidPink/30 p-4 bg-squidDark">
                {players.length === 0 ? (
                  <p className="text-squidLightGray/70">No players connected yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {players.map((player) => (
                      <li key={player.id} className="flex items-center justify-between text-squidLightGray">
                        <span>
                          #{player.number} {player.name}{" "}
                          {player.isEliminated && <span className="text-squidRed">(Eliminated)</span>}
                        </span>
                        {!player.isEliminated && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleEliminatePlayer(player.id)}
                            className="bg-squidRed hover:bg-squidRed/80 text-white"
                          >
                            Eliminate
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button
            onClick={onLogout}
            className="bg-squidRed hover:bg-squidRed/80 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
