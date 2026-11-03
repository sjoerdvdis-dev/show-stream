import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@workspace/ui/lib/utils"

/**
 * A range slider with a label on each thumb. Based on shadcn's slider, with the label and its
 * position added. It is not in the shadcn registry.
 */
function DualRangeSlider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  label,
  labelPosition = "top",
  ...props
}: SliderPrimitive.Root.Props & {
  labelPosition?: "top" | "bottom"
  label?: (value: number | undefined) => React.ReactNode
}) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full", className)}
      data-slot="dual-range-slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50">
        <SliderPrimitive.Track
          data-slot="dual-range-slider-track"
          className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="dual-range-slider-range"
            className="h-full bg-primary select-none"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="dual-range-slider-thumb"
            key={index}
            index={index}
            className="relative block size-3 shrink-0 rounded-full border border-ring bg-background ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          >
            {label && (
              <span
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 text-sm whitespace-nowrap",
                  labelPosition === "top" && "-top-7",
                  labelPosition === "bottom" && "top-4"
                )}
              >
                {label(_values[index])}
              </span>
            )}
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { DualRangeSlider }
