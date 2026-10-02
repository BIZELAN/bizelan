'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'
import { startNavigationProgress } from '@/components/ui/navigation-progress'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'

export function VerifyForm({ defaultValue = '' }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const code = value.trim().toUpperCase().replace(/\s+/g, '')
        if (!code) return
        setBusy(true)
        startNavigationProgress()
        router.push(`/verifier/${encodeURIComponent(code)}`)
      }}
      className="flex gap-2"
    >
      <label htmlFor="certificate-code" className="sr-only">
        Numéro du certificat
      </label>
      <Input
        id="certificate-code"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="BZ-CERT-…"
        className="font-mono uppercase"
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" disabled={!value.trim() || busy} aria-busy={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
        Vérifier
      </Button>
    </form>
  )
}
