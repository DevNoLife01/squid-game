"use client"

import { Button } from "@/components/ui/button"

import { useState, useEffect } from "react"
import { AdminLogin } from "@/components/admin-login"
import { AdminDashboard } from "@/components/admin-dashboard"
import { Lobby } from "@/components/lobby"
import { RedLightGreenLight } from "@/components/game-red-light-green-light"
import { Honeycomb } from "@/components/game-honeycomb"
import { TugOfWar } from "@/components/game-tug-of-war"
import { Marbles } from "@/components/game-marbles"
import { GlassBridge } from "@/components/game-glass-bridge"
import { SquidGame } from "@/components/game-squid-game"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { database, ref, onValue, update, set } from "@/lib/firebase"

type View =
  | "login"
  | "lobby"
  | "admin"
  | "red-light-green-light"
  | "honeycomb"
  | "tug-of-war"
  | "marbles"
  | "glass-bridge"
  | "squid-game"
  | "game-over"

interface Player {
  id: string
  name: string
  number: number
  isEliminated: boolean
}

export default function SquidGameWebsite() {
  const [currentView, setCurrentView] = useState<View>("lobby")
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [gameId, setGameId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useLocalStorage<string | null>("squid-game-player-id", null)
  const [currentRound, setCurrentRound] = useState(0) // 0: Lobby, 1: RLGL, 2: Honeycomb, etc.
  const [coins, setCoins] = useLocalStorage<number>("squid-game-coins", 0)
  const [message, setMessage] = useState("") // For game over messages and general info

  // Background music
  useEffect(() => {
    const audio = new Audio("/squid-game-theme.mp3")
    audio.loop = true
    audio.volume = 0.3
    audio.play().catch((e) => console.log("Audio play failed:", e))

    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  // Firebase Realtime Database Listener
  useEffect(() => {
    if (!gameId) return

    const gameRef = ref(database, `games/${gameId}`)
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setCurrentRound(data.currentRound || 0)
        const fetchedPlayers: Player[] = []
        if (data.players) {
          Object.keys(data.players).forEach((playerId) => {
            fetchedPlayers.push({ id: playerId, ...data.players[playerId] })
          })
        }
        setPlayers(fetchedPlayers)

        // Update current player's status based on Firebase
        if (currentPlayerId) {
          const updatedCurrentPlayer = fetchedPlayers.find((p) => p.id === currentPlayerId)
          if (updatedCurrentPlayer) {
            setCurrentPlayer(updatedCurrentPlayer)
            if (updatedCurrentPlayer.isEliminated && currentView !== "game-over") {
              setMessage("You have been eliminated!")
              setCurrentView("game-over")
            }
          }
        }

        // Automatically switch view based on currentRound
        if (data.status === "playing") {
          switch (data.currentRound) {
            case 1:
              setCurrentView("red-light-green-light")
              break
            case 2:
              setCurrentView("honeycomb")
              break
            case 3:
              setCurrentView("tug-of-war")
              break
            case 4:
              setCurrentView("marbles")
              break
            case 5:
              setCurrentView("glass-bridge")
              break
            case 6:
              setCurrentView("squid-game")
              break
            default:
              if (data.currentRound > 6) {
                setMessage("All games completed! Congratulations! You are the last survivor.")
                setCurrentView("game-over")
              }
              break
          }
        } else if (data.status === "lobby" && currentRound === 0) {
          setCurrentView("lobby")
        }
      } else {
        // Game was deleted or doesn't exist
        setGameId(null)
        setPlayers([])
        setCurrentPlayer(null)
        setCurrentPlayerId(null)
        setCurrentRound(0)
        setMessage("The game session has ended or was deleted.")
        setCurrentView("game-over")
      }
    })

    return () => {
      onValue(gameRef, () => {}) // Detach listener
      unsubscribe()
    }
  }, [gameId, currentPlayerId, currentRound, currentView, setCurrentPlayerId])

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true)
    setCurrentView("admin")
  }

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false)
    setGameId(null) // Clear game context on admin logout
    setCurrentPlayer(null)
    setCurrentPlayerId(null)
    setCurrentRound(0)
    setPlayers([])
    setCurrentView("lobby")
  }

  const handleJoinGame = async (code: string, playerName: string, playerId: string) => {
    setGameId(code)
    setCurrentPlayerId(playerId) // Store player ID locally

    const gamePlayersRef = ref(database, `games/${code}/players`)
    const snapshot = await onValue(gamePlayersRef, (playersSnapshot) => {
      const existingPlayers = playersSnapshot.val() || {}
      const newPlayerNumber = Object.keys(existingPlayers).length + 1

      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        number: newPlayerNumber,
        isEliminated: false,
      }

      // Add player to Firebase
      set(ref(database, `games/${code}/players/${playerId}`), newPlayer)
      setCurrentPlayer(newPlayer)
      setCurrentView("lobby")
    })
    // Detach the temporary listener after adding the player
    onValue(gamePlayersRef, () => {})
    snapshot()
  }

  const handleGameEnd = async (survived: boolean) => {
    if (currentPlayer && gameId) {
      if (!survived) {
        // Update player's elimination status in Firebase
        await update(ref(database, `games/${gameId}/players/${currentPlayer.id}`), {
          isEliminated: true,
        })
        setMessage("You were eliminated!")
        setCurrentView("game-over")
      } else {
        setMessage("You survived the round!")
        setCurrentView("lobby") // Return to lobby to wait for next round
      }
    }
  }

  const renderView = () => {
    const commonEliminatedScreen = (
      <div className="flex flex-col items-center justify-center min-h-screen bg-squidDark text-squidLightGray">
        <h2 className="text-4xl font-bold text-squidRed mb-4">You are eliminated or not joined!</h2>
        <Button onClick={() => setCurrentView("lobby")} className="bg-squidGreen hover:bg-squidGreen/80">
          Return to Lobby
        </Button>
      </div>
    )

    // If current player is eliminated, show eliminated screen unless already on game-over
    if (currentPlayer && currentPlayer.isEliminated && currentView !== "game-over") {
      return commonEliminatedScreen
    }

    switch (currentView) {
      case "login":
        return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
      case "admin":
        return (
          <AdminDashboard
            onLogout={handleAdminLogout}
            players={players}
            gameId={gameId}
            setGameId={setGameId}
            currentRound={currentRound}
          />
        )
      case "lobby":
        return (
          <Lobby
            onJoinGame={handleJoinGame}
            players={players}
            gameId={gameId}
            onStartGame={async () => {
              if (gameId) {
                await update(ref(database, `games/${gameId}`), { currentRound: 1, status: "playing" })
              }
            }}
            isAdmin={isAdminLoggedIn}
            currentRound={currentRound}
            currentPlayerId={currentPlayerId}
          />
        )
      case "red-light-green-light":
        if (!currentPlayer) return commonEliminatedScreen
        return <RedLightGreenLight onGameEnd={handleGameEnd} player={currentPlayer} />
      case "honeycomb":
        if (!currentPlayer) return commonEliminatedScreen
        return <Honeycomb onGameEnd={handleGameEnd} player={currentPlayer} />
      case "tug-of-war":
        if (!currentPlayer) return commonEliminatedScreen
        return <TugOfWar onGameEnd={handleGameEnd} player={currentPlayer} />
      case "marbles":
        if (!currentPlayer) return commonEliminatedScreen
        return <Marbles onGameEnd={handleGameEnd} player={currentPlayer} />
      case "glass-bridge":
        if (!currentPlayer) return commonEliminatedScreen
        return <GlassBridge onGameEnd={handleGameEnd} player={currentPlayer} />
      case "squid-game":
        if (!currentPlayer) return commonEliminatedScreen
        return <SquidGame onGameEnd={handleGameEnd} player={currentPlayer} />
      case "game-over":
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-squidDark text-squidLightGray">
            <h2 className="text-5xl font-bold text-squidRed mb-8 animate-pulse-neon">GAME OVER</h2>
            <p className="text-2xl text-squidLightGray mb-4">{message}</p>
            <p className="text-xl text-squidGreen mb-8">Your final coins: {coins}</p>
            <Button
              onClick={() => {
                // Clear local storage for a fresh start
                localStorage.removeItem("squid-game-player-id")
                localStorage.removeItem("squid-game-coins")
                window.location.reload()
              }}
              className="bg-squidGreen hover:bg-squidGreen/80 text-white font-bold py-3 px-6 rounded-md transition-colors duration-300"
            >
              Play Again
            </Button>
            <Button
              onClick={() => setCurrentView("lobby")}
              className="mt-4 bg-squidPink hover:bg-squidPink/80 text-white font-bold py-3 px-6 rounded-md transition-colors duration-300"
            >
              Back to Lobby
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-squidDark">
      {renderView()}
      <div className="fixed bottom-4 right-4 flex space-x-2 z-50">
        <Button
          onClick={() => setCurrentView("login")}
          className="bg-squidPink hover:bg-squidPink/80 text-white text-sm px-3 py-1"
        >
          Admin Login
        </Button>
        <Button
          onClick={() => setCurrentView("lobby")}
          className="bg-squidGreen hover:bg-squidGreen/80 text-white text-sm px-3 py-1"
        >
          Player Lobby
        </Button>
      </div>
    </div>
  )
}
