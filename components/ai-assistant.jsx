"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  ChevronDown, 
  Sparkles,
  BarChart3,
  AlertTriangle,
} from "lucide-react"

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [localInput, setLocalInput] = useState("")

  // AI SDK v5: useChat returns sendMessage({ text }) — no append, no handleSubmit
  const { messages, sendMessage, status } = useChat()

  const isLoading = status === "submitted" || status === "streaming"
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const toggleChat = () => setIsOpen(!isOpen)

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!localInput.trim() || isLoading) return
    sendMessage({ text: localInput })
    setLocalInput("")
  }

  // Suggestion buttons use the same sendMessage({ text }) API
  const handleSuggestionClick = (text) => {
    if (isLoading) return
    sendMessage({ text })
  }

  // v5 messages use parts array instead of content string
const getMessageText = (message) => {
  if (!message.parts) return message.content ?? ""

  let text = ""

  for (const part of message.parts) {
    if (part.type === "text") {
      text += part.text

    } else if (part.type === "tool-getLowStockItems") {
      if (part.state === "output-available" && part.output) {
        const fg = part.output.finishedGoods ?? []
        const rm = part.output.rawMaterials ?? []
        const all = [...fg, ...rm]
        if (all.length === 0) {
          text += "\n✅ No low stock items found."
        } else {
          text += `\n⚠️ Low Stock Items (${all.length}):\n`
          all.forEach(item => {
            text += `• ${item.name} (${item.sku}) — Qty: ${item.quantity}\n`
          })
        }
      } else {
        text += "\n🔍 Checking stock levels..."
      }

    } else if (part.type === "tool-getInventorySummary") {
      if (part.state === "output-available" && part.output) {
        text += `\n📦 ${part.output.message}`
      } else {
        text += "\n🔍 Fetching inventory summary..."
      }

    } else if (part.type === "tool-getRecentOrders") {
      if (part.state === "output-available" && part.output) {
        const inbound = part.output.recentInbound ?? []
        const outbound = part.output.recentOutbound ?? []
        text += `\n📥 Recent Purchase Orders (${inbound.length}):\n`
        inbound.forEach(o => text += `• ${o.id} — ${o.supplier} (${o.status})\n`)
        text += `\n📤 Recent Sales Orders (${outbound.length}):\n`
        outbound.forEach(o => text += `• ${o.id} — ${o.customer} (${o.status})\n`)
      } else {
        text += "\n🔍 Fetching recent orders..."
      }

    } else if (part.type === "tool-getItemDetails") {
      if (part.state === "output-available" && part.output) {
        if (part.output.error) {
          text += `\n❌ ${part.output.error}`
        } else {
          text += `\n🔍 ${part.output.name} (${part.output.sku})\nType: ${part.output.type} | Qty: ${part.output.quantity}`
        }
      } else {
        text += "\n🔍 Looking up item..."
      }
    }
  }

  return text.trim()
}

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`mb-4 w-80 md:w-96 overflow-hidden flex flex-col rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-2xl transition-all duration-300 ${
              isMinimized ? "h-14" : "h-[500px]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-blue-600/10 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Antigravity AI</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-gray-500">Live stats active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? "rotate-180" : ""}`} />
                </button>
                <button
                  onClick={toggleChat}
                  className="p-1.5 hover:bg-red-50 rounded-md text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60 px-4">
                      <div className="p-3 bg-blue-50 rounded-full">
                        <Sparkles className="w-8 h-8 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">How can I help you today?</p>
                        <p className="text-xs text-gray-500 mt-1">Ask me about stock levels, orders, or a specific SKU.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 w-full mt-4">
                        <button
                          onClick={() => handleSuggestionClick("Show me low stock items")}
                          className="text-[11px] text-left p-2 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 border border-gray-100 transition-all flex items-center gap-2"
                        >
                          <AlertTriangle className="w-3 h-3" /> "Low stock items?"
                        </button>
                        <button
                          onClick={() => handleSuggestionClick("What's the status of recent orders?")}
                          className="text-[11px] text-left p-2 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 border border-gray-100 transition-all flex items-center gap-2"
                        >
                          <BarChart3 className="w-3 h-3" /> "Recent order stats"
                        </button>
                      </div>
                    </div>
                  )}

                  {messages.map((m) => {
                    const text = getMessageText(m)
                    if (!text) return null

                    return (
                      <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`flex gap-2 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            m.role === "user" ? "bg-gray-100" : "bg-blue-100"
                          }`}>
                            {m.role === "user"
                              ? <User className="w-4 h-4 text-gray-600" />
                              : <Bot className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className={`p-3 rounded-2xl text-sm ${
                            m.role === "user"
                              ? "bg-blue-600 text-white rounded-tr-none"
                              : "bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm"
                          }`}>
                            {text}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="p-3 bg-white border border-gray-100 rounded-2xl rounded-tl-none shadow-sm">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        </div>
                      </div>
                    </div>
                  )}

                  {status === "error" && (
                    <div className="p-2 text-xs text-red-500 bg-red-50 rounded-lg border border-red-100">
                      An error occurred. Please check your API key and try again.
                    </div>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={handleFormSubmit} className="p-4 bg-white border-t border-gray-100">
                  <div className="relative flex items-center">
                    <input
                      value={localInput}
                      onChange={(e) => setLocalInput(e.target.value)}
                      placeholder="Ask me anything..."
                      disabled={isLoading}
                      className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !localInput.trim()}
                      className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 flex items-center justify-center gap-1">
                    Powered by Google Gemini 2.0 Flash
                  </p>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className={`p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2 group ${
          isOpen ? "bg-red-500 text-white" : "bg-blue-600 text-white"
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 font-medium">
              AI Assistant
            </span>
          </>
        )}
      </motion.button>
    </div>
  )
}