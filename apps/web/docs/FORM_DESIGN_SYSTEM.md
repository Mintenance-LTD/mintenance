# Form Design System Guide

## Overview

This guide ensures all forms across the Mintenance application follow the new dark navy sidebar design system with consistent styling, validation, and user experience.

## Design Tokens

### Colors
- **Input Border**: `#e5e7eb` (gray-200)
- **Input Border (Focus)**: `#14b8a6` (teal-500)
- **Input Border (Error)**: `#ef4444` (red-500)
- **Label Text**: `#374151` (gray-700)
- **Error Text**: `#ef4444` (red-500)
- **Placeholder Text**: `#9ca3af` (gray-400)

### Button Styles
- **Primary CTA**: `bg-teal-500 hover:bg-teal-600` with white text
- **Secondary**: `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`
- **Danger**: `bg-red-500 hover:bg-red-600` with white text

### Spacing
- **Field Spacing**: `space-y-4` (16px between fields)
- **Input Padding**: `px-4 py-3` (16px horizontal, 12px vertical)
- **Button Padding**: `px-6 py-3.5`
- **Form Container**: `p-6` or `p-8` for larger forms

### Border Radius
- **Inputs**: `rounded-lg` (8px)
- **Buttons**: `rounded-lg` (8px)
- **Containers**: `rounded-xl` (12px)

## Standard Form Structure

\`\`\`tsx
<form onSubmit={handleSubmit} className="space-y-4">
  {/* Field Group */}
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Field Label
    </label>
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder="Placeholder text"
      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 \${
        error ? 'border-red-500' : 'border-gray-200'
      }`}
    />
    {error && (
      <p className="mt-1 text-sm text-red-500">{error}</p>
    )}
  </div>

  {/* Submit Button */}
  <button
    type="submit"
    disabled={isSubmitting}
    className="w-full px-6 py-3.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isSubmitting ? 'Submitting...' : 'Submit'}
  </button>
</form>
\`\`\`

## Input Types

### Text Input
\`\`\`tsx
<input
  type="text"
  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
  placeholder="Enter text"
/>
\`\`\`

### Email Input
\`\`\`tsx
<input
  type="email"
  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
  placeholder="email@example.com"
/>
\`\`\`

### Password Input
\`\`\`tsx
<div className="relative">
  <input
    type={showPassword ? 'text' : 'password'}
    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
  >
    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} />
  </button>
</div>
\`\`\`

### Select Dropdown
\`\`\`tsx
<select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
  <option value="">Select option</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
\`\`\`

### Textarea
\`\`\`tsx
<textarea
  rows={4}
  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
  placeholder="Enter description"
/>
\`\`\`

### Checkbox
\`\`\`tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    className="w-4 h-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
  />
  <span className="text-sm text-gray-700">I agree to terms</span>
</label>
\`\`\`

## Validation

### Error Display
\`\`\`tsx
{errors.fieldName && (
  <p className="mt-1 text-sm text-red-500">{errors.fieldName}</p>
)}
\`\`\`

### Success Message
\`\`\`tsx
<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
  <p className="text-sm text-green-700">Success message here</p>
</div>
\`\`\`

### Warning Message
\`\`\`tsx
<div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
  <p className="text-sm text-amber-700">Warning message here</p>
</div>
\`\`\`

## Button Patterns

### Primary Action
\`\`\`tsx
<button
  type="submit"
  className="px-6 py-3.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors"
>
  Submit
</button>
\`\`\`

### Secondary Action
\`\`\`tsx
<button
  type="button"
  className="px-6 py-3.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
>
  Cancel
</button>
\`\`\`

### Danger Action
\`\`\`tsx
<button
  type="button"
  className="px-6 py-3.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
>
  Delete
</button>
\`\`\`

### Button Group
\`\`\`tsx
<div className="flex gap-3">
  <button className="flex-1 px-6 py-3.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">
    Cancel
  </button>
  <button className="flex-1 px-6 py-3.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600">
    Confirm
  </button>
</div>
\`\`\`

## Form Layouts

### Single Column (Mobile-First)
\`\`\`tsx
<form className="space-y-4">
  {/* Fields here */}
</form>
\`\`\`

### Two Column Grid
\`\`\`tsx
<form className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>{/* Field 1 */}</div>
    <div>{/* Field 2 */}</div>
  </div>
</form>
\`\`\`

### Card Container
\`\`\`tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
  <h2 className="text-xl font-semibold text-gray-900 mb-6">Form Title</h2>
  <form className="space-y-4">
    {/* Fields here */}
  </form>
</div>
\`\`\`

## Loading States

### Button Loading
\`\`\`tsx
<button
  disabled={isLoading}
  className="px-6 py-3.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? 'Loading...' : 'Submit'}
</button>
\`\`\`

### Form Loading Overlay
\`\`\`tsx
{isLoading && (
  <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">
    <LoadingSpinner />
  </div>
)}
\`\`\`

## Accessibility

- Always include `<label>` elements with `htmlFor` attributes
- Use semantic HTML (`<form>`, `<fieldset>`, `<legend>`)
- Provide clear error messages
- Use ` aria-invalid` and `aria-describedby` for validation
- Ensure keyboard navigation works
- Use sufficient color contrast

## Examples

### Login Form
See: `apps/web/app/login/page.tsx`

### Registration Form
See: `apps/web/app/register/page.tsx`

### Job Creation Form
See: `apps/web/app/jobs/create/page.tsx`

### Payment Method Form
See: `apps/web/components/modals/PaymentMethodModal.tsx` (New reference implementation)

## Migration Checklist

When updating existing forms:

- [ ] Replace old button classes with teal primary buttons
- [ ] Update input border colors to gray-200
- [ ] Add focus:ring-teal-500 to all inputs
- [ ] Ensure consistent spacing (space-y-4 for fields)
- [ ] Update error message styling
- [ ] Add proper loading states
- [ ] Test keyboard navigation
- [ ] Verify mobile responsiveness
