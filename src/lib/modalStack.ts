import { useEffect, useRef } from 'react'

// One shared stack for every open modal in the app, so stacked dialogs
// (e.g. the date-time picker inside the new-booking modal) behave sanely:
// Escape closes only the topmost layer, and the body scroll lock survives
// until the last layer closes, restoring whatever overflow was set before.
const stack: symbol[] = []
let previousBodyOverflow = ''

/**
 * Registers an open modal on the shared stack. While registered, Escape
 * calls `onClose` only when this modal is the topmost one, and body scroll
 * stays locked. Pass the modal's `open` state; everything is cleaned up
 * when it flips to false or the component unmounts.
 */
export function useModalStack(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    const id = Symbol('modal')
    if (stack.length === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    stack.push(id)

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && stack[stack.length - 1] === id) {
        onCloseRef.current()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const index = stack.indexOf(id)
      if (index !== -1) stack.splice(index, 1)
      if (stack.length === 0) {
        document.body.style.overflow = previousBodyOverflow
      }
    }
  }, [open])
}
