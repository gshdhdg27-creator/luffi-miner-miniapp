import { useState, useEffect, useCallback } from 'react'
import './App.css'

declare global {
  interface Window {
    Telegram?: {
      WebApp: any
    }
  }
}

const STORAGE_KEY = 'luffi_miner_data'

interface UserData {
  balance: number
  energy: number
  maxEnergy: number
  lastUpdate: number
  totalMined: number
  referrals: number
}

const DEFAULT_DATA: UserData = {
  balance: 0,
  energy: 1000,
  maxEnergy: 1000,
  lastUpdate: Date.now(),
  totalMined: 0,
  referrals: 0,
}

function loadData(): UserData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DATA }
    const data = JSON.parse(raw) as UserData
    // regenerate energy
    const now = Date.now()
    const elapsed = Math.floor((now - data.lastUpdate) / 1000)
    const regen = Math.floor(elapsed / 3) // 1 energy every 3 sec
    data.energy = Math.min(data.maxEnergy, data.energy + regen)
    data.lastUpdate = now
    return data
  } catch {
    return { ...DEFAULT_DATA }
  }
}

function saveData(data: UserData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function App() {
  const [data, setData] = useState<UserData>(loadData)
  const [tapAnim, setTapAnim] = useState(false)
  const [floating, setFloating] = useState<{ id: number; value: number }[]>([])
  const [tgUser, setTgUser] = useState<string>('Пират')

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      tg.setHeaderColor('#0a1628')
      tg.setBackgroundColor('#0a1628')
      const name = tg.initDataUnsafe?.user?.first_name || 'Пират'
      setTgUser(name)
    }
  }, [])

  // energy regen ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        if (prev.energy >= prev.maxEnergy) return prev
        const next = { ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 1), lastUpdate: Date.now() }
        saveData(next)
        return next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const mine = useCallback(() => {
    setData(prev => {
      if (prev.energy < 1) return prev
      const reward = 1 + Math.floor(Math.random() * 3)
      const next = {
        ...prev,
        balance: prev.balance + reward,
        energy: prev.energy - 1,
        totalMined: prev.totalMined + reward,
        lastUpdate: Date.now(),
      }
      saveData(next)

      const id = Date.now()
      setFloating(f => [...f, { id, value: reward }])
      setTimeout(() => setFloating(f => f.filter(x => x.id !== id)), 800)

      setTapAnim(true)
      setTimeout(() => setTapAnim(false), 150)

      return next
    })
  }, [])

  const energyPercent = (data.energy / data.maxEnergy) * 100

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="hat">👒</span>
          <span className="title">LUFFI MINER</span>
        </div>
        <div className="user-name">{tgUser}</div>
      </header>

      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-label">Твой баланс</div>
        <div className="balance-value">
          <span className="coin">🍖</span>
          {data.balance.toLocaleString()}
          <span className="token">LUFFI</span>
        </div>
        <div className="total-mined">Всего добыто: {data.totalMined.toLocaleString()}</div>
      </div>

      {/* Mine Button */}
      <div className="mine-area">
        {floating.map(f => (
          <div key={f.id} className="float-reward">+{f.value}</div>
        ))}
        <button
          className={`mine-btn ${tapAnim ? 'tapped' : ''} ${data.energy < 1 ? 'disabled' : ''}`}
          onClick={mine}
          disabled={data.energy < 1}
        >
          <div className="mine-icon">🏴‍☠️</div>
          <div className="mine-text">{data.energy < 1 ? 'Нет энергии' : 'МАЙНИТЬ'}</div>
        </button>
      </div>

      {/* Energy Bar */}
      <div className="energy-section">
        <div className="energy-header">
          <span>⚡ Энергия</span>
          <span>{data.energy} / {data.maxEnergy}</span>
        </div>
        <div className="energy-bar">
          <div className="energy-fill" style={{ width: `${energyPercent}%` }} />
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button className="action-btn claim">
          <span>💰</span>
          <span>Забрать</span>
        </button>
        <button className="action-btn friends">
          <span>👥</span>
          <span>Друзья</span>
        </button>
        <button className="action-btn boost">
          <span>🚀</span>
          <span>Буст</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>One Piece style • LUFFI Token on TON</p>
        <p className="small">Это демо-версия. Баланс хранится локально.</p>
      </footer>
    </div>
  )
}