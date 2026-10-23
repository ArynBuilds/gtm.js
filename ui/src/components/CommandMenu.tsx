import { FileBarChart, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useAct } from '@/lib/api'
import { places } from './places'

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const go = useNavigate()
  const act = useAct()
  const done = (fn: () => void) => () => { fn(); onOpenChange(false) }
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Go somewhere or do something" />
      <CommandList>
        <CommandEmpty>Nothing by that name.</CommandEmpty>
        <CommandGroup heading="Go to">
          {places.map(({ to, name, icon: Icon }) => (
            <CommandItem key={to} onSelect={done(() => go(to))}><Icon /> {name}</CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Do">
          <CommandItem onSelect={done(() => { act.mutate({ name: 'run/cycle' }); toast('Listening now') })}>
            <RefreshCw /> Listen now
          </CommandItem>
          <CommandItem onSelect={done(() => { act.mutate({ name: 'run/weekly' }); toast('Writing the weekly reports. It takes a few minutes.') })}>
            <FileBarChart /> Write the weekly reports now
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
