"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AdminLoginProps {
  onLoginSuccess: () => void
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock admin credentials
    if (username === "admin" && password === "password") {
      onLoginSuccess()
    } else {
      setError("Invalid username or password.")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-squidDark">
      <Card className="w-full max-w-md border-squidPink/50 shadow-lg shadow-squidPink/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-squidRed">Admin Access</CardTitle>
          <CardDescription className="text-squidLightGray">Enter your credentials to manage the game.</CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-squidGray text-squidLightGray border-squidPink/30 focus:border-squidPink focus:ring-squidPink"
                  required
                />
              </div>
              <div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-squidGray text-squidLightGray border-squidPink/30 focus:border-squidPink focus:ring-squidPink"
                  required
                />
              </div>
              {error && <p className="text-squidRed text-sm text-center">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-squidRed hover:bg-squidRed/80 text-white font-bold py-2 rounded-md transition-colors duration-300"
              >
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </CardHeader>
  )
}
