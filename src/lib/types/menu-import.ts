export interface MenuImportVariant {
  name: string
  is_required: boolean
  options: Array<{ name: string; price_delta: number }>
}

export interface MenuImportAddon {
  name: string
  price: number
}

export interface MenuImportItem {
  name: string
  description: string | null
  price: number
  dietary_type: string | null
  spice_level: string | null
  variants: MenuImportVariant[]
  addons: MenuImportAddon[]
}

export interface MenuImportCategory {
  name: string
  description: string | null
  items: MenuImportItem[]
}

export interface MenuImportDraft {
  categories: MenuImportCategory[]
}
