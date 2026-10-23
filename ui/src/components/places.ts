import { BarChart3, BookOpen, Home, Inbox, Lightbulb, Plug, Radio, Users } from 'lucide-react'

// The places of the screen, in the order the rail and the menu show them.
export const places = [
  { to: '/', name: 'Home', icon: Home },
  { to: '/inbox', name: 'Inbox', icon: Inbox },
  { to: '/people', name: 'People', icon: Users },
  { to: '/signals', name: 'Signals', icon: Radio },
  { to: '/problems', name: 'Problems', icon: Lightbulb },
  { to: '/insights', name: 'Insights', icon: BarChart3 },
  { to: '/brain', name: 'Brain', icon: BookOpen },
  { to: '/connections', name: 'Connections', icon: Plug },
]
