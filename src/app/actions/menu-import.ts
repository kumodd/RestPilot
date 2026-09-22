'use server'

import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type {
  MenuImportCategory,
  MenuImportDraft,
  MenuImportItem,
} from '@/lib/types/menu-import'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const DIETARY_TYPES = new Set(['veg', 'non_veg', 'vegan', 'gluten_free', 'dairy_free', 'jain', 'halal', 'kosher'])
const SPICE_LEVELS = new Set(['none', 'mild', 'medium', 'hot', 'extra_hot'])

const MENU_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                price: { type: 'number' },
                dietary_type: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                spice_level: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                variants: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      name: { type: 'string' },
                      is_required: { type: 'boolean' },
                      options: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            name: { type: 'string' },
                            price_delta: { type: 'number' },
                          },
                          required: ['name', 'price_delta'],
                        },
                      },
                    },
                    required: ['name', 'is_required', 'options'],
                  },
                },
                addons: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      name: { type: 'string' },
                      price: { type: 'number' },
                    },
                    required: ['name', 'price'],
                  },
                },
              },
              required: ['name', 'description', 'price', 'dietary_type', 'spice_level', 'variants', 'addons'],
            },
          },
        },
        required: ['name', 'description', 'items'],
      },
    },
  },
  required: ['categories'],
} as const

function text(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned.slice(0, maxLength) : null
}

function number(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(parsed, 1_000_000))
}

function normalizeMenuDraft(raw: unknown): MenuImportDraft {
  if (!raw || typeof raw !== 'object') throw new Error('The AI response was not a menu')
  const source = raw as { categories?: unknown }
  if (!Array.isArray(source.categories)) throw new Error('No menu categories were found')

  const categories: MenuImportCategory[] = source.categories.slice(0, 60).flatMap(categoryValue => {
    if (!categoryValue || typeof categoryValue !== 'object') return []
    const category = categoryValue as { name?: unknown; description?: unknown; items?: unknown }
    const name = text(category.name, 120)
    if (!name) return []

    const items: MenuImportItem[] = Array.isArray(category.items)
      ? category.items.slice(0, 200).flatMap(itemValue => {
        if (!itemValue || typeof itemValue !== 'object') return []
        const item = itemValue as Record<string, unknown>
        const itemName = text(item.name, 160)
        if (!itemName) return []
        const variants = Array.isArray(item.variants)
          ? item.variants.slice(0, 8).flatMap(variantValue => {
            if (!variantValue || typeof variantValue !== 'object') return []
            const variant = variantValue as Record<string, unknown>
            const variantName = text(variant.name, 100)
            if (!variantName) return []
            const options = Array.isArray(variant.options)
              ? variant.options.slice(0, 20).flatMap(optionValue => {
                if (!optionValue || typeof optionValue !== 'object') return []
                const option = optionValue as Record<string, unknown>
                const optionName = text(option.name, 100)
                return optionName ? [{ name: optionName, price_delta: number(option.price_delta) }] : []
              })
              : []
            return [{ name: variantName, is_required: Boolean(variant.is_required), options }]
          })
          : []
        const addons = Array.isArray(item.addons)
          ? item.addons.slice(0, 20).flatMap(addonValue => {
            if (!addonValue || typeof addonValue !== 'object') return []
            const addon = addonValue as Record<string, unknown>
            const addonName = text(addon.name, 120)
            return addonName ? [{ name: addonName, price: number(addon.price) }] : []
          })
          : []
        const dietary = text(item.dietary_type, 40)
        const spice = text(item.spice_level, 40)
        return [{
          name: itemName,
          description: text(item.description, 1000),
          price: number(item.price),
          dietary_type: dietary && DIETARY_TYPES.has(dietary) ? dietary : null,
          spice_level: spice && SPICE_LEVELS.has(spice) ? spice : null,
          variants,
          addons,
        }]
      })
      : []

    return [{ name, description: text(category.description, 500), items }]
  })

  if (categories.length === 0 || categories.every(category => category.items.length === 0)) {
    throw new Error('No menu items were found. Try a clearer, well-lit menu photo.')
  }
  return { categories }
}

async function requireMenuManager(restaurantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // The role and restaurant ownership are checked inside Supabase, not trusted
  // from the browser payload.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('is_restaurant_manager', {
    p_restaurant_id: restaurantId,
  })
  if (error || data !== true) throw new Error('Only restaurant owners and managers can import menus')
  return { supabase, user }
}

export async function extractMenuFromPhoto(formData: FormData) {
  const restaurantId = formData.get('restaurantId')
  const file = formData.get('file')
  if (typeof restaurantId !== 'string' || !restaurantId) throw new Error('Restaurant is required')
  if (!(file instanceof File)) throw new Error('Choose a menu photo first')
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Use a JPG, PNG, or WebP menu image')
  if (file.size > MAX_FILE_SIZE) throw new Error('Menu images must be smaller than 10 MB')
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured on the server')

  const { supabase, user } = await requireMenuManager(restaurantId)
  const fileBytes = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100) || 'menu-photo'
  const sourceFilePath = `${restaurantId}/${user.id}/${randomUUID()}-${safeName}`
  const serviceClient = await createServiceClient()
  const { error: uploadError } = await serviceClient.storage
    .from('menu-imports')
    .upload(sourceFilePath, fileBytes, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error(`Could not store the menu photo: ${uploadError.message}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: importRow, error: importError } = await (supabase.from as any)('menu_imports')
    .insert({
      restaurant_id: restaurantId,
      uploaded_by: user.id,
      source_file_path: sourceFilePath,
      source_file_name: file.name,
      mime_type: file.type,
      status: 'processing',
    })
    .select('id')
    .single()
  if (importError || !importRow) throw new Error(importError?.message ?? 'Could not create menu import')

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await openai.responses.create({
      model: process.env.OPENAI_MENU_MODEL || 'gpt-4o-mini',
      instructions: `You extract restaurant menu data from a photographed menu. Read every visible category, dish, price, variant, and add-on. Preserve the wording and currency values exactly as printed. Never invent a price. If a price is missing, use 0. Use dietary_type only when the menu explicitly indicates it; allowed values are veg, non_veg, vegan, gluten_free, dairy_free, jain, halal, kosher. Use spice_level only when explicitly indicated; allowed values are none, mild, medium, hot, extra_hot. Return only the requested JSON structure.`,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: 'Extract this restaurant menu into structured JSON for review by the restaurant manager.' },
          { type: 'input_image', image_url: `data:${file.type};base64,${fileBytes.toString('base64')}`, detail: 'high' },
        ],
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'restaurant_menu',
          strict: true,
          schema: MENU_SCHEMA,
        },
      },
    })

    if (!response.output_text) throw new Error('The AI returned no menu data')
    const draft = normalizeMenuDraft(JSON.parse(response.output_text))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from as any)('menu_imports')
      .update({
        status: 'ready',
        extracted_menu: draft,
        category_count: draft.categories.length,
        item_count: draft.categories.reduce((total, category) => total + category.items.length, 0),
        error_message: null,
      })
      .eq('id', importRow.id)
    if (updateError) throw new Error(updateError.message)
    return { importId: importRow.id as string, draft }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Menu extraction failed'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('menu_imports')
      .update({ status: 'failed', error_message: message.slice(0, 1000) })
      .eq('id', importRow.id)
    throw new Error(message)
  }
}

export async function applyMenuImport(input: {
  restaurantId: string
  importId: string
  draft: MenuImportDraft
}) {
  const { supabase } = await requireMenuManager(input.restaurantId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('apply_menu_import', {
    p_import_id: input.importId,
    p_menu: input.draft,
  })
  if (error || data?.error) throw new Error(error?.message ?? data?.error ?? 'Could not save imported menu')
  return data as { success: boolean; category_count: number; item_count: number }
}
