'use client'

import { useState, useEffect, useRef } from 'react'
import { searchSubtypes, createSubtype, type Subtype } from '@/lib/api/subtypes'
import { localCache } from '@/lib/localCache'

const TTL_24H = 24 * 60 * 60 * 1000

interface Props {
  subtypeId: string | null
  subtypeName: string | null
  onChange: (subtypeId: string | null, subtypeName: string | null) => void
}

export function SubtypeCombobox({ subtypeId: _subtypeId, subtypeName, onChange }: Props) {
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [options, setOptions]   = useState<Subtype[]>([])
  const [creating, setCreating] = useState(false)
  const debounceRef             = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (query.length < 3) {
      setOptions([])
      return
    }

    const cached = localCache.get<Subtype[]>('subtypes')
    if (cached && cached.length > 0) {
      const q = query.toLowerCase()
      setOptions(cached.filter((s) => s.name.toLowerCase().includes(q)))
      return
    }

    // cache miss — fall back to debounced server search
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const results = await searchSubtypes(query)
      setOptions(results)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const showCreate = query.length >= 3 && !options.some(
    (o) => o.name.toLowerCase() === query.toLowerCase()
  )

  async function handleCreate() {
    setCreating(true)
    try {
      const created = await createSubtype(query)
      onChange(created.id, created.name)
      // write-through to cache
      const current = localCache.get<Subtype[]>('subtypes') ?? []
      localCache.set('subtypes', [...current, created], TTL_24H)
      setQuery('')
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={creating ? '' : open ? query : (subtypeName ?? '')}
        disabled={creating}
        onFocus={() => { setOpen(true); setQuery(subtypeName ?? '') }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={creating ? '' : 'Subtype…'}
        className="border border-t-line rounded px-2 py-1 text-xs w-full"
      />
      {creating && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-t-faint">
          Saving…
        </span>
      )}
      {open && !creating && (options.length > 0 || showCreate) && (
        <ul className="absolute z-50 w-48 bg-t-card border border-t-line rounded shadow-md max-h-48 overflow-y-auto text-xs">
          {options.map((o) => (
            <li
              key={o.id}
              onMouseDown={() => { onChange(o.id, o.name); setQuery(''); setOpen(false) }}
              className="px-2 py-1.5 hover:bg-t-surface cursor-pointer"
            >
              {o.name}
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={handleCreate}
              className="px-2 py-1.5 hover:bg-t-primary-soft cursor-pointer text-t-primary border-t border-t-line"
            >
              Create: &ldquo;{query}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
