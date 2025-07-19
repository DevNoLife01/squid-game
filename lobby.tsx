"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { ref, get } from "firebase/database"
import { database } from "@/lib/firebase"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

interface LobbyProps {
  onJoinGame: (gameId: string, playerName: string, playerId: string) => void
  players: Player[]
  gameId: string | null
  onStartGame: () => void
  isAdmin: boolean
  currentRound: number
  currentPlayerId: string | null
}

export function Lobby({
  onJoinGame,
  players,
  gameId,
  onStartGame,
  isAdmin,
  currentRound,
  currentPlayerId,
}: LobbyProps) {
  const [joinCode, setJoinCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [error, setError] = useState("")
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)

  const handleJoin = async () => {
    if (!joinCode || !playerName) {
      setError("Please enter a game code and your player name.")
      return
    }

    // Check if game exists
    const gameRef = ref(database, `games/${joinCode}`)
    const snapshot = await get(gameRef)

    if (!snapshot.exists()) {
      setError("Game code does not exist.")
      return
    }

    setError("")
    const newPlayerId = `player-${Date.now()}` // Generate unique ID for this player
    onJoinGame(joinCode, playerName, newPlayerId)
  }

  return (
    <div className="min-h-screen bg-squidDark text-squidLightGray p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full mx-auto">
        <h1 className="text-5xl font-bold text-squidRed mb-8 text-center animate-pulse-neon">SQUID GAME</h1>

        <Card className="bg-squidGray border-squidPink/50 shadow-lg shadow-squidPink/20 mb-8">
          <CardHeader>
            <CardTitle className="text-3xl text-squidPink text-center">Game Lobby</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!gameId || !currentPlayerId ? ( // If not joined a game yet
              <div className="space-y-4">
                <div>
                  <Input
                    id="player-name"
                    type="text"
                    placeholder="Your Player Name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="bg-squidDark border-squidPink/30 text-squidLightGray focus:border-squidPink focus:ring-squidPink"
                    required
                  />
                </div>
                <div>
                  <Input
                    id="join-code"
                    type="text"
                    placeholder="Enter Game Code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="bg-squidDark border-squidPink/30 text-squidLightGray focus:border-squidPink focus:ring-squidPink"
                    required
                  />
                </div>
                {error && <p className="text-squidRed text-sm text-center">{error}</p>}
                <Button
                  onClick={handleJoin}
                  className="w-full bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-2 rounded-md transition-colors duration-300"
                >
                  Join Game
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-xl text-squidLightGray">
                  Joined Game: <span className="font-mono text-squidGreen">{gameId}</span>
                </p>
                <p className="text-lg text-squidLightGray">
                  Current Round: <span className="font-bold text-squidPink">{currentRound}</span>
                </p>
                <p className="text-lg text-squidLightGray">
                  Your Coins: <span className="font-bold text-squidGreen">{coins}</span>
                </p>
                {isAdmin && (
                  <Button
                    onClick={onStartGame}
                    className="w-full bg-squidRed hover:bg-squidRed/80 text-white font-bold py-2 rounded-md transition-colors duration-300"
                  >
                    Start Game
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-squidGray border-squidPink/50 shadow-lg shadow-squidPink/20">
          <CardHeader>
            <CardTitle className="text-2xl text-squidPink text-center">Players in Lobby ({players.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 w-full rounded-md border border-squidPink/30 p-4 bg-squidDark">
              {players.length === 0 ? (
                <p className="text-squidLightGray/70 text-center">Waiting for players...</p>
              ) : (
                <ul className="space-y-2">
                  {players.map((player) => (
                    <li key={player.id} className="flex items-center justify-between text-squidLightGray">
                      <span className="font-mono text-squidGreen">#{player.number}</span>
                      <span className="flex-1 ml-4">{player.name}</span>
                      {player.isEliminated && <span className="text-squidRed font-bold">ELIMINATED</span>}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
