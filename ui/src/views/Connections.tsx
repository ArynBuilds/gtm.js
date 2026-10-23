import { ConnectionsList } from '@/components/Connections'
import { Page } from '@/components/marks'

export function Connections() {
  return (
    <Page title="Connections" sub="Everything gtm.js can be connected to, what each one does for you, and how to turn it on.">
      <div className="pb-12"><ConnectionsList /></div>
    </Page>
  )
}
