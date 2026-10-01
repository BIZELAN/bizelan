'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'

export function VerifyForm({ defaultValue = '' }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue)
  const router = useRouter()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const code = value.trim().toUpperCase().replace(/\s+/g, '')
        if (code) router.push(`/verifier/${encodeURIComponent(code)}`)
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
      <Button type="submit" disabled={!value.trim()}>
        <Search className="h-4 w-4" aria-hidden />
        Vérifier
      </Button>
    </form>
  )
}
