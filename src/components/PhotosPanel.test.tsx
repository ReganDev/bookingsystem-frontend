import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as businessesApi from '../api/businesses'
import type { Business } from '../types/api'
import { PhotosPanel } from './PhotosPanel'

vi.mock('../api/businesses')

const business: Business = {
  id: 'business-1',
  name: 'Test Salon',
  slug: 'test-salon',
  email: 'owner@example.com',
  photoUrls: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({
      width: 4032,
      height: 3024,
      close: vi.fn(),
    }),
  )
  vi.mocked(businessesApi.getBusiness).mockResolvedValue(business)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PhotosPanel', () => {
  it('uploads selected image files and displays the returned photo', async () => {
    const uploaded = {
      ...business,
      photoUrls: ['https://project.supabase.co/storage/photo.jpg'],
    }
    vi.mocked(businessesApi.uploadBusinessPhotos).mockResolvedValue(uploaded)
    const user = userEvent.setup()

    const { container } = render(
      <PhotosPanel businessId="business-1" token="token" />,
    )
    const input = await screen.findByLabelText('Choose business photos')
    const file = new File(['image bytes'], 'salon.jpg', {
      type: 'image/jpeg',
    })

    await user.upload(input, file)

    await waitFor(() =>
      expect(businessesApi.uploadBusinessPhotos).toHaveBeenCalledWith(
        'business-1',
        [file],
        'token',
      ),
    )
    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        uploaded.photoUrls[0],
      ),
    )
    expect(
      screen.getByText('Your photos are now live on your booking page.'),
    ).toBeInTheDocument()
  })

  it('rejects oversized files before calling the API', async () => {
    const user = userEvent.setup()
    render(<PhotosPanel businessId="business-1" token="token" />)
    const input = await screen.findByLabelText('Choose business photos')

    await user.upload(
      input,
      new File([new Uint8Array(12 * 1024 * 1024 + 1)], 'large.jpg', {
        type: 'image/jpeg',
      }),
    )

    expect(
      await screen.findByText('“large.jpg” is larger than 12 MB.'),
    ).toBeInTheDocument()
    expect(businessesApi.uploadBusinessPhotos).not.toHaveBeenCalled()
  })

  it('rejects photos above the original-resolution limit', async () => {
    vi.mocked(createImageBitmap).mockResolvedValueOnce({
      width: 4033,
      height: 3024,
      close: vi.fn(),
    } as unknown as ImageBitmap)
    const user = userEvent.setup()
    render(<PhotosPanel businessId="business-1" token="token" />)
    const input = await screen.findByLabelText('Choose business photos')

    await user.upload(
      input,
      new File(['image bytes'], 'too-wide.jpg', { type: 'image/jpeg' }),
    )

    expect(
      await screen.findByText(/“too-wide.jpg” is 4033×3024px/),
    ).toBeInTheDocument()
    expect(businessesApi.uploadBusinessPhotos).not.toHaveBeenCalled()
  })
})
