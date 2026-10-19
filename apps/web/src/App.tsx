import { AppProvider } from '@/app/AppContext'
import { AppShell } from '@/app/AppShell'
import './styles.css'

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
