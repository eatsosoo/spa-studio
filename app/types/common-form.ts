import type { Component } from 'vue'

export type CommonFormModel = Record<string, unknown>

export type CommonFormBreakpointValue = number | {
  base?: number
  sm?: number
  md?: number
  lg?: number
}

export type CommonFormCondition = boolean | ((values: Readonly<CommonFormModel>) => boolean)
export type CommonFormValidationResult = string | boolean | null | undefined

export type CommonFormOption = {
  label: string
  value: string | number | boolean
  disabled?: boolean
  hint?: string
}

export type CommonFormMessages = Partial<{
  required: string
  min: string
  max: string
  minLength: string
  maxLength: string
  email: string
  phone: string
  pattern: string
  custom: string
}>

export type CommonFormField = {
  name: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'date' | 'datepicker' | 'custom'
  label?: string
  placeholder?: string
  hint?: string
  options?: CommonFormOption[]
  component?: Component | string
  attrs?: Record<string, unknown>
  defaultValue?: unknown | ((values: Readonly<CommonFormModel>) => unknown)
  columns?: CommonFormBreakpointValue
  showWhen?: CommonFormCondition
  hiddenWhen?: CommonFormCondition
  disabled?: CommonFormCondition
  readonly?: CommonFormCondition
  required?: CommonFormCondition
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp | string
  format?: 'email' | 'phone'
  validate?: (value: unknown, values: Readonly<CommonFormModel>) => CommonFormValidationResult
  messages?: CommonFormMessages
  rows?: number
  choiceLayout?: 'row' | 'column'
  fieldClass?: string
  inputClass?: string
}

export type CommonFormChange = {
  name: string
  value: unknown
  values: CommonFormModel
}

export type CommonFormCustomFieldBindings = {
  id: string
  name: string
  disabled: boolean
  readonly: boolean
  required: boolean
  'aria-invalid': boolean
  'aria-describedby': string
}
