import { createContext, useContext, ReactNode } from 'react'

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
  [key: string]: any // Permitir props adicionales como data-tour
}

export function TabsList({ children, className = '', ...props }: TabsListProps) {
  return (
    <div 
      className={`inline-flex h-10 items-center justify-center rounded-md bg-corfoGray-20 p-1 text-corfoGray-60 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const isActive = context.value === value

  return (
    <button
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium 
        ring-offset-corfoGray-0 transition-all focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-corfo-500 focus-visible:ring-offset-2 disabled:pointer-events-none 
        disabled:opacity-50 ${isActive 
          ? 'bg-corfoGray-0 text-corfoGray-90 shadow-sm' 
          : 'text-corfoGray-60 hover:bg-corfoGray-10'
        } ${className}
      `}
      onClick={() => context.onValueChange(value)}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  if (context.value !== value) return null

  return (
    <div className={`mt-2 ring-offset-corfoGray-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corfo-500 focus-visible:ring-offset-2 ${className}`}>
      {children}
    </div>
  )
}
