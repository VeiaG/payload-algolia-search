import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { CollectionConfig, Field } from 'payload'
import type { FieldTransformer } from 'src/types.js'

import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

export type FieldTransformers = {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in Field['type']]?: FieldTransformer<any>
}

const richTextTransformer: FieldTransformer<SerializedEditorState> = (value) =>
  value ? convertLexicalToPlaintext({ data: value }) : null

export const defaultFieldTransformers: FieldTransformers = {
  richText: richTextTransformer,

  json: (value: any) => (value ? JSON.stringify(value) : null),

  array: (value: any[]) =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === 'object' ? Object.values(item).join(' ') : String(item)))
          .join(', ')
      : null,

  relationship: (value: any) => {
    if (!value) {
      return null
    }
    // Handle populated single relationship
    if (typeof value === 'object' && value.id) {
      return value.title || value.name || value.slug || String(value.id)
    }
    // Handle populated multi-relationship
    if (Array.isArray(value)) {
      return value.map((doc) => doc.title || doc.name || doc.slug || String(doc.id)).join(', ')
    }
    return String(value)
  },

  select: (value: string | string[]) => (Array.isArray(value) ? value.join(', ') : String(value)),

  upload: (value) => value?.filename || value?.alt || value?.title || null,
}

// Utility to find a field's config within a collection, including nested fields
export const getFieldConfig = (
  collectionConfig: CollectionConfig,
  fieldPath: string,
): Field | null => {
  const pathParts = fieldPath.split('.')
  let fields: Field[] = collectionConfig.fields
  let field: Field | null = null

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i]
    field = fields.find((f) => 'name' in f && f.name === part) || null

    if (!field) {
      break
    }

    if (field.type === 'group' && i < pathParts.length - 1) {
      fields = field.fields
    } else if (field.type === 'array' && i < pathParts.length - 1) {
      fields = field.fields
    }
  }

  return field
}

// Picks and transforms fields from a document for indexing
export const transformForAlgolia = (
  doc: any,
  fieldsToIndex: string[],
  collectionConfig: CollectionConfig,
  customTransformers: Record<string, FieldTransformer>,
): Record<string, any> => {
  const result: Record<string, any> = {}
  const allTransformers = { ...defaultFieldTransformers, ...customTransformers }

  fieldsToIndex.forEach((fieldPath) => {
    const fieldConfig = getFieldConfig(collectionConfig, fieldPath)
    const fieldType = fieldConfig?.type
    let value = doc
    try {
      // Safely access nested properties
      fieldPath.split('.').forEach((part) => (value = value?.[part]))
    } catch {
      value = undefined
    }

    if (value === undefined || value === null) {
      return
    }

    // Apply transformer if available, otherwise use default string conversion
    const transformer = fieldType ? allTransformers[fieldType] : null
    const transformedValue = transformer ? transformer(value) : String(value)

    if (transformedValue !== null && transformedValue !== undefined) {
      // Use the field path as the key for Algolia
      result[fieldPath] = transformedValue
    }
  })

  return result
}
