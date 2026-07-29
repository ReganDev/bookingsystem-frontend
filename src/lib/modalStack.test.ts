import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useModalStack } from './modalStack'

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

afterEach(() => {
  document.body.style.overflow = ''
})

describe('useModalStack', () => {
  it('closes an open modal on Escape', () => {
    const onClose = vi.fn()
    renderHook(() => useModalStack(true, onClose))

    pressEscape()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does nothing while the modal is closed', () => {
    const onClose = vi.fn()
    renderHook(() => useModalStack(false, onClose))

    pressEscape()

    expect(onClose).not.toHaveBeenCalled()
  })

  it('Escape closes only the topmost of two stacked modals', () => {
    const closeOuter = vi.fn()
    const closeInner = vi.fn()
    renderHook(() => useModalStack(true, closeOuter))
    renderHook(() => useModalStack(true, closeInner))

    pressEscape()

    expect(closeInner).toHaveBeenCalledTimes(1)
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('after the top modal closes, Escape reaches the one underneath', () => {
    const closeOuter = vi.fn()
    const closeInner = vi.fn()
    renderHook(() => useModalStack(true, closeOuter))
    const inner = renderHook(
      ({ open }: { open: boolean }) => useModalStack(open, closeInner),
      { initialProps: { open: true } },
    )

    inner.rerender({ open: false })
    pressEscape()

    expect(closeInner).not.toHaveBeenCalled()
    expect(closeOuter).toHaveBeenCalledTimes(1)
  })

  it('locks body scroll while any modal is open, then restores the previous value', () => {
    document.body.style.overflow = 'scroll'
    const outer = renderHook(
      ({ open }: { open: boolean }) => useModalStack(open, () => {}),
      { initialProps: { open: true } },
    )
    expect(document.body.style.overflow).toBe('hidden')

    const inner = renderHook(
      ({ open }: { open: boolean }) => useModalStack(open, () => {}),
      { initialProps: { open: true } },
    )
    expect(document.body.style.overflow).toBe('hidden')

    inner.rerender({ open: false })
    expect(document.body.style.overflow).toBe('hidden')

    outer.rerender({ open: false })
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('a changed onClose callback is used without re-registering the modal', () => {
    const stale = vi.fn()
    const fresh = vi.fn()
    const closeInner = vi.fn()
    const outer = renderHook(
      ({ onClose }: { onClose: () => void }) => useModalStack(true, onClose),
      { initialProps: { onClose: stale } },
    )
    const inner = renderHook(() => useModalStack(true, closeInner))

    // A parent re-render swapping the callback must not push the outer
    // modal back on top of the stack.
    outer.rerender({ onClose: fresh })
    pressEscape()

    expect(closeInner).toHaveBeenCalledTimes(1)
    expect(stale).not.toHaveBeenCalled()
    expect(fresh).not.toHaveBeenCalled()

    inner.unmount()
    pressEscape()
    expect(fresh).toHaveBeenCalledTimes(1)
    expect(stale).not.toHaveBeenCalled()
  })
})
