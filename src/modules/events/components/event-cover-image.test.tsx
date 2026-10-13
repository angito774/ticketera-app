import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EventCoverImage } from "./event-cover-image"

const SRC = "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800&q=80"

function renderCover(src = SRC) {
  return render(
    <div className="relative">
      <EventCoverImage src={src} sizes="100vw" />
    </div>
  )
}

describe("EventCoverImage", () => {
  it("renders the cover as a decorative image", () => {
    const { container } = renderCover()

    const image = container.querySelector("img")
    expect(image).not.toBeNull()
    expect(image).toHaveAttribute("alt", "")
  })

  it("replaces a failed image with a neutral placeholder", () => {
    const { container } = renderCover()

    fireEvent.error(container.querySelector("img")!)

    expect(container.querySelector("img")).toBeNull()
    const placeholder = container.querySelector("[aria-hidden='true']")
    expect(placeholder).toHaveClass("bg-muted")
    expect(placeholder?.querySelector("svg")).not.toBeNull()
  })

  it("tries the image again when the source changes", () => {
    const { container, rerender } = renderCover()
    fireEvent.error(container.querySelector("img")!)
    expect(container.querySelector("img")).toBeNull()

    rerender(
      <div className="relative">
        <EventCoverImage src={`${SRC}&v=2`} sizes="100vw" />
      </div>
    )

    expect(container.querySelector("img")).not.toBeNull()
  })
})
